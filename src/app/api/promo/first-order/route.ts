import { NextResponse } from 'next/server';
import { adminClient, clientIp, EMAIL_RE, fail, rateLimited, str, UUID_RE } from '@/lib/orderServer';

/**
 * POST /api/promo/first-order
 *
 * Dice se un indirizzo email ha già ordinato presso un ristorante, per i codici
 * sconto riservati al primo ordine. Risponde solo "sì/no", mai il numero.
 *
 * La funzione `count_customer_orders` del database è di uso interno: la vetrina
 * non la chiama più direttamente, passa da qui. La route la espone con un limite
 * di richieste per connessione. Il controllo vero, al momento dell'ordine,
 * resta in /api/orders.
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
    console.error('[promo/first-order] Missing Supabase env vars');
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  const restaurantId = body.restaurantId;
  const email = str(body.email, 200).toLowerCase();
  if (typeof restaurantId !== 'string' || !UUID_RE.test(restaurantId) || !EMAIL_RE.test(email)) {
    const f = fail(400, 'bad_request', 'Dati non validi.');
    return NextResponse.json(f.body, { status: f.status });
  }

  // Pochi tentativi per connessione: un uso normale ne fa uno o due.
  const ip = clientIp(request);
  const limited = await rateLimited(admin, [
    { key: `promo-first:${ip}`, limit: 15, windowSeconds: 600 },
  ]);
  if (limited) return NextResponse.json(limited.body, { status: limited.status });

  const { data, error } = await admin.rpc('count_customer_orders', {
    p_restaurant_id: restaurantId,
    p_customer_email: email,
  });
  if (error || typeof data !== 'number') {
    console.error('[promo/first-order] count_customer_orders error:', error?.message ?? data);
    const f = fail(500, 'server_error', 'Verifica non riuscita, riprova.');
    return NextResponse.json(f.body, { status: f.status });
  }

  return NextResponse.json({ alreadyOrdered: data > 0 });
}
