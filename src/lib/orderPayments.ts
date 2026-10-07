import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Autorizzazione e cattura dei pagamenti online (migration 032).
 *
 * Il PaymentIntent è creato con capture_method = manual: il cliente autorizza
 * l'importo, il ristorante ha ACCEPT_WINDOW_SECONDS per accettare l'ordine.
 * Accettato → l'importo viene catturato. Rifiutato o scaduto → l'autorizzazione
 * viene annullata e il cliente non è mai addebitato.
 *
 * Solo codice server: usa la service role key e la chiave segreta di Stripe.
 */

/** Finestra di accettazione mostrata al cliente nel conto alla rovescia. */
export const ACCEPT_WINDOW_SECONDS = 180;

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
 * Fa scadere un ordine con pagamento autorizzato e finestra scaduta: annulla
 * l'autorizzazione su Stripe, poi porta l'ordine a 'expired' / 'voided'. Torna
 * true solo se la scadenza è stata registrata ora.
 *
 * Stripe per primo: se il ristorante ha catturato nel frattempo, l'annullamento
 * fallisce e l'ordine resta com'è.
 */
export async function expireAuthorizedOrder(
  stripe: Stripe,
  admin: SupabaseClient,
  orderId: string
): Promise<boolean> {
  const { data: order, error } = await admin
    .from('orders')
    .select('id, status, payment_status, accept_deadline, stripe_payment_intent_id, stripe_account_id')
    .eq('id', orderId)
    .maybeSingle();
  if (error || !order) return false;
  if (order.payment_status !== 'authorized') return false;
  if (order.status !== 'new' && order.status !== 'pending') return false;
  if (!order.accept_deadline || new Date(order.accept_deadline).getTime() > Date.now()) {
    return false;
  }

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

/**
 * Rete di sicurezza: fa scadere gli ordini autorizzati con finestra scaduta,
 * di un ristorante o di tutti. Lo stato vero lo vedono comunque subito cliente
 * e ristoratore (la scadenza è un dato del server), ma l'autorizzazione resta
 * bloccata sulla carta finché qualcuno non la annulla.
 */
export async function expireDueAuthorizedOrders(
  stripe: Stripe,
  admin: SupabaseClient,
  restaurantId?: string,
  limit = 25
): Promise<number> {
  let query = admin
    .from('orders')
    .select('id')
    .eq('payment_status', 'authorized')
    .in('status', ['new', 'pending'])
    .lt('accept_deadline', new Date().toISOString())
    .order('accept_deadline', { ascending: true })
    .limit(limit);
  if (restaurantId) query = query.eq('restaurant_id', restaurantId);

  const { data, error } = await query;
  if (error) {
    console.error('[orderPayments] lettura ordini scaduti fallita:', error.message);
    return 0;
  }

  let expired = 0;
  for (const row of data ?? []) {
    if (await expireAuthorizedOrder(stripe, admin, row.id)) expired++;
  }
  return expired;
}
