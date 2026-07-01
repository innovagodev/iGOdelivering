import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/order-status/[orderId]
 *
 * Reads the status of an order (or booking) using the Supabase service role key
 * so that Row Level Security is bypassed completely. This ensures the customer-
 * facing order tracker can always poll for live status updates, regardless of
 * the RLS policy configured on the orders / bookings tables.
 *
 * The order UUID is unguessable (128-bit random), so no additional auth is
 * required - knowing the ID is proof enough that you placed the order.
 *
 * Response: { status: string; type: 'order' | 'booking' }
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await context.params;

  if (!orderId || orderId.trim() === '') {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
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
    .select('status')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr) {
    console.error('[order-status] orders query error:', orderErr.message);
  }

  if (order) {
    return NextResponse.json({ status: order.status, type: 'order' });
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