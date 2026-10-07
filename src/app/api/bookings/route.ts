import { NextResponse } from 'next/server';
import { fromCents } from '@/lib/pricing';
import { decideAcceptance } from '@/lib/acceptance';
import { HoursConfig, nowInZone, toMinutes } from '@/lib/serviceHours';
import {
  adminClient,
  clientIp,
  EMAIL_RE,
  fail,
  isFail,
  parseLines,
  priceLines,
  rateLimited,
  str,
  UUID_RE,
} from '@/lib/orderServer';

/**
 * POST /api/bookings
 *
 * Crea una prenotazione della vetrina pubblica, con o senza pre-ordine.
 * Sostituisce l'INSERT anonimo diretto su `bookings`, che accettava
 * `pre_order_items` e `pre_order_total` così come arrivavano dal browser:
 * quando il ristoratore conferma la prenotazione, quei prezzi diventano un
 * ordine vero (rilievo C8 di AUDIT_REPORT.md).
 *
 * Il pre-ordine è prezzato come un ordine, dai prezzi dei piatti e delle
 * opzioni letti dal database. Nessuno sconto e nessuna consegna: il codice promo non
 * viene consumato su una prenotazione, quindi non viene nemmeno applicato.
 * Il totale salvato è quello ricalcolato, e torna al client per la conferma.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const admin = adminClient();
  if (!admin) {
    console.error('[bookings] Missing Supabase env vars');
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  const invalid = fail(400, 'bad_request', 'Dati della prenotazione non validi.');
  const reply = (f: { status: number; body: Record<string, unknown> }) =>
    NextResponse.json(f.body, { status: f.status });

  const restaurantId = body.restaurantId;
  if (typeof restaurantId !== 'string' || !UUID_RE.test(restaurantId)) return reply(invalid);

  // Limiti per connessione (M4): più bassi degli ordini, perché una
  // prenotazione occupa coperti e nessuno ne fa decine in pochi minuti.
  const ip = clientIp(request);
  const limited = await rateLimited(admin, [
    { key: `bookings:${ip}:${restaurantId}`, limit: 10, windowSeconds: 600 },
    { key: `bookings:${ip}`, limit: 30, windowSeconds: 600 },
  ]);
  if (limited) return reply(limited);

  const name = str(body.name, 120);
  const phone = str(body.phone, 40);
  const email = str(body.email, 200).toLowerCase();
  const notes = str(body.notes, 1000);
  const date = str(body.date, 10);
  const time = str(body.time, 5);
  const guests = body.guests;

  if (!name || !phone) return reply(invalid);
  if (email && !EMAIL_RE.test(email)) return reply(invalid);
  if (!Number.isInteger(guests) || (guests as number) < 1 || (guests as number) > 100) {
    return reply(invalid);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(date).getTime())) {
    return reply(invalid);
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return reply(invalid);

  // Niente prenotazioni retroattive. Si confronta con l'ora di Roma, la stessa
  // con cui la vetrina genera gli orari; 5 minuti di tolleranza assorbono il
  // tempo fra l'apertura della lista e l'invio, ma un orario di ieri o di
  // stamattina non passa.
  const nowRome = nowInZone('Europe/Rome');
  if (
    date < nowRome.date ||
    (date === nowRome.date && toMinutes(time) < nowRome.minutes - 5)
  ) {
    return reply(
      fail(
        409,
        'booking_in_past',
        'Non è possibile prenotare per un orario già passato. Scegli un altro orario.'
      )
    );
  }

  const hasPreOrder = Array.isArray(body.items) && body.items.length > 0;
  const lines = hasPreOrder ? parseLines(body.items) : [];
  if (!lines) return reply(invalid);

  const { data: restaurant, error: rErr } = await admin
    .from('restaurants')
    .select('id, status, hours_config')
    .eq('id', restaurantId)
    .maybeSingle();
  if (rErr) {
    console.error('[bookings] restaurants query error:', rErr.message);
    return reply(fail(500, 'server_error', 'Impossibile completare la prenotazione, riprova.'));
  }
  if (!restaurant || restaurant.status !== 'published') {
    return reply(fail(404, 'restaurant_not_found', 'Ristorante non disponibile.'));
  }

  let preOrderItems: Record<string, unknown>[] = [];
  let preOrderTotal = 0;
  if (lines.length > 0) {
    const priced = await priceLines(admin, restaurantId, lines);
    if (isFail(priced)) return reply(priced);
    // Stessa forma che il pannello del ristoratore legge da pre_order_items
    // per convertire la prenotazione in ordine: id, name, price, qty, note,
    // addedIngredients, removedIngredients.
    preOrderItems = priced.lines.map((p) => ({
      id: p.menu_item_id,
      name: p.name,
      price: fromCents(p.unitCents),
      qty: p.qty,
      note: p.note,
      addedIngredients: p.added_ingredients,
      removedIngredients: p.removed_ingredients,
    }));
    preOrderTotal = fromCents(priced.itemsCents);
  }

  // Controllo di capienza e inserimento nella stessa funzione, sotto un lock
  // per (ristorante, data): due richieste simultanee per la stessa fascia non
  // possono superare insieme la capienza (C9, migration 022).
  const { data: result, error } = await admin.rpc('create_booking', {
    p_restaurant_id: restaurantId,
    p_name: name,
    p_phone: phone,
    p_email: email,
    p_guests: guests as number,
    p_date: date,
    p_time: `${time}:00`,
    p_notes: notes,
    p_pre_order_items: preOrderItems,
    p_pre_order_total: preOrderTotal,
  });
  if (error || !result) {
    console.error('[bookings] create_booking error:', error?.message);
    return reply(fail(500, 'server_error', 'Impossibile completare la prenotazione, riprova.'));
  }
  if (result.ok !== true) {
    const available = Number(result.available) || 0;
    return reply(
      fail(
        409,
        'booking_full',
        available > 0
          ? `Per quest'orario restano solo ${available} posti. Riduci il numero di persone o scegli un altro orario.`
          : "Non ci sono più posti disponibili per quest'orario. Scegli un altro orario.",
        { available }
      )
    );
  }

  // Modalità di accettazione (migration 034), come per gli ordini: locale
  // aperto adesso → 3 minuti per confermare; chiuso → un'ora dopo la prossima
  // apertura. Si scrive subito dopo la creazione: la funzione create_booking
  // non conosce questi campi.
  const acceptance = decideAcceptance(restaurant.hours_config as HoursConfig | null, 'reservation');
  const { error: acceptError } = await admin
    .from('bookings')
    .update({
      acceptance_mode: acceptance.mode,
      accept_deadline: acceptance.deadline.toISOString(),
    })
    .eq('id', result.id);
  if (acceptError) {
    console.error('[bookings] scadenza non registrata:', result.id, acceptError.message);
  }

  const booking = {
    id: result.id as string,
    restaurant_id: restaurantId,
    name,
    phone,
    email: email || null,
    guests: guests as number,
    date,
    time: `${time}:00`,
    status: 'pending',
    acceptance_mode: acceptError ? null : acceptance.mode,
    accept_deadline: acceptError ? null : acceptance.deadline.toISOString(),
    notes,
    pre_order_items: preOrderItems,
    pre_order_total: preOrderTotal,
    created_at: result.created_at as string,
  };

  return NextResponse.json({ booking }, { status: 201 });
}
