import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { issueActivationLink } from '@/lib/activationToken';

/**
 * POST /api/admin/activation-link  { restaurantId }
 *
 * Emette un nuovo link di attivazione per un ristorante e lo restituisce,
 * senza inviare alcuna email. Serve ai pulsanti "Copia link attivazione" del
 * pannello admin, che prima costruivano l'URL nel browser: ora il link contiene
 * un token che solo il server può generare e salvare.
 *
 * Riservata agli admin autenticati, come /api/admin/send-activation-email.
 *
 * ATTENZIONE: ogni chiamata ruota il token, quindi invalida i link emessi in
 * precedenza per lo stesso ristorante — inclusa un'eventuale email già inviata.
 */
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

    const {
      data: { user },
    } = await supabaseServer.auth.getUser();
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

    // 2. Service role client: activation_token non è accessibile con la chiave anon
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey || serviceRoleKey === 'YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE') {
      return NextResponse.json(
        { error: 'Configurazione server mancante (SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: restaurant, error: restError } = await supabaseAdmin
      .from('restaurants')
      .select('id, email, owner_id')
      .eq('id', restaurantId)
      .maybeSingle();

    if (restError || !restaurant) {
      return NextResponse.json({ error: 'Ristorante non trovato' }, { status: 404 });
    }

    if (!restaurant.email) {
      return NextResponse.json({ error: 'Ristorante senza email registrata' }, { status: 400 });
    }

    if (restaurant.owner_id) {
      return NextResponse.json(
        { error: 'Questo ristorante ha già un proprietario registrato' },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const issued = await issueActivationLink(supabaseAdmin, restaurant, siteUrl);

    if ('error' in issued) {
      return NextResponse.json({ error: issued.error }, { status: 500 });
    }

    return NextResponse.json({
      activationLink: issued.activationLink,
      expiresAt: issued.expiresAt,
    });
  } catch (err: any) {
    console.error('Error in activation-link API:', err);
    return NextResponse.json(
      { error: err.message || 'Errore interno del server' },
      { status: 500 }
    );
  }
}
