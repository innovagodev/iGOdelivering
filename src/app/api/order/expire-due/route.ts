import { NextResponse } from 'next/server';
import { getAuthContext, getStripe, resolveRestaurant } from '@/lib/stripeServer';
import { expireDueRequests } from '@/lib/orderPayments';

/**
 * POST /api/order/expire-due   { restaurantId? }
 *
 * Fa scadere ordini e prenotazioni del ristorante non accettati entro la loro
 * scadenza e annulla le autorizzazioni di carta. Chiamata dal pannello ordini del
 * ristoratore: se il cliente ha chiuso la pagina e nessun altro ha toccato
 * l'ordine, è l'unico modo in cui l'importo smette di restare bloccato.
 *
 * Titolare: solo il proprio ristorante. Admin: quello indicato.
 */
export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Body assente: vale per il ristorante del titolare.
  }

  const resolved = await resolveRestaurant(ctx, body.restaurantId);
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status });

  const expired = await expireDueRequests(getStripe(), ctx.admin, resolved.restaurant.id);
  return NextResponse.json({ ok: true, expired: expired.orders + expired.bookings, ...expired });
}
