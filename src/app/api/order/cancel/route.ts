import { NextResponse } from 'next/server';
import { getAuthContext, getStripe } from '@/lib/stripeServer';
import { UUID_RE } from '@/lib/orderServer';
import { cancelAuthorization } from '@/lib/orderPayments';

/**
 * POST /api/order/cancel   { orderId }
 *
 * Annulla un ordine dal pannello. Se l'ordine ha il pagamento solo
 * autorizzato, annulla l'autorizzazione (nessun addebito). Se è stato già
 * incassato online, prima rimborsa il cliente sul conto Stripe del ristorante
 * (rilievo A10, piano pagamenti fase 7): un ordine pagato non può essere
 * annullato dal browser senza rimborso, lo impedisce anche il database
 * (migration 030).
 *
 * Titolare: solo ordini del proprio ristorante. Admin: qualunque ordine.
 *
 * Il rimborso è totale. L'esito definitivo arriva dal webhook
 * (charge.refunded), che aggiorna refunded_amount; qui si registra subito
 * l'annullamento perché il ristoratore veda l'ordine uscire dalla cucina.
 */
export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 });
  }
  const orderId = body.orderId;
  if (typeof orderId !== 'string' || !UUID_RE.test(orderId)) {
    return NextResponse.json({ error: 'Ordine non valido' }, { status: 400 });
  }

  const { data: order, error } = await ctx.admin
    .from('orders')
    .select(
      'id, status, restaurant_id, promo_code, payment_method, payment_status, paid_amount, stripe_payment_intent_id, stripe_account_id, restaurants ( owner_id )'
    )
    .eq('id', orderId)
    .maybeSingle();
  if (error) {
    console.error('[order/cancel] lettura ordine fallita:', orderId, error.message);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
  const rawRestaurant = (order as any)?.restaurants;
  const ownerId = (Array.isArray(rawRestaurant) ? rawRestaurant[0] : rawRestaurant)?.owner_id;
  if (!order || (ctx.role === 'ristoratore' && ownerId !== ctx.userId)) {
    return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });
  }

  if (order.status === 'cancelled') {
    return NextResponse.json({
      ok: true,
      alreadyCancelled: true,
      refunded: order.payment_status === 'refunded',
    });
  }
  if (order.status === 'delivered') {
    return NextResponse.json(
      { error: 'Un ordine consegnato non può essere annullato' },
      { status: 409 }
    );
  }

  const isPaid = order.payment_status === 'paid' || order.payment_status === 'partially_refunded';
  let refunded = false;
  let voided = false;

  // Pagamento solo autorizzato: si annulla l'autorizzazione, il cliente non è
  // mai stato addebitato e non c'è nulla da rimborsare.
  if (order.payment_status === 'authorized') {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Configurazione server mancante' }, { status: 500 });
    }
    const outcome = await cancelAuthorization(stripe, order as any, 'requested_by_customer');
    if (outcome === 'captured') {
      return NextResponse.json(
        { error: 'Il pagamento è stato appena incassato: riprova per annullare con rimborso.' },
        { status: 409 }
      );
    }
    if (outcome === 'error') {
      return NextResponse.json(
        { error: 'Non è stato possibile annullare l’autorizzazione: l’ordine non è stato rifiutato. Riprova.' },
        { status: 502 }
      );
    }
    voided = true;
  }

  if (isPaid) {
    const stripe = getStripe();
    if (!stripe || !order.stripe_payment_intent_id || !order.stripe_account_id) {
      console.error('[order/cancel] rimborso impossibile, dati mancanti:', orderId);
      return NextResponse.json(
        { error: 'Impossibile rimborsare il pagamento online: contatta l’assistenza.' },
        { status: 500 }
      );
    }
    try {
      await stripe.refunds.create(
        { payment_intent: order.stripe_payment_intent_id, reason: 'requested_by_customer' },
        { stripeAccount: order.stripe_account_id, idempotencyKey: `igo-refund-${order.id}` }
      );
      refunded = true;
    } catch (e: any) {
      // Già rimborsato (per esempio dal dashboard Stripe): si procede.
      if (e?.code === 'charge_already_refunded') {
        refunded = true;
      } else {
        console.error('[order/cancel] rimborso fallito:', orderId, e?.message);
        return NextResponse.json(
          { error: 'Il rimborso non è riuscito: l’ordine non è stato annullato. Riprova.' },
          { status: 502 }
        );
      }
    }
  }

  const update: Record<string, unknown> = { status: 'cancelled' };
  if (voided) {
    update.payment_status = 'voided';
  } else if (refunded) {
    update.payment_status = 'refunded';
    update.refunded_amount = order.paid_amount;
  } else if (order.status === 'awaiting_payment') {
    // Mai pagato: nessun incasso da restituire.
    update.payment_status = 'failed';
  }

  const { error: updError } = await ctx.admin.from('orders').update(update).eq('id', order.id);
  if (updError) {
    console.error('[order/cancel] annullamento fallito:', orderId, updError.message);
    return NextResponse.json({ error: 'Annullamento non riuscito. Riprova.' }, { status: 500 });
  }

  // Ordine online mai pagato: l'utilizzo del codice promo, consumato alla
  // creazione, torna disponibile.
  if (order.status === 'awaiting_payment' && order.promo_code) {
    const { data: promo } = await ctx.admin
      .from('promos')
      .select('id')
      .eq('restaurant_id', order.restaurant_id)
      .eq('code', order.promo_code)
      .maybeSingle();
    if (promo) await ctx.admin.rpc('release_promo_usage', { p_promo_id: promo.id });
  }

  return NextResponse.json({ ok: true, refunded, voided });
}
