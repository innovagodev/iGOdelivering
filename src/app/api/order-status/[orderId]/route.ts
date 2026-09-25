import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/order-status/[orderId]
 *
 * Reads an order (or booking) using the Supabase service role key so that Row
 * Level Security is bypassed completely. This ensures the customer-facing order
 * tracker can always fetch and poll the order, regardless of the RLS policy
 * configured on the orders / bookings tables — the anonymous client has no read
 * policy at all, so a direct query from the browser silently returns nothing.
 *
 * `orderId` must be the order UUID (128-bit random, unguessable), never
 * `order_number`: that one is short and sequential per restaurant, so anyone
 * could enumerate other people's orders. Knowing the UUID is proof enough that
 * you placed the order, so no additional auth is required.
 *
 * The response carries only what the tracking page renders for the customer —
 * notably NOT customer_name / customer_email / customer_phone.
 *
 * Response (order):
 *   { status, type: 'order', orderNumber, orderType, address, tableNumber,
 *     scheduledAt, items: [{ name, price, qty, note }],
 *     subtotal, deliveryFee, discount, total,
 *     restaurant: { name, slug } | null }
 * Response (booking): { status, type: 'booking' }
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await context.params;

  if (!orderId || orderId.trim() === '') {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
  }

  // Scarta subito quello che non è un UUID — in particolare un `order_number`,
  // che arrivava qui dai vecchi link di tracking. Senza questo controllo la
  // query raggiunge Postgres e fallisce con "invalid input syntax for type
  // uuid", sporcando i log a ogni richiesta.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[order-status] Missing Supabase env vars');
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Try orders table first
  const { data: order, error: orderErr } = await admin
    .from('orders')
    .select(
      `
      id, order_number, status, type, customer_address, table_number, scheduled_at,
      subtotal, delivery_fee, discount, total,
      order_items ( name, price, qty, note ),
      restaurants ( name, slug )
    `
    )
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr) {
    console.error('[order-status] orders query error:', orderErr.message);
  }

  if (order) {
    // A seconda di come PostgREST risolve l'embed, `restaurants` arriva come
    // oggetto o come array di un elemento.
    const rawRestaurant = order.restaurants as any;
    const restaurant = Array.isArray(rawRestaurant) ? rawRestaurant[0] : rawRestaurant;

    return NextResponse.json({
      status: order.status,
      type: 'order',
      orderNumber: order.order_number,
      orderType: order.type,
      address: order.customer_address,
      tableNumber: order.table_number,
      scheduledAt: order.scheduled_at,
      items: (order.order_items || []).map((item: any) => ({
        name: item.name,
        price: parseFloat(item.price) || 0,
        qty: item.qty,
        note: item.note,
      })),
      subtotal: parseFloat(order.subtotal) || 0,
      deliveryFee: parseFloat(order.delivery_fee) || 0,
      discount: parseFloat(order.discount) || 0,
      total: parseFloat(order.total) || 0,
      restaurant: restaurant ? { name: restaurant.name, slug: restaurant.slug } : null,
    });
  }

  // Fall back to bookings table
  const { data: booking, error: bookingErr } = await admin
    .from('bookings')
    .select('status')
    .eq('id', orderId)
    .maybeSingle();

  if (bookingErr) {
    console.error('[order-status] bookings query error:', bookingErr.message);
  }

  if (booking) {
    return NextResponse.json({ status: booking.status, type: 'booking' });
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
