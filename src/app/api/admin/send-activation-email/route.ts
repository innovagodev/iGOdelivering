import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { restaurantId } = await request.json();

    if (!restaurantId) {
      return NextResponse.json({ error: 'ID ristorante obbligatorio' }, { status: 400 });
    }

    // 1. Verify user is authorized admin
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

    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
    }

    // 2. Initialize admin client with Service Role Key to fetch restaurant info
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey || serviceRoleKey === 'YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE') {
      return NextResponse.json({ error: 'Configurazione server mancante (SUPABASE_SERVICE_ROLE_KEY)' }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Fetch restaurant details
    const { data: restaurant, error: restError } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, email, status')
      .eq('id', restaurantId)
      .single();

    if (restError || !restaurant) {
      return NextResponse.json({ error: 'Ristorante non trovato' }, { status: 404 });
    }

    if (!restaurant.email) {
      return NextResponse.json({ error: 'Ristorante senza email registrata' }, { status: 400 });
    }

    // 3. Generate secure activation link
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4028';
    const activationLink = `${siteUrl}/register?email=${encodeURIComponent(restaurant.email)}&restaurant_id=${restaurant.id}`;

    // 4. Create premium responsive HTML email body
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Benvenuto su iGOdelivering</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 0;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    }
    .header {
      background-color: #ea580c;
      padding: 30px 40px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px;
    }
    .content h2 {
      color: #0f172a;
      font-size: 20px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .content p {
      color: #334155;
      font-size: 15px;
      line-height: 1.6;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .btn-container {
      text-align: center;
      margin-bottom: 30px;
    }
    .btn-primary {
      display: inline-block;
      background-color: #ea580c;
      color: #ffffff !important;
      font-weight: bold;
      font-size: 14px;
      text-decoration: none;
      padding: 14px 30px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(234, 88, 12, 0.2);
    }
    .footer {
      background-color: #f1f5f9;
      padding: 24px 40px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }
    .footer p {
      color: #64748b;
      font-size: 12px;
      line-height: 1.5;
      margin: 0;
    }
    .footer a {
      color: #ea580c;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>iGOdelivering</h1>
      </div>
      <div class="content">
        <h2>Benvenuto, ${restaurant.name}!</h2>
        <p>
          Il tuo ristorante &egrave; stato pubblicato con successo sul nostro portale di food-delivering da parte dell'amministratore.
        </p>
        <p>
          Per iniziare a gestire il tuo menu, ricevere gli ordini in tempo reale e configurare le tue opzioni di consegna, clicca sul pulsante sottostante per completare la registrazione e impostare la tua password di sicurezza personale:
        </p>
        <div class="btn-container">
          <a href="${activationLink}" class="btn-primary" target="_blank">Imposta la tua Password</a>
        </div>
        <p style="margin-bottom: 0; font-size: 13px; color: #64748b;">
          Se il pulsante non funziona, copia e incolla il seguente link nel tuo browser:<br>
          <a href="${activationLink}" style="color: #ea580c; word-break: break-all;">${activationLink}</a>
        </p>
      </div>
      <div class="footer">
        <p>
          Questo messaggio &egrave; stato inviato a ${restaurant.email} per conto di <a href="${siteUrl}">iGOdelivering</a>.<br>
          Se ritieni che questo messaggio ti sia stato inviato per errore, ignora questa email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

    // 5. Send email via Resend (with local console logging fallback if API key is not configured)
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM || 'iGOdelivering <noreply@igodelivering.it>';

    if (!resendApiKey || resendApiKey === 're_your_api_key_here') {
      console.log('------------------------------------------------------------');
      console.log('[EMAIL DISPATCH - MOCK FALLBACK] (RESEND_API_KEY non configurata)');
      console.log(`A: ${restaurant.email}`);
      console.log(`Da: ${resendFrom}`);
      console.log(`Oggetto: Attivazione Ristorante - ${restaurant.name}`);
      console.log(`Link di Attivazione: ${activationLink}`);
      console.log('------------------------------------------------------------');

      return NextResponse.json({
        success: true,
        mocked: true,
        message: 'Mail registrata in console (fall back locale senza chiavi API)',
        activationLink,
      });
    }

    // Actual Resend HTTP request
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [restaurant.email],
        subject: `Attivazione Ristorante - ${restaurant.name}`,
        html: emailHtml,
      }),
    });

    const resData = await response.json();

    if (!response.ok) {
      console.error('Error dispatching via Resend:', resData);
      return NextResponse.json({
        error: resData.message || 'Errore durante l\'invio dell\'email via Resend',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      emailId: resData.id,
      activationLink,
    });
  } catch (err: any) {
    console.error('Error in send-activation-email API:', err);
    return NextResponse.json({ error: err.message || 'Errore interno del server' }, { status: 500 });
  }
}
