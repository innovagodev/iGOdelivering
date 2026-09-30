import { NextResponse } from 'next/server';
import { fromCents } from '@/lib/pricing';
import {
  adminClient,
  EMAIL_RE,
  fail,
  isFail,
  parseLines,
  priceLines,
  str,
  UUID_RE,
} from '@/lib/orderServer';

/**
 * POST /api/bookings
 *
 * Crea una prenotazione della vetrina pubblica, con o senza pre-ordine.
 * Sostituisce l'INSERT anonimo diretto su `bookings`, che accettava
 * `pre_order_items` e `pre_order_total` così come arrivavano dal browser:
 * quando il ristoratore conferma la prenotazione, quei prezzi diventano un
 * ordine vero (rilievo C8 di AUDIT_REPORT.md).
 *
 * Il pre-ordine è prezzato come un ordine, dai prezzi dei piatti e delle
 * opzioni letti dal database. Nessuno sconto e nessuna consegna: il codice promo non
 * viene consumato su una prenotazione, quindi non viene nemmeno applicato.
 * Il totale salvato è quello ricalcolato, e torna al client per la conferma.
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
    console.error('[bookings] Missing Supabase env vars');
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  const invalid = fail(400, 'bad_request', 'Dati della prenotazione non validi.');
  const reply = (f: { status: number; body: Record<string, unknown> }) =>
    NextResponse.json(f.body, { status: f.status });

  const restaurantId = body.restaurantId;
  if (typeof restaurantId !== 'string' || !UUID_RE.test(restaurantId)) return reply(invalid);

  const name = str(body.name, 120);
  const phone = str(body.phone, 40);
  const email = str(body.email, 200).toLowerCase();
  const notes = str(body.notes, 1000);
  const date = str(body.date, 10);
  const time = str(body.time, 5);
  const guests = body.guests;

  if (!name || !phone) return reply(invalid);
  if (email && !EMAIL_RE.test(email)) return reply(invalid);
  if (!Number.isInteger(guests) || (guests as number) < 1 || (guests as number) > 100) {
    return reply(invalid);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(date).getTime())) {
    return reply(invalid);
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return reply(invalid);

  const hasPreOrder = Array.isArray(body.items) && body.items.length > 0;
  const lines = hasPreOrder ? parseLines(body.items) : [];
  if (!lines) return reply(invalid);

  const { data: restaurant, error: rErr } = await admin
    .from('restaurants')
    .select('id, status')
    .eq('id', restaurantId)
    .maybeSingle();
  if (rErr) {
    console.error('[bookings] restaurants query error:', rErr.message);
    return reply(fail(500, 'server_error', 'Impossibile completare la prenotazione, riprova.'));
  }
  if (!restaurant || restaurant.status !== 'published') {
    return reply(fail(404, 'restaurant_not_found', 'Ristorante non disponibile.'));
  }

  let preOrderItems: Record<string, unknown>[] = [];
  let preOrderTotal = 0;
  if (lines.length > 0) {
    const priced = await priceLines(admin, restaurantId, lines);
    if (isFail(priced)) return reply(priced);
    // Stessa forma che il pannello del ristoratore legge da pre_order_items
    // per convertire la prenotazione in ordine: id, name, price, qty, note,
    // addedIngredients, removedIngredients.
    preOrderItems = priced.lines.map((p) => ({
      id: p.menu_item_id,
      name: p.name,
      price: fromCents(p.unitCents),
      qty: p.qty,
      note: p.note,
      addedIngredients: p.added_ingredients,
      removedIngredients: p.removed_ingredients,
    }));
    preOrderTotal = fromCents(priced.itemsCents);
  }

  const booking = {
    id: crypto.randomUUID(),
    restaurant_id: restaurantId,
    name,
    phone,
    email: email || null,
    guests: guests as number,
    date,
    time: `${time}:00`,
    status: 'pending',
    notes,
    pre_order_items: preOrderItems,
    pre_order_total: preOrderTotal,
  };

  const { data: created, error } = await admin
    .from('bookings')
    .insert(booking)
    .select('created_at')
    .single();
  if (error) {
    console.error('[bookings] insert error:', error.message);
    return reply(fail(500, 'server_error', 'Impossibile completare la prenotazione, riprova.'));
  }

  return NextResponse.json(
    { booking: { ...booking, created_at: created.created_at } },
    { status: 201 }
  );
}
