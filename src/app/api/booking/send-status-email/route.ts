import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * POST /api/booking/send-status-email  { bookingId, event }
 *
 * Avvisa il cliente, per email, che la sua prenotazione del tavolo è stata
 * `confirmed`, `modified` o `cancelled`. Non ci sono SMS: l'email è l'unico canale.
 *
 * - Solo tavolo: l'email riporta data, ora e coperti, senza link di tracking.
 * - Tavolo con pre-ordine: se alla conferma è nato un ordine (`linked_order_id`) l'email
 *   lo riepiloga e porta al tracker; un annullamento non ha mai il tracker.
 *
 * Come /api/order/send-status-email richiede una sessione ristoratore o admin e, per il
 * ristoratore, che la prenotazione sia del proprio locale. Chi scrive i testi nell'email
 * (nome, note) è il cliente: va sempre escapato.
 */

type Event = 'confirmed' | 'modified' | 'cancelled';

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const longDate = (date: string, locale: 'it-IT' | 'en-GB') =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Rome',
  });

export async function POST(request: Request) {
  try {
    const { bookingId, event } = (await request.json()) as { bookingId?: string; event?: Event };
    if (!bookingId || !['confirmed', 'modified', 'cancelled'].includes(String(event))) {
      return NextResponse.json({ error: 'bookingId ed event sono obbligatori' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey || serviceRoleKey === 'YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE') {
      return NextResponse.json({ error: 'Configurazione server mancante' }, { status: 500 });
    }
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const cookieStore = await cookies();
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

    const { data: profile } = await supabaseServer.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || (profile.role !== 'ristoratore' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
    }

    const { data: booking, error } = await admin
      .from('bookings')
      .select('*, restaurants(name, slug, owner_id, phone)')
      .eq('id', bookingId)
      .maybeSingle();
    if (error || !booking) return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 });

    const restaurant = (Array.isArray(booking.restaurants) ? booking.restaurants[0] : booking.restaurants) as any;
    if (profile.role === 'ristoratore' && (!restaurant?.owner_id || restaurant.owner_id !== user.id)) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
    }

    if (!booking.email) {
      return NextResponse.json({ success: true, skipped: 'no_email' });
    }

    const restaurantName = esc(restaurant?.name || 'iGOdelivering');
    const restaurantPhone = esc(restaurant?.phone || '');
    const customerName = esc(booking.name || 'Cliente');
    const time = esc(String(booking.time || '').slice(0, 5));
    const guests = Number(booking.guests) || 0;
    const notes = booking.notes ? esc(booking.notes) : '';
    const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://igodelivering.it';

    // Pre-ordine: solo se la conferma ha generato un ordine. Mai su un annullamento.
    let orderBlock = '';
    let trackingUrl = '';
    if (event !== 'cancelled' && booking.linked_order_id) {
      const { data: order } = await admin
        .from('orders')
        .select('id, order_number, total, order_items(name, price, qty, note)')
        .eq('id', booking.linked_order_id)
        .maybeSingle();
      if (order) {
        const lines = (order.order_items || [])
          .map(
            (i: any) =>
              `- ${Number(i.qty)}x ${esc(i.name)}${i.note ? ` (${esc(i.note)})` : ''} - € ${(
                Number(i.price) * Number(i.qty)
              ).toFixed(2)}`
          )
          .join('<br/>');
        trackingUrl = `${site}/ordine/tracking?id=${encodeURIComponent(order.id)}`;
        orderBlock = `
          <p style="font-size: 13px; font-weight: bold; margin: 16px 0 8px 0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">Il tuo ordine / Your order ${esc(order.order_number)}</p>
          <div style="font-size: 14px; color: #334155; line-height: 1.6; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #edf2f7;">
            ${lines}
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-weight: 800;">Totale / Total: € ${Number(order.total).toFixed(2)}</div>
          </div>`;
      }
    }

    const meta = {
      confirmed: {
        subject: `Prenotazione confermata - ${restaurant?.name || ''}`,
        color: '#10b981',
        title: 'Prenotazione confermata! / Booking confirmed!',
        it: 'Il ristorante ha confermato la tua prenotazione. Ti aspettiamo!',
        en: 'The restaurant has confirmed your booking. We look forward to seeing you!',
      },
      modified: {
        subject: `Prenotazione modificata - ${restaurant?.name || ''}`,
        color: '#f59e0b',
        title: 'Prenotazione modificata / Booking updated',
        it: 'Il ristorante ha modificato la tua prenotazione. Questi sono i nuovi dettagli.',
        en: 'The restaurant has updated your booking. These are the new details.',
      },
      cancelled: {
        subject: `Prenotazione annullata - ${restaurant?.name || ''}`,
        color: '#ef4444',
        title: 'Prenotazione annullata / Booking cancelled',
        it: 'Siamo spiacenti: il ristorante non ha potuto confermare la tua prenotazione, che risulta annullata.',
        en: 'We are sorry: the restaurant could not confirm your booking, which has been cancelled.',
      },
    }[event as Event];

    const details = `
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #e2e8f0;">
        <div style="font-size: 14px; line-height: 1.8; color: #334155;">
          <p style="margin: 3px 0;"><strong>Giorno / Day:</strong> ${esc(longDate(booking.date, 'it-IT'))}<br/><span style="color: #64748b; font-style: italic;">${esc(longDate(booking.date, 'en-GB'))}</span></p>
          <p style="margin: 3px 0;"><strong>Ora / Time:</strong> ${time}</p>
          <p style="margin: 3px 0;"><strong>Persone / Guests:</strong> ${guests}</p>
          <p style="margin: 3px 0;"><strong>Nome / Name:</strong> ${customerName}</p>
          ${notes ? `<p style="margin: 3px 0;"><strong>Note:</strong> ${notes}</p>` : ''}
        </div>
        ${event === 'cancelled' ? '' : orderBlock}
      </div>`;

    const cta = trackingUrl
      ? `<a href="${trackingUrl}" style="background-color: #f97316; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px;">Segui il tuo ordine / Track your order</a>`
      : event === 'cancelled'
        ? `<a href="${site}/menu/${encodeURIComponent(restaurant?.slug || '')}" style="background-color: #475569; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px;">Prenota di nuovo / Book again</a>`
        : '';

    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #334155;">
        <h2 style="color: ${meta.color}; text-align: center; margin-top: 0; margin-bottom: 5px; font-size: 22px; font-weight: 800;">${meta.title}</h2>
        <p style="text-align: center; color: #64748b; font-size: 14px; margin-top: 0; margin-bottom: 25px;">Ristorante / Restaurant: <strong>${restaurantName}</strong></p>
        <div style="margin-bottom: 10px; line-height: 1.6; font-size: 15px;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #0f172a;">Ciao ${customerName},</p>
          <p style="margin: 0; color: #475569;">${meta.it}</p>
        </div>
        <div style="margin-bottom: 10px; line-height: 1.6; font-size: 14px; color: #64748b; font-style: italic;">
          <p style="margin: 0;">${meta.en}</p>
        </div>
        ${details}
        ${cta ? `<div style="text-align: center; margin: 25px 0;">${cta}</div>` : ''}
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0 15px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.6;">
          ${restaurantPhone ? `Per modificare o chiedere informazioni chiama il locale: <strong>${restaurantPhone}</strong>. / To change or ask for information call the restaurant: <strong>${restaurantPhone}</strong>.<br/>` : 'Per qualsiasi informazione contatta direttamente il locale. / For any information please contact the restaurant directly.<br/>'}
          Grazie per aver utilizzato / Thank you for using <strong>iGOdelivering</strong>.
        </p>
      </div>`;

    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM || 'iGOdelivering <noreply@igodelivering.it>';
    if (!resendApiKey || resendApiKey === 're_your_api_key_here') {
      console.log('[EMAIL BOOKING STATUS MOCK FALLBACK] (RESEND_API_KEY non configurata)');
      console.log(`A: ${booking.email} | Oggetto: ${meta.subject}`);
      return NextResponse.json({ success: true, mockSent: true });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` },
      body: JSON.stringify({ from: resendFrom, to: booking.email, subject: meta.subject, html }),
    });
    const resData = await response.json();
    if (!response.ok) {
      console.error('Error dispatching booking email via Resend:', resData);
      return NextResponse.json({ error: resData.message || "Errore durante l'invio dell'email" }, { status: 500 });
    }
    return NextResponse.json({ success: true, id: resData.id });
  } catch (err: any) {
    console.error('Error in booking send-status-email API:', err);
    return NextResponse.json({ error: err.message || 'Errore interno del server' }, { status: 500 });
  }
}
