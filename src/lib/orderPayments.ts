import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Autorizzazione, cattura e scadenza degli ordini online (migration 032, 034).
 *
 * Il PaymentIntent è creato con capture_method = manual: il cliente autorizza
 * l'importo, il ristorante lo accetta entro `accept_deadline` (la regola sta in
 * src/lib/acceptance.ts). Accettato → l'importo viene catturato. Rifiutato o
 * scaduto → l'autorizzazione viene annullata e il cliente non è mai addebitato.
 *
 * Solo codice server: usa la service role key e la chiave segreta di Stripe.
 */

export type AuthorizationOutcome = 'voided' | 'captured' | 'error';

interface PaymentRef {
  id: string;
  stripe_payment_intent_id: string | null;
  stripe_account_id: string | null;
}

/**
 * Annulla l'autorizzazione di un PaymentIntent. Idempotente: se era già
 * annullato risponde 'voided'; se nel frattempo è stato catturato risponde
 * 'captured' (l'incasso è avvenuto, l'annullamento non è più possibile).
 */
export async function cancelAuthorization(
  stripe: Stripe,
  order: PaymentRef,
  reason: 'requested_by_customer' | 'abandoned'
): Promise<AuthorizationOutcome> {
  if (!order.stripe_payment_intent_id || !order.stripe_account_id) {
    console.error('[orderPayments] annullamento impossibile, dati mancanti:', order.id);
    return 'error';
  }
  const options = { stripeAccount: order.stripe_account_id };
  try {
    await stripe.paymentIntents.cancel(
      order.stripe_payment_intent_id,
      { cancellation_reason: reason },
      options
    );
    return 'voided';
  } catch (e: any) {
    try {
      const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id, {}, options);
      if (pi.status === 'canceled') return 'voided';
      if (pi.status === 'succeeded') return 'captured';
    } catch {
      // Stato non leggibile: si segnala l'errore originale.
    }
    console.error('[orderPayments] annullamento fallito:', order.id, e?.message);
    return 'error';
  }
}

/**
 * Fa scadere un ordine non accettato entro la scadenza. Torna true solo se la
 * scadenza è stata registrata ora.
 *   · pagamento autorizzato: annulla l'autorizzazione su Stripe, poi porta
 *     l'ordine a 'expired' / 'voided';
 *   · contanti o POS: lo porta a 'expired'.
 * Un ordine già accettato o incassato non si tocca.
 *
 * Stripe per primo: se il ristorante ha catturato nel frattempo, l'annullamento
 * fallisce e l'ordine resta com'è.
 */
export async function expireOrder(
  stripe: Stripe | null,
  admin: SupabaseClient,
  orderId: string
): Promise<boolean> {
  const { data: order, error } = await admin
    .from('orders')
    .select('id, status, payment_status, accept_deadline, stripe_payment_intent_id, stripe_account_id')
    .eq('id', orderId)
    .maybeSingle();
  if (error || !order) return false;
  if (order.status !== 'new' && order.status !== 'pending') return false;
  if (!order.accept_deadline || new Date(order.accept_deadline).getTime() > Date.now()) {
    return false;
  }

  if (order.payment_status === 'authorized') {
    if (!stripe) return false;
    const outcome = await cancelAuthorization(stripe, order, 'abandoned');
    if (outcome !== 'voided') return false;
    const { data: updated, error: updError } = await admin
      .from('orders')
      .update({ status: 'expired', payment_status: 'voided' })
      .eq('id', order.id)
      .eq('payment_status', 'authorized')
      .in('status', ['new', 'pending'])
      .select('id');
    if (updError) {
      console.error('[orderPayments] scadenza non registrata:', order.id, updError.message);
      return false;
    }
    return (updated?.length ?? 0) > 0;
  }

  if (order.payment_status !== 'unpaid') return false;
  const { data: updated, error: updError } = await admin
    .from('orders')
    .update({ status: 'expired' })
    .eq('id', order.id)
    .eq('payment_status', 'unpaid')
    .in('status', ['new', 'pending'])
    .select('id');
  if (updError) {
    console.error('[orderPayments] scadenza non registrata:', order.id, updError.message);
    return false;
  }
  return (updated?.length ?? 0) > 0;
}

/**
 * Fa scadere una prenotazione non confermata entro la scadenza. Una
 * prenotazione non ha pagamenti: basta cambiare lo stato.
 */
export async function expireBooking(admin: SupabaseClient, bookingId: string): Promise<boolean> {
  const { data, error } = await admin
    .from('bookings')
    .update({ status: 'expired' })
    .eq('id', bookingId)
    .eq('status', 'pending')
    .lt('accept_deadline', new Date().toISOString())
    .select('id');
  if (error) {
    console.error('[orderPayments] scadenza prenotazione non registrata:', bookingId, error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/**
 * Rete di sicurezza: fa scadere ordini e prenotazioni con scadenza passata, di
 * un ristorante o di tutti. Lo stato vero lo vedono comunque subito cliente e
 * ristoratore (la scadenza è un dato del server), ma un'autorizzazione di
 * carta resta bloccata finché qualcuno non la annulla.
 */
export async function expireDueRequests(
  stripe: Stripe | null,
  admin: SupabaseClient,
  restaurantId?: string,
  limit = 50
): Promise<{ orders: number; bookings: number }> {
  const nowIso = new Date().toISOString();

  let orderQuery = admin
    .from('orders')
    .select('id')
    .in('status', ['new', 'pending'])
    .in('payment_status', ['unpaid', 'authorized'])
    .lt('accept_deadline', nowIso)
    .order('accept_deadline', { ascending: true })
    .limit(limit);
  if (restaurantId) orderQuery = orderQuery.eq('restaurant_id', restaurantId);

  let bookingQuery = admin
    .from('bookings')
    .select('id')
    .eq('status', 'pending')
    .lt('accept_deadline', nowIso)
    .order('accept_deadline', { ascending: true })
    .limit(limit);
  if (restaurantId) bookingQuery = bookingQuery.eq('restaurant_id', restaurantId);

  const [orders, bookings] = await Promise.all([orderQuery, bookingQuery]);
  if (orders.error) {
    console.error('[orderPayments] lettura ordini scaduti fallita:', orders.error.message);
  }
  if (bookings.error) {
    console.error('[orderPayments] lettura prenotazioni scadute fallita:', bookings.error.message);
  }

  let expiredOrders = 0;
  for (const row of orders.data ?? []) {
    if (await expireOrder(stripe, admin, row.id)) expiredOrders++;
  }
  let expiredBookings = 0;
  for (const row of bookings.data ?? []) {
    if (await expireBooking(admin, row.id)) expiredBookings++;
  }
  return { orders: expiredOrders, bookings: expiredBookings };
}
