import { NextResponse } from 'next/server';
import {
  getAuthContext,
  getStripe,
  resolveRestaurant,
  statusFromRow,
  syncRestaurantStripe,
} from '@/lib/stripeServer';

/**
 * POST /api/stripe/status
 *
 * Stato del collegamento Stripe del ristorante, riletto da Stripe e salvato.
 * Il pannello la chiama all'apertura della pagina Pagamenti e al ritorno
 * dalla procedura di Stripe: così lo stato è corretto anche se un evento del
 * webhook è andato perso.
 *
 * Titolare: il proprio ristorante. Admin: quello indicato con `restaurantId`.
 */
export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // body facoltativo per il titolare
  }

  const resolved = await resolveRestaurant(ctx, body.restaurantId);
  if (!resolved.ok)
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  const restaurant = resolved.restaurant;

  if (!restaurant.stripe_account_id) {
    return NextResponse.json({ status: statusFromRow(restaurant) });
  }

  const stripe = getStripe();
  if (!stripe) {
    console.error('[stripe/status] STRIPE_SECRET_KEY mancante');
    // Senza Stripe si restituisce l'ultimo stato noto, senza fingere un
    // aggiornamento.
    return NextResponse.json({ status: statusFromRow(restaurant), stale: true });
  }

  const synced = await syncRestaurantStripe(
    stripe,
    ctx.admin,
    restaurant.id,
    restaurant.stripe_account_id
  );
  if ('error' in synced) {
    return NextResponse.json({
      status: statusFromRow(restaurant),
      stale: true,
      error: synced.error,
    });
  }
  return NextResponse.json({ status: synced });
}
