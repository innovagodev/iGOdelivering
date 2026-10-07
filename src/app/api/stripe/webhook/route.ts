import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { adminClient } from '@/lib/orderServer';
import { getStripe, syncRestaurantStripe } from '@/lib/stripeServer';
import { ACCEPT_WINDOW_SECONDS, cancelAuthorization } from '@/lib/orderPayments';

/**
 * POST /api/stripe/webhook
 *
 * Eventi di Stripe sugli account collegati (endpoint Connect configurato nel
 * dashboard). Ogni evento è:
 *   1. verificato con la firma (STRIPE_WEBHOOK_SECRET) sul body grezzo;
 *   2. registrato in `stripe_events` prima di elaborarlo: un evento già
 *      elaborato viene saltato, uno fallito in precedenza viene ripreso;
 *   3. elaborato; in caso di errore si risponde 500 e Stripe ritenta.
 *
 * Fase 2: gestisce lo stato degli account (account.updated,
 * account.application.deauthorized). Gli eventi di pagamento vengono
 * registrati e confermati senza effetti finché non arriva la fase 5.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const admin = adminClient();
  if (!stripe || !secret || !admin) {
    console.error('[stripe/webhook] configurazione mancante');
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  const payload = await request.text();
  if (!signature) return NextResponse.json({ error: 'missing signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (e: any) {
    console.error('[stripe/webhook] firma non valida:', e?.message);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  // ─── Idempotenza ──────────────────────────────────────────────────────────
  const { error: insertError } = await admin.from('stripe_events').insert({
    id: event.id,
    type: event.type,
    stripe_account_id: event.account ?? null,
    livemode: event.livemode,
  });
  if (insertError) {
    if (insertError.code !== '23505') {
      console.error(
        '[stripe/webhook] registrazione evento fallita:',
        event.id,
        insertError.message
      );
      return NextResponse.json({ error: 'storage' }, { status: 500 });
    }
    const { data: existing } = await admin
      .from('stripe_events')
      .select('processed_at, attempts')
      .eq('id', event.id)
      .single();
    if (existing?.processed_at) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    await admin
      .from('stripe_events')
      .update({ attempts: (existing?.attempts ?? 1) + 1 })
      .eq('id', event.id);
  }

  // ─── Elaborazione ─────────────────────────────────────────────────────────
  try {
    await handleEvent(stripe, admin, event);
    await admin
      .from('stripe_events')
      .update({ processed_at: new Date().toISOString(), last_error: null })
      .eq('id', event.id);
    return NextResponse.json({ received: true });
  } catch (e: any) {
    const message = String(e?.message ?? e).slice(0, 500);
    console.error('[stripe/webhook] elaborazione fallita:', event.id, event.type, message);
    await admin.from('stripe_events').update({ last_error: message }).eq('id', event.id);
    return NextResponse.json({ error: 'processing failed' }, { status: 500 });
  }
}

async function handleEvent(
  stripe: Stripe,
  admin: NonNullable<ReturnType<typeof adminClient>>,
  event: Stripe.Event
) {
  switch (event.type) {
    case 'account.updated': {
      const accountId = event.account ?? (event.data.object as Stripe.Account).id;
      const { data: restaurant } = await admin
        .from('restaurants')
        .select('id')
        .eq('stripe_account_id', accountId)
        .maybeSingle();
      // Account non associato a un ristorante (es. account di prova creato
      // dal dashboard): niente da aggiornare.
      if (!restaurant) return;
      const synced = await syncRestaurantStripe(stripe, admin, restaurant.id, accountId);
      if ('error' in synced) throw new Error(synced.error);
      return;
    }

    case 'account.application.deauthorized': {
      // Il ristorante ha revocato l'accesso a iGOdelivering dal suo
      // dashboard: da questo momento non si possono creare pagamenti sul suo
      // account. Lo si scollega; un nuovo collegamento crea un nuovo account.
      const accountId = event.account;
      if (!accountId) return;
      const { error } = await admin
        .from('restaurants')
        .update({
          stripe_account_id: null,
          stripe_connected: false,
          stripe_payouts_enabled: false,
          stripe_details_submitted: false,
          stripe_requirements: null,
          stripe_synced_at: new Date().toISOString(),
        })
        .eq('stripe_account_id', accountId);
      if (error) throw new Error(error.message);
      return;
    }

    case 'payment_intent.amount_capturable_updated':
      return onPaymentAuthorized(
        stripe,
        admin,
        event.account ?? null,
        event.data.object as Stripe.PaymentIntent
      );

    case 'payment_intent.succeeded':
      return onPaymentSucceeded(
        stripe,
        admin,
        event.account ?? null,
        event.data.object as Stripe.PaymentIntent
      );

    case 'payment_intent.payment_failed': {
      // Il cliente può riprovare sullo stesso pagamento finché l'ordine non
      // scade: si registra l'esito, l'ordine resta fuori dalla cucina.
      const pi = event.data.object as Stripe.PaymentIntent;
      const { error } = await admin
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('stripe_payment_intent_id', pi.id)
        .eq('status', 'awaiting_payment');
      if (error) throw new Error(error.message);
      return;
    }

    case 'payment_intent.canceled': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const { data: order } = await admin
        .from('orders')
        .select('id, payment_status')
        .eq('stripe_payment_intent_id', pi.id)
        .maybeSingle();
      if (!order) return;
      if (order.payment_status === 'authorized') {
        // Autorizzazione annullata fuori dal flusso dell'app (per esempio dal
        // dashboard Stripe del ristorante): l'ordine non può più essere
        // incassato. Quando l'annullamento lo fa l'app, l'ordine è già chiuso
        // e questa riga non corrisponde a nulla.
        const { error } = await admin
          .from('orders')
          // 'abandoned' è il motivo che l'app usa quando la finestra scade:
          // l'evento può arrivare prima che la route registri la scadenza.
          .update({
            status: pi.cancellation_reason === 'abandoned' ? 'expired' : 'cancelled',
            payment_status: 'voided',
          })
          .eq('id', order.id)
          .eq('payment_status', 'authorized')
          .in('status', ['new', 'pending']);
        if (error) throw new Error(error.message);
        return;
      }
      const { error } = await admin.rpc('expire_unpaid_order', { p_order_id: order.id });
      if (error) throw new Error(error.message);
      return;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const piId =
        typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (!piId) return;
      const { data: order } = await admin
        .from('orders')
        .select('id, paid_amount')
        .eq('stripe_payment_intent_id', piId)
        .maybeSingle();
      if (!order || order.paid_amount === null) return;
      const refunded = Math.min(charge.amount_refunded / 100, Number(order.paid_amount));
      const { error } = await admin
        .from('orders')
        .update({
          refunded_amount: refunded,
          payment_status:
            charge.amount_refunded >= charge.amount ? 'refunded' : 'partially_refunded',
        })
        .eq('id', order.id);
      if (error) throw new Error(error.message);
      return;
    }

    case 'charge.dispute.created': {
      // Contestazione aperta dal cliente presso la banca: la gestisce il
      // ristorante dal suo dashboard Stripe. Qui resta traccia nei log.
      const dispute = event.data.object as Stripe.Dispute;
      console.warn(
        '[stripe/webhook] contestazione aperta:',
        event.account,
        dispute.payment_intent,
        dispute.amount,
        dispute.reason
      );
      return;
    }

    default:
      return;
  }
}

/**
 * Importo autorizzato (bloccato sulla carta, non ancora addebitato): l'ordine
 * entra in cucina e parte la finestra di accettazione di 3 minuti. L'incasso
 * avviene quando il ristorante accetta (/api/order/accept).
 *
 * Stessi controlli di onPaymentSucceeded. Se l'ordine non è più in attesa
 * (scaduto o annullato prima che l'autorizzazione arrivasse) o i controlli
 * falliscono, l'autorizzazione viene annullata: il cliente non viene addebitato.
 */
async function onPaymentAuthorized(
  stripe: Stripe,
  admin: NonNullable<ReturnType<typeof adminClient>>,
  accountId: string | null,
  pi: Stripe.PaymentIntent
) {
  if (pi.status !== 'requires_capture') return;

  const { data: order, error } = await admin
    .from('orders')
    .select('id, status, total, payment_status, stripe_account_id')
    .eq('stripe_payment_intent_id', pi.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  // Pagamento non legato a un ordine (es. creato dal dashboard Stripe).
  if (!order) return;
  // Già registrato: evento ripetuto o arrivato dopo l'accettazione.
  if (
    order.payment_status === 'authorized' ||
    order.payment_status === 'paid' ||
    order.payment_status === 'voided' ||
    order.payment_status === 'refunded' ||
    order.payment_status === 'partially_refunded'
  ) {
    return;
  }

  const amountOk =
    pi.amount_capturable === Math.round(Number(order.total) * 100) && pi.currency === 'eur';
  const accountOk = !!accountId && accountId === order.stripe_account_id;

  if (order.status === 'awaiting_payment' && amountOk && accountOk) {
    const now = Date.now();
    const { error: updError } = await admin
      .from('orders')
      .update({
        status: 'new',
        payment_status: 'authorized',
        authorized_at: new Date(now).toISOString(),
        accept_deadline: new Date(now + ACCEPT_WINDOW_SECONDS * 1000).toISOString(),
      })
      .eq('id', order.id)
      .eq('status', 'awaiting_payment');
    if (updError) throw new Error(updError.message);
    return;
  }

  console.error('[stripe/webhook] autorizzazione non accettabile, annullata:', {
    order: order.id,
    status: order.status,
    amountOk,
    accountOk,
  });
  if (accountId) {
    const outcome = await cancelAuthorization(
      stripe,
      {
        id: order.id,
        stripe_payment_intent_id: pi.id,
        stripe_account_id: accountId,
      },
      'abandoned'
    );
    if (outcome === 'error') throw new Error('annullamento autorizzazione fallito');
  }
  const { error: updError } = await admin
    .from('orders')
    .update({ payment_status: 'voided' })
    .eq('id', order.id);
  if (updError) throw new Error(updError.message);
}

/**
 * Pagamento riuscito (incassato): l'ordine entra in cucina.
 *
 * Con la cattura manuale l'evento arriva quando il ristorante accetta e
 * /api/order/accept cattura l'importo: l'ordine è già in cucina e qui si
 * registra solo l'incasso (idempotente rispetto alla route). Il percorso
 * completo qui sotto resta per i pagamenti creati con cattura automatica.
 *
 * Controlli prima di farlo: il pagamento deve appartenere all'account del
 * ristorante dell'ordine e l'importo incassato deve coincidere con il totale
 * calcolato dal server. Se l'ordine non è più in attesa (scaduto o annullato
 * prima che il pagamento arrivasse) o i controlli falliscono, il cliente
 * viene rimborsato: non deve restare addebitato per un ordine che non
 * riceverà.
 */
async function onPaymentSucceeded(
  stripe: Stripe,
  admin: NonNullable<ReturnType<typeof adminClient>>,
  accountId: string | null,
  pi: Stripe.PaymentIntent
) {
  const { data: order, error } = await admin
    .from('orders')
    .select('id, status, total, payment_status, stripe_account_id')
    .eq('stripe_payment_intent_id', pi.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  // Pagamento non legato a un ordine (es. creato dal dashboard Stripe).
  if (!order) return;
  // Già registrato: evento ripetuto o arrivato dopo il rimborso.
  if (
    order.payment_status === 'paid' ||
    order.payment_status === 'refunded' ||
    order.payment_status === 'partially_refunded'
  ) {
    return;
  }

  const paid = pi.amount_received / 100;
  const amountOk =
    pi.amount_received === Math.round(Number(order.total) * 100) && pi.currency === 'eur';
  const accountOk = !!accountId && accountId === order.stripe_account_id;

  // Catturato dopo l'accettazione: l'ordine è già in cucina, si registra solo
  // l'incasso.
  if (order.payment_status === 'authorized' && amountOk && accountOk) {
    const { error: updError } = await admin
      .from('orders')
      .update({
        payment_status: 'paid',
        paid_amount: paid,
        paid_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('payment_status', 'authorized');
    if (updError) throw new Error(updError.message);
    return;
  }

  if (order.status === 'awaiting_payment' && amountOk && accountOk) {
    const { error: updError } = await admin
      .from('orders')
      .update({
        status: 'new',
        payment_status: 'paid',
        paid_amount: paid,
        paid_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('status', 'awaiting_payment');
    if (updError) throw new Error(updError.message);
    return;
  }

  console.error('[stripe/webhook] pagamento non accettabile, rimborso:', {
    order: order.id,
    status: order.status,
    amountOk,
    accountOk,
  });
  if (accountId) {
    await stripe.refunds.create(
      { payment_intent: pi.id, reason: 'requested_by_customer' },
      { stripeAccount: accountId, idempotencyKey: `igo-refund-late-${pi.id}` }
    );
  }
  const { error: updError } = await admin
    .from('orders')
    .update({
      payment_status: 'refunded',
      paid_amount: paid,
      refunded_amount: paid,
      paid_at: new Date().toISOString(),
    })
    .eq('id', order.id);
  if (updError) throw new Error(updError.message);
}
