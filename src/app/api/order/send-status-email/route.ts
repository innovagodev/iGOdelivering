import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: 'orderId e status sono obbligatori' }, { status: 400 });
    }

    // 1. Initialize Supabase Admin client
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey || serviceRoleKey === 'YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE') {
      return NextResponse.json(
        { error: 'Configurazione server mancante (SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 2. Fetch order details with nested items and restaurant info
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*), restaurants(name, slug)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });
    }

    // 3. Skip email if it is a table order
    if (order.type === 'tavolo' || order.customer_email === 'tavolo@internal.it' || !order.customer_email) {
      return NextResponse.json({ success: true, message: 'Invio email saltato per ordine al tavolo o email mancante' });
    }

    const customerEmail = order.customer_email;
    const customerName = order.customer_name || 'Cliente';
    const orderNumber = order.order_number;
    const total = parseFloat(order.total) || 0;
    const type = order.type; // 'domicilio' or 'asporto'
    const scheduledAt = order.scheduled_at;
    const restaurantName = order.restaurants?.name || 'iGOdelivering';
    const restaurantSlug = order.restaurants?.slug || '';

    // Parse items for display
    const items = (order.order_items || []).map((item: any) => {
      const added = item.added_ingredients?.length > 0 ? ` (+${item.added_ingredients.join(', ')})` : '';
      const removed = item.removed_ingredients?.length > 0 ? ` (-${item.removed_ingredients.join(', ')})` : '';
      const notes = item.note ? ` (Nota: ${item.note})` : '';
      return `- ${item.qty}x ${item.name}${added}${removed}${notes} - € ${(parseFloat(item.price) * item.qty).toFixed(2)}`;
    }).join('<br/>');

    // Parse scheduled info in both languages
    let schedulingTextIt = 'Il prima possibile (ASAP)';
    let schedulingTextEn = 'As soon as possible (ASAP)';
    if (scheduledAt) {
      const d = new Date(scheduledAt);
      const formattedDate = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      schedulingTextIt = `Programmato per il ${formattedDate} alle ${hours}:${minutes}`;
      schedulingTextEn = `Scheduled for ${formattedDate} at ${hours}:${minutes}`;
    }

    const serviceIt = type === 'domicilio' ? 'Consegna a domicilio' : 'Asporto (Ritiro presso il locale)';
    const serviceEn = type === 'domicilio' ? 'Home Delivery' : 'Takeaway (Pickup at store)';

    // 4. Determine subject and html template based on status
    let subject = '';
    let emailHtml = '';

    const trackingUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://igodelivering.it'}/menu/${restaurantSlug}?orderId=${orderNumber}`;

    if (status === 'preparing') {
      subject = `Ordine Accettato - ${restaurantName} #${orderNumber}`;
      emailHtml = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #334155; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Heading -->
          <h2 style="color: #10b981; text-align: center; margin-top: 0; margin-bottom: 5px; font-size: 22px; font-weight: 800;">Ordine Accettato! / Order Accepted!</h2>
          <p style="text-align: center; color: #64748b; font-size: 14px; margin-top: 0; margin-bottom: 25px;">Ristorante / Restaurant: <strong>${restaurantName}</strong></p>

          <!-- GREETING SECTION -->
          <div style="margin-bottom: 25px; line-height: 1.6; font-size: 15px;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #0f172a;">Ciao ${customerName},</p>
            <p style="margin: 0; color: #475569;">Siamo felici di informarti che il ristorante ha accettato il tuo ordine ed è ora in preparazione!</p>
          </div>

          <!-- DIVIDER -->
          <div style="border-top: 1px dashed #e2e8f0; margin: 20px 0;"></div>

          <!-- ENGLISH GREETING -->
          <div style="margin-bottom: 25px; line-height: 1.6; font-size: 14px; color: #64748b; font-style: italic;">
            <p style="margin: 0 0 6px 0; font-weight: 600;">Hello ${customerName},</p>
            <p style="margin: 0;">We are happy to inform you that the restaurant has accepted your order and it is now in preparation!</p>
          </div>

          <!-- DETAILS CARD -->
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #e2e8f0;">
            <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Dettaglio dell'Ordine / Order Details #${orderNumber}</h3>
            
            <div style="font-size: 13px; margin-bottom: 15px; line-height: 1.7;">
              <p style="margin: 3px 0;"><strong>Servizio / Service:</strong> ${serviceIt} / <span style="color: #64748b; font-style: italic;">${serviceEn}</span></p>
              <p style="margin: 3px 0;"><strong>Orario / Time:</strong> ${schedulingTextIt} / <span style="color: #64748b; font-style: italic;">${schedulingTextEn}</span></p>
            </div>

            <p style="font-size: 13px; font-weight: bold; margin-bottom: 8px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">Articoli / Items:</p>
            <div style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 15px; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #edf2f7;">
              ${items}
            </div>

            <div style="font-size: 16px; font-weight: 800; margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 12px; color: #0f172a; display: flex; justify-content: space-between; align-items: center;">
              <span>Prezzo / Total Price:</span>
              <span style="color: #ef4444; font-size: 18px;">€ ${total.toFixed(2)}</span>
            </div>
          </div>

          <!-- TRACKING CTA -->
          <div style="text-align: center; margin-top: 30px; margin-bottom: 25px;">
            <a href="${trackingUrl}" style="background-color: #f97316; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(249, 115, 22, 0.2); font-size: 14px;">
              Traccia in Tempo Reale / Track Order Real-Time
            </a>
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 30px; margin-bottom: 20px;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.6;">
            Se hai domande sul tuo ordine, puoi contattare direttamente il locale. / If you have any questions about your order, please contact the restaurant directly.<br/>
            Grazie per aver acquistato tramite / Thank you for ordering via <strong>iGOdelivering</strong>.
          </p>
        </div>
      `;
    } else if (status === 'cancelled' || status === 'rejected') {
      subject = `Ordine Annullato - ${restaurantName} #${orderNumber}`;
      emailHtml = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #334155; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Heading -->
          <h2 style="color: #ef4444; text-align: center; margin-top: 0; margin-bottom: 5px; font-size: 22px; font-weight: 800;">Ordine Annullato / Order Cancelled</h2>
          <p style="text-align: center; color: #64748b; font-size: 14px; margin-top: 0; margin-bottom: 25px;">Ristorante / Restaurant: <strong>${restaurantName}</strong></p>

          <!-- GREETING SECTION -->
          <div style="margin-bottom: 25px; line-height: 1.6; font-size: 15px;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #0f172a;">Ciao ${customerName},</p>
            <p style="margin: 0; color: #475569;">Siamo spiacenti di informarti che il ristorante non ha potuto accettare il tuo ordine #${orderNumber} ed è stato annullato.</p>
          </div>

          <!-- DIVIDER -->
          <div style="border-top: 1px dashed #e2e8f0; margin: 20px 0;"></div>

          <!-- ENGLISH GREETING -->
          <div style="margin-bottom: 25px; line-height: 1.6; font-size: 14px; color: #64748b; font-style: italic;">
            <p style="margin: 0 0 6px 0; font-weight: 600;">Hello ${customerName},</p>
            <p style="margin: 0;">We are sorry to inform you that the restaurant could not accept your order #${orderNumber} and it has been cancelled.</p>
          </div>

          <!-- INFO CARD -->
          <div style="background-color: #fff5f5; border: 1px solid #fed7d7; padding: 18px; border-radius: 10px; margin: 25px 0; color: #9b2c2c; font-size: 13.5px; line-height: 1.6;">
            <p style="margin: 0 0 8px 0;"><strong>Nota del ristorante:</strong> Il locale ha annullato la richiesta. Se hai effettuato un pagamento online, l'importo ti verrà stornato/rimborsato. Per qualsiasi chiarimento puoi contattare direttamente il locale.</p>
            <p style="margin: 0; font-style: italic; color: #b45309; border-top: 1px dashed #feb2b2; padding-top: 8px; margin-top: 8px;"><strong>Restaurant note:</strong> The restaurant has cancelled the request. If you paid online, the amount will be reversed/refunded. For any questions, please contact the restaurant directly.</p>
          </div>

          <!-- DETAILS CARD -->
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #e2e8f0;">
            <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 15px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Riepilogo Ordine / Order Summary</h3>
            <div style="font-size: 13px; line-height: 1.6; color: #475569;">
              <p style="margin: 3px 0;"><strong>Servizio / Service:</strong> ${serviceIt} / <span style="color: #64748b; font-style: italic;">${serviceEn}</span></p>
              <p style="margin: 3px 0;"><strong>Orario programmato / Scheduled time:</strong> ${schedulingTextIt} / <span style="color: #64748b; font-style: italic;">${schedulingTextEn}</span></p>
              <p style="margin: 3px 0;"><strong>Importo totale / Total amount:</strong> € ${total.toFixed(2)}</p>
            </div>
          </div>

          <!-- BACK TO MENU CTA -->
          <div style="text-align: center; margin-top: 30px; margin-bottom: 25px;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://igodelivering.it'}/menu/${restaurantSlug}" style="background-color: #475569; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px;">
              Torna al Menu / Back to Menu
            </a>
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 30px; margin-bottom: 20px;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center;">
            Grazie per aver utilizzato / Thank you for using <strong>iGOdelivering</strong>.
          </p>
        </div>
      `;
    } else {
      return NextResponse.json({ success: true, message: 'Nessuna email prevista per questo cambio di stato' });
    }

    // 5. Send email via Resend (with local mock console fallback)
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM || 'iGOdelivering <noreply@igodelivering.it>';

    if (!resendApiKey || resendApiKey === 're_your_api_key_here') {
      console.log('[EMAIL ORDER STATUS MOCK FALLBACK] (RESEND_API_KEY non configurata)');
      console.log(`Da: ${resendFrom}`);
      console.log(`A: ${customerEmail}`);
      console.log(`Oggetto: ${subject}`);
      console.log(`Contenuto HTML (anteprima):\n`, emailHtml.substring(0, 300) + '...');
      return NextResponse.json({ success: true, mockSent: true });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: resendFrom,
        to: customerEmail,
        subject: subject,
        html: emailHtml,
      }),
    });

    const resData = await response.json();
    if (!response.ok) {
      console.error('Error dispatching status email via Resend:', resData);
      return NextResponse.json(
        { error: resData.message || "Errore durante l'invio dell'email via Resend" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: resData.id });
  } catch (err: any) {
    console.error('Error in send-status-email API:', err);
    return NextResponse.json(
      { error: err.message || 'Errore interno del server' },
      { status: 500 }
    );
  }
}
