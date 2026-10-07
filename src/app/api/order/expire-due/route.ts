import { NextResponse } from 'next/server';
import { getAuthContext, getStripe, resolveRestaurant } from '@/lib/stripeServer';
import { expireDueAuthorizedOrders } from '@/lib/orderPayments';

/**
 * POST /api/order/expire-due   { restaurantId? }
 *
 * Annulla le autorizzazioni degli ordini del ristorante che nessuno ha
 * accettato entro la finestra dei 3 minuti. Chiamata dal pannello ordini del
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

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Configurazione server mancante' }, { status: 500 });

  const expired = await expireDueAuthorizedOrders(stripe, ctx.admin, resolved.restaurant.id);
  return NextResponse.json({ ok: true, expired });
}
