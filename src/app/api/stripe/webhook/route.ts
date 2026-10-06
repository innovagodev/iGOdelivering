import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { adminClient } from '@/lib/orderServer';
import { getStripe, syncRestaurantStripe } from '@/lib/stripeServer';

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

    default:
      // Eventi di pagamento: gestiti dalla fase 5.
      return;
  }
}
