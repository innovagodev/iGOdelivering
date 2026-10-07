import { NextResponse } from 'next/server';
import { getAuthContext, getStripe } from '@/lib/stripeServer';
import { UUID_RE } from '@/lib/orderServer';
import { expireAuthorizedOrder } from '@/lib/orderPayments';

/**
 * POST /api/order/accept   { orderId }
 *
 * Accetta un ordine con pagamento online autorizzato: cattura l'importo
 * bloccato sulla carta del cliente e porta l'ordine in preparazione. L'ordine
 * si accetta solo entro accept_deadline; oltre, l'autorizzazione viene
 * annullata e il cliente non è addebitato.
 *
 * Gli ordini contanti e POS non passano da qui: si accettano con un normale
 * aggiornamento di stato dal pannello.
 *
 * Titolare: solo ordini del proprio ristorante. Admin: qualunque ordine.
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
      'id, status, payment_status, accept_deadline, total, stripe_payment_intent_id, stripe_account_id, restaurants ( owner_id )'
    )
    .eq('id', orderId)
    .maybeSingle();
  if (error) {
    console.error('[order/accept] lettura ordine fallita:', orderId, error.message);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
  const rawRestaurant = (order as any)?.restaurants;
  const ownerId = (Array.isArray(rawRestaurant) ? rawRestaurant[0] : rawRestaurant)?.owner_id;
  if (!order || (ctx.role === 'ristoratore' && ownerId !== ctx.userId)) {
    return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });
  }

  // Già accettato (doppio clic, due dispositivi): niente da fare.
  if (order.payment_status === 'paid' && order.status === 'preparing') {
    return NextResponse.json({ ok: true, alreadyAccepted: true });
  }
  if (order.payment_status !== 'authorized' || (order.status !== 'new' && order.status !== 'pending')) {
    const gone = order.status === 'expired' || order.payment_status === 'voided';
    return NextResponse.json(
      {
        error: gone
          ? 'L’ordine è scaduto: il cliente non è stato addebitato.'
          : 'Questo ordine non può essere accettato.',
        expired: gone,
      },
      { status: 409 }
    );
  }

  const stripe = getStripe();
  if (!stripe || !order.stripe_payment_intent_id || !order.stripe_account_id) {
    console.error('[order/accept] incasso impossibile, dati mancanti:', orderId);
    return NextResponse.json(
      { error: 'Impossibile incassare il pagamento online: contatta l’assistenza.' },
      { status: 500 }
    );
  }

  // Finestra scaduta: l'ordine non si accetta più e l'autorizzazione si annulla.
  if (!order.accept_deadline || new Date(order.accept_deadline).getTime() <= Date.now()) {
    await expireAuthorizedOrder(stripe, ctx.admin, order.id);
    return NextResponse.json(
      { error: 'Tempo scaduto: l’ordine è scaduto e il cliente non è stato addebitato.', expired: true },
      { status: 409 }
    );
  }

  const options = { stripeAccount: order.stripe_account_id };
  let paidCents: number;
  try {
    const pi = await stripe.paymentIntents.capture(
      order.stripe_payment_intent_id,
      { amount_to_capture: Math.round(Number(order.total) * 100) },
      { ...options, idempotencyKey: `igo-capture-${order.id}` }
    );
    paidCents = pi.amount_received;
  } catch (e: any) {
    // Catturato da un'altra richiesta, o annullato nel frattempo: si legge lo
    // stato vero invece di indovinarlo.
    let pi: Awaited<ReturnType<typeof stripe.paymentIntents.retrieve>> | null = null;
    try {
      pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id, {}, options);
    } catch {
      // Stato non leggibile: si segnala l'errore originale.
    }
    if (pi?.status === 'succeeded') {
      paidCents = pi.amount_received;
    } else if (pi?.status === 'canceled') {
      await ctx.admin
        .from('orders')
        .update({ status: 'expired', payment_status: 'voided' })
        .eq('id', order.id)
        .eq('payment_status', 'authorized');
      return NextResponse.json(
        { error: 'L’autorizzazione è stata annullata: il cliente non è stato addebitato.', expired: true },
        { status: 409 }
      );
    } else {
      console.error('[order/accept] cattura fallita:', orderId, e?.message);
      return NextResponse.json(
        { error: 'L’incasso non è riuscito: l’ordine non è stato accettato. Riprova.' },
        { status: 502 }
      );
    }
  }

  const { error: updError } = await ctx.admin
    .from('orders')
    .update({
      status: 'preparing',
      payment_status: 'paid',
      paid_amount: paidCents / 100,
      paid_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .in('status', ['new', 'pending']);
  if (updError) {
    // L'importo è stato incassato: il webhook payment_intent.succeeded
    // registrerà comunque il pagamento. Si chiede di riprovare l'accettazione.
    console.error('[order/accept] registrazione fallita:', orderId, updError.message);
    return NextResponse.json({ error: 'Accettazione non riuscita. Riprova.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
