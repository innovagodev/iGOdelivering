import { NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { computeDiscountCents, fromCents, OrderType, toCents } from '@/lib/pricing';
import { checkSchedule, HoursConfig, nowInZone, ScheduledOrdersConfig } from '@/lib/serviceHours';
import { getStripe } from '@/lib/stripeServer';
import {
  adminClient,
  EMAIL_RE,
  fail,
  Fail,
  clientIp,
  isFail,
  parseLines,
  rateLimited,
  priceLines,
  str,
  UUID_RE,
} from '@/lib/orderServer';

/**
 * POST /api/orders
 *
 * Crea un ordine della vetrina pubblica. Sostituisce l'INSERT diretto su
 * `orders` e `order_items` fatto dal browser con la chiave anon, che scriveva
 * subtotale, sconto, consegna, totale e prezzo di ogni articolo così come li
 * aveva calcolati il client: chiunque poteva registrare un ordine da 1 €, o
 * crearlo già in stato `preparing` nel pannello di un altro ristorante
 * (rilievo C8 di AUDIT_REPORT.md).
 *
 * Qui il client indica solo COSA ordina — id del piatto, quantità, nomi delle
 * aggiunte — e ogni importo è ricalcolato da:
 *   · menu_items.price           prezzo base, solo piatti disponibili del locale
 *   · menu_items.option_groups   prezzi delle opzioni configurate dal ristoratore
 *   · src/lib/pricing.ts         regole dello sconto
 *   · delivery_zones             consegna, soglia di gratuità, ordine minimo
 *   · promos                     validità del codice, riverificata per intero
 *
 * `expectedTotal` è il totale che il cliente ha visto. Se non coincide con il
 * ricalcolo l'ordine NON viene creato (409 `price_changed`): addebitare una
 * cifra diversa da quella mostrata non è accettabile nemmeno per eccesso.
 *
 * Numero d'ordine, stato iniziale ('new') e restaurant_id non sono mai presi
 * dal client.
 */

const ORDER_TYPES: OrderType[] = ['domicilio', 'asporto', 'tavolo'];

// Limiti per connessione (M4). Per IP *e* ristorante, perché i clienti al
// tavolo usano spesso il Wi-Fi del locale e condividono lo stesso IP: un limite
// per solo IP bloccherebbe una sala piena. Il tetto globale ferma chi colpisce
// molti ristoranti dalla stessa connessione.
const WINDOW_SECONDS = 600;
const LIMIT_PER_RESTAURANT = 30;
const LIMIT_GLOBAL = 100;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const admin = adminClient();
  if (!admin) {
    console.error('[orders] Missing Supabase env vars');
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  const result = await createOrder(admin, body, clientIp(request));
  if (isFail(result)) return NextResponse.json(result.body, { status: result.status });
  return NextResponse.json(result, { status: 201 });
}

async function createOrder(admin: SupabaseClient, body: Record<string, unknown>, ip: string) {
  const invalid = fail(400, 'bad_request', 'Dati dell’ordine non validi.');

  // ─── Input ────────────────────────────────────────────────────────────────
  const restaurantId = body.restaurantId;
  const type = body.type as OrderType;
  if (typeof restaurantId !== 'string' || !UUID_RE.test(restaurantId)) return invalid;
  if (!ORDER_TYPES.includes(type)) return invalid;

  const limited = await rateLimited(admin, [
    {
      key: `orders:${ip}:${restaurantId}`,
      limit: LIMIT_PER_RESTAURANT,
      windowSeconds: WINDOW_SECONDS,
    },
    { key: `orders:${ip}`, limit: LIMIT_GLOBAL, windowSeconds: WINDOW_SECONDS },
  ]);
  if (limited) return limited;

  const lines = parseLines(body.items);
  if (!lines) return invalid;

  const expectedTotal = Number(body.expectedTotal);
  if (!Number.isFinite(expectedTotal)) return invalid;

  const name = str(body.name, 120);
  const email = str(body.email, 200).toLowerCase();
  const phone = str(body.phone, 40);
  const address = str(body.address, 300);
  const cap = str(body.cap, 10);
  const tableNumber = str(body.tableNumber, 20);
  const notes = str(body.notes, 1000);
  const promoCode = str(body.promoCode, 50).toUpperCase();
  const guests = Number.isInteger(body.guests) ? (body.guests as number) : null;
  const paymentMethod =
    body.paymentMethod === 'online' || body.paymentMethod === 'pos' ? body.paymentMethod : 'cash';
  const isOnline = paymentMethod === 'online';
  // Al tavolo niente pagamento online (decisione di prodotto, vincolo anche
  // nel database: orders_no_online_table).
  if (isOnline && type === 'tavolo') return invalid;

  if (!name) return invalid;
  if (type === 'tavolo') {
    if (!tableNumber) return invalid;
  } else {
    if (!phone || !EMAIL_RE.test(email)) return invalid;
  }
  if (type === 'domicilio' && (!address || !/^\d{5}$/.test(cap))) return invalid;
  if (guests !== null && (guests < 1 || guests > 100)) return invalid;

  let scheduledAt: string | null = null;
  if (type !== 'tavolo' && typeof body.scheduledAt === 'string' && body.scheduledAt) {
    const d = new Date(body.scheduledAt);
    if (Number.isNaN(d.getTime())) return invalid;
    scheduledAt = d.toISOString();
  }

  // ─── Ristorante ───────────────────────────────────────────────────────────
  const { data: restaurant, error: rErr } = await admin
    .from('restaurants')
    .select(
      'id, status, hours_config, scheduled_orders, stripe_account_id, stripe_connected, stripe_enabled, stripe_delivery, stripe_pickup'
    )
    .eq('id', restaurantId)
    .maybeSingle();

  if (rErr) {
    console.error('[orders] restaurants query error:', rErr.message);
    return fail(500, 'server_error', 'Impossibile completare l’ordine, riprova.');
  }
  if (!restaurant || restaurant.status !== 'published') {
    return fail(404, 'restaurant_not_found', 'Ristorante non disponibile.');
  }
  // I flag delivery_enabled / pickup_enabled / table_enabled non si
  // controllano: sono vestigiali (AUDIT_REPORT.md, N16). Il controllo reale è
  // hours_config, qui sotto.

  // ─── Orari e sospensioni (N16) ────────────────────────────────────────────
  // Stesse regole con cui la vetrina genera gli orari selezionabili
  // (src/lib/serviceHours.ts), valutate sull'ora di Roma. Gli ordini al
  // tavolo sono esclusi: il cliente è già nel locale.
  if (type !== 'tavolo') {
    const service = type === 'domicilio' ? 'delivery' : 'pickup';
    const check = checkSchedule(
      restaurant.hours_config as HoursConfig | null,
      restaurant.scheduled_orders as ScheduledOrdersConfig | null,
      service,
      scheduledAt ? nowInZone('Europe/Rome', new Date(scheduledAt)) : null,
      nowInZone('Europe/Rome')
    );
    if (!check.ok) {
      const label = service === 'delivery' ? 'consegna a domicilio' : 'asporto';
      const message =
        check.reason === 'closed_holiday'
          ? 'Il locale è chiuso in questo periodo e non accetta ordini.'
          : check.reason === 'suspended'
            ? `Il servizio di ${label} è sospeso in questo momento.`
            : check.reason === 'missing_time'
              ? 'Scegli un orario di consegna o ritiro.'
              : 'L’orario scelto non è più disponibile. Scegline un altro.';
      return fail(409, 'schedule_unavailable', message, { reason: check.reason });
    }
  }

  // ─── Pagamento online disponibile? ────────────────────────────────────────
  // Lo stato del collegamento (stripe_connected, stripe_account_id) lo scrive
  // solo il server leggendolo da Stripe; le scelte per servizio le fa il
  // titolare dal suo pannello.
  if (isOnline) {
    const serviceAllowed =
      type === 'domicilio'
        ? restaurant.stripe_delivery !== false
        : restaurant.stripe_pickup !== false;
    if (
      !restaurant.stripe_connected ||
      !restaurant.stripe_account_id ||
      !restaurant.stripe_enabled ||
      !serviceAllowed
    ) {
      return fail(
        409,
        'online_unavailable',
        'Il pagamento online non è disponibile per questo ristorante. Scegli un altro metodo.'
      );
    }
  }

  // ─── Articoli ─────────────────────────────────────────────────────────────
  const pricedResult = await priceLines(admin, restaurantId, lines);
  if (isFail(pricedResult)) return pricedResult;
  const { lines: priced, itemsCents } = pricedResult;

  // ─── Consegna ─────────────────────────────────────────────────────────────
  // Stessa regola della vetrina: prima zona attiva (per raggio crescente) il
  // cui elenco CAP contiene quello indicato. Nessuna zona, nessuna consegna.
  let deliveryCents = 0;
  if (type === 'domicilio') {
    const { data: zones, error: zErr } = await admin
      .from('delivery_zones')
      .select('enabled, caps, min_order, delivery_fee, free_delivery_threshold, radius_km')
      .eq('restaurant_id', restaurantId)
      .order('radius_km', { ascending: true });

    if (zErr) {
      console.error('[orders] delivery_zones query error:', zErr.message);
      return fail(500, 'server_error', 'Impossibile completare l’ordine, riprova.');
    }

    const zone = (zones || []).find(
      (z) =>
        z.enabled &&
        typeof z.caps === 'string' &&
        z.caps
          .split(',')
          .map((c: string) => c.trim())
          .includes(cap)
    );
    if (!zone) {
      return fail(409, 'zone_unavailable', 'Il CAP indicato non è servito dalla consegna.');
    }
    if (itemsCents < toCents(Number(zone.min_order) || 0)) {
      return fail(409, 'below_min_order', 'L’ordine non raggiunge il minimo per la consegna.');
    }
    const threshold = toCents(Number(zone.free_delivery_threshold) || 0);
    deliveryCents =
      threshold > 0 && itemsCents >= threshold ? 0 : toCents(Number(zone.delivery_fee) || 0);
  }

  // ─── Promo ────────────────────────────────────────────────────────────────
  let promo: { id: string; code: string; type: string; value: number } | null = null;
  if (promoCode) {
    const promoResult = await validatePromo(admin, restaurantId, promoCode, {
      type,
      itemsCents,
      email,
    });
    if (isFail(promoResult)) return promoResult;
    promo = promoResult;
  }

  const discountCents = computeDiscountCents(promo, itemsCents, deliveryCents);
  const totalCents = Math.max(0, itemsCents - discountCents + deliveryCents);

  const totals = {
    subtotal: fromCents(itemsCents),
    deliveryFee: fromCents(deliveryCents),
    discount: fromCents(discountCents),
    total: fromCents(totalCents),
  };

  if (Math.abs(toCents(expectedTotal) - totalCents) > 1) {
    return fail(
      409,
      'price_changed',
      `Il totale è cambiato: ora è € ${totals.total.toFixed(2)}. Ricarica il menu per vedere i prezzi aggiornati.`,
      { totals }
    );
  }

  // Importo minimo di Stripe per un pagamento in euro.
  if (isOnline && totalCents < 50) {
    return fail(
      409,
      'online_minimum',
      'Il pagamento online richiede un totale di almeno € 0,50. Scegli un altro metodo.'
    );
  }

  const stripe = isOnline ? getStripe() : null;
  if (isOnline && !stripe) {
    console.error('[orders] STRIPE_SECRET_KEY mancante');
    return fail(503, 'online_unavailable', 'Il pagamento online non è disponibile al momento.');
  }

  // ─── Scritture ────────────────────────────────────────────────────────────
  // Ordine delle operazioni: numero → consumo promo → ordine → righe. Il
  // consumo va prima dell'ordine perché un ordine creato con lo sconto e poi
  // rimosso comparirebbe per un istante nel pannello del ristoratore, con
  // tanto di notifica sonora; se è l'ordine a fallire dopo, l'utilizzo viene
  // restituito (chiude l'effetto residuo di A8).
  const { data: orderNumber, error: numberError } = await admin.rpc('generate_order_number', {
    p_restaurant_id: restaurantId,
    p_order_type: type,
    ...(type === 'tavolo' ? { p_table_number: tableNumber } : {}),
  });
  if (numberError || !orderNumber) {
    console.error('[orders] generate_order_number error:', numberError?.message);
    return fail(500, 'server_error', 'Impossibile creare l’ordine, riprova.');
  }

  if (promo) {
    const { data: consumed, error: usageError } = await admin.rpc('increment_promo_usage', {
      p_promo_id: promo.id,
    });
    if (usageError || consumed !== true) {
      if (usageError) console.error('[orders] increment_promo_usage error:', usageError.message);
      return fail(
        409,
        'promo_unavailable',
        usageError
          ? 'Non è stato possibile applicare il codice sconto. Controlla il riepilogo e riprova.'
          : 'Il codice sconto ha appena raggiunto il limite massimo di utilizzi. Controlla il nuovo totale e conferma di nuovo.'
      );
    }
  }

  // Restituzione atomica dell'utilizzo (migration 028).
  const releasePromo = async () => {
    if (!promo) return;
    const { error } = await admin.rpc('release_promo_usage', { p_promo_id: promo.id });
    if (error) console.error('[orders] promo release failed:', promo.id, error.message);
  };

  const orderId = crypto.randomUUID();
  const orderRow = {
    id: orderId,
    restaurant_id: restaurantId,
    order_number: orderNumber as string,
    type,
    // Un ordine online nasce fuori dalla cucina: ci entra (status 'new')
    // solo quando il webhook di Stripe conferma il pagamento.
    status: isOnline ? 'awaiting_payment' : 'new',
    payment_method: paymentMethod,
    payment_status: isOnline ? 'pending' : 'unpaid',
    stripe_account_id: isOnline ? (restaurant.stripe_account_id as string) : null,
    payment_expires_at: isOnline ? new Date(Date.now() + 30 * 60_000).toISOString() : null,
    customer_name: type === 'tavolo' ? `${name} (Tavolo ${tableNumber})` : name,
    customer_email: type === 'tavolo' ? 'tavolo@internal.it' : email,
    customer_phone: type === 'tavolo' ? null : phone,
    customer_address: type === 'domicilio' ? `${address} (CAP: ${cap})` : null,
    table_number: type === 'tavolo' ? tableNumber : null,
    guests: type === 'tavolo' ? guests : null,
    subtotal: totals.subtotal,
    delivery_fee: totals.deliveryFee,
    discount: totals.discount,
    total: totals.total,
    promo_code: promo ? promo.code : null,
    promo_applied: !!promo,
    scheduled_at: scheduledAt,
    notes,
  };

  const { data: created, error: orderError } = await admin
    .from('orders')
    .insert(orderRow)
    .select('created_at')
    .single();
  if (orderError) {
    console.error('[orders] insert order error:', orderError.message);
    await releasePromo();
    return fail(500, 'server_error', 'Impossibile creare l’ordine, riprova.');
  }

  const itemRows = priced.map((p) => ({
    order_id: orderId,
    menu_item_id: p.menu_item_id,
    name: p.name,
    price: fromCents(p.unitCents),
    qty: p.qty,
    note: p.note,
    added_ingredients: p.added_ingredients,
    removed_ingredients: p.removed_ingredients,
    selected_options: [],
  }));

  const { error: itemsError } = await admin.from('order_items').insert(itemRows);
  if (itemsError) {
    // Un ordine senza righe è inservibile per la cucina: meglio annullarlo
    // del tutto e far ripetere il checkout.
    console.error('[orders] insert items error:', itemsError.message);
    const { error: delError } = await admin.from('orders').delete().eq('id', orderId);
    if (delError) console.error('[orders] rollback failed for order', orderId, delError.message);
    await releasePromo();
    return fail(500, 'server_error', 'Impossibile creare l’ordine, riprova.');
  }

  // ─── Pagamento online ─────────────────────────────────────────────────────
  // PaymentIntent creato direttamente sull'account Stripe del ristorante
  // (direct charge): l'incasso va a lui, nessuna commissione per la
  // piattaforma. Importo: il totale calcolato qui, mai quello del client.
  let payment: { clientSecret: string; stripeAccount: string; amount: number } | null = null;
  if (isOnline && stripe) {
    const accountId = restaurant.stripe_account_id as string;
    try {
      const intent = await stripe.paymentIntents.create(
        {
          amount: totalCents,
          currency: 'eur',
          automatic_payment_methods: { enabled: true },
          description: `Ordine ${orderNumber}`,
          receipt_email: email || undefined,
          metadata: {
            order_id: orderId,
            order_number: String(orderNumber),
            restaurant_id: restaurantId,
          },
        },
        { stripeAccount: accountId, idempotencyKey: `igo-order-${orderId}` }
      );
      const { error: piError } = await admin
        .from('orders')
        .update({ stripe_payment_intent_id: intent.id })
        .eq('id', orderId);
      if (piError) throw new Error(`salvataggio PaymentIntent: ${piError.message}`);
      payment = {
        clientSecret: intent.client_secret as string,
        stripeAccount: accountId,
        amount: totalCents,
      };
    } catch (e: any) {
      console.error('[orders] creazione pagamento fallita:', orderId, e?.message);
      await admin.from('order_items').delete().eq('order_id', orderId);
      const { error: delError } = await admin.from('orders').delete().eq('id', orderId);
      if (delError) console.error('[orders] rollback failed for order', orderId, delError.message);
      await releasePromo();
      return fail(
        502,
        'payment_unavailable',
        'Non è stato possibile avviare il pagamento online. Riprova o scegli un altro metodo.'
      );
    }
  }

  return {
    order: {
      ...orderRow,
      created_at: created.created_at,
    },
    items: itemRows,
    payment,
  };
}

async function validatePromo(
  admin: SupabaseClient,
  restaurantId: string,
  code: string,
  ctx: { type: OrderType; itemsCents: number; email: string }
): Promise<{ id: string; code: string; type: string; value: number } | Fail> {
  const unavailable = (message: string) => fail(409, 'promo_unavailable', message);

  const { data: promo, error } = await admin
    .from('promos')
    .select(
      'id, code, type, value, active, start_date, end_date, max_uses, used_count, min_order_subtotal, applicable_delivery_modes'
    )
    .eq('restaurant_id', restaurantId)
    .eq('code', code)
    .maybeSingle();

  if (error) {
    console.error('[orders] promos query error:', error.message);
    return unavailable('Non è stato possibile verificare il codice sconto. Riprova.');
  }
  if (!promo || !promo.active) return unavailable('Il codice sconto non è più valido.');

  // Stesso confronto di usePromoCode: data UTC come stringa YYYY-MM-DD.
  const today = new Date().toISOString().split('T')[0];
  if (promo.start_date && today < promo.start_date) {
    return unavailable('Questa promozione non è ancora attiva.');
  }
  if (promo.end_date && today > promo.end_date) {
    return unavailable('Questa promozione è scaduta.');
  }

  const modes: string[] = promo.applicable_delivery_modes || [];
  if (modes.length > 0 && !modes.includes(ctx.type)) {
    return unavailable('Il codice sconto non è valido per questa modalità di ordine.');
  }
  if (promo.type === 'free_delivery' && ctx.type !== 'domicilio') {
    return unavailable('Il codice di consegna gratuita vale solo per gli ordini a domicilio.');
  }

  const minOrder = toCents(Number(promo.min_order_subtotal) || 0);
  if (minOrder > 0 && ctx.itemsCents < minOrder) {
    return unavailable('L’ordine non raggiunge il minimo richiesto dal codice sconto.');
  }

  if (promo.type === 'first_order') {
    if (!ctx.email) return unavailable('Serve un indirizzo email per questo codice sconto.');
    const { data: previous, error: countError } = await admin.rpc('count_customer_orders', {
      p_restaurant_id: restaurantId,
      p_customer_email: ctx.email,
    });
    // Fail closed, come in usePromoCode: senza un conteggio attendibile lo
    // sconto non si concede.
    if (countError || typeof previous !== 'number') {
      console.error('[orders] count_customer_orders error:', countError?.message ?? previous);
      return unavailable('Non è stato possibile verificare il codice sconto. Riprova.');
    }
    if (previous > 0) return unavailable('Codice riservato solo al primo ordine.');
  }

  // Il limite di utilizzi non si controlla qui: lo fa increment_promo_usage,
  // nello stesso UPDATE che consuma, ed è l'unico controllo che regge alla
  // concorrenza.
  return { id: promo.id, code: promo.code, type: promo.type, value: Number(promo.value) };
}
