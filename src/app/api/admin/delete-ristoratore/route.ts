import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'ID Utente obbligatorio' }, { status: 400 });
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

    // 2. Initialize admin client with Service Role Key
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

    // 3. Clear owner_id on restaurants
    const { error: restError } = await supabaseAdmin
      .from('restaurants')
      .update({ owner_id: null })
      .eq('owner_id', userId);

    if (restError) {
      return NextResponse.json(
        { error: restError.message || 'Errore scollegamento ristorante' },
        { status: 400 }
      );
    }

    // 4. Delete Auth User (profiles row deletes on cascade)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      return NextResponse.json(
        { error: authError.message || "Errore durante l'eliminazione dell'utente auth" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in delete-ristoratore API:', err);
    return NextResponse.json(
      { error: err.message || 'Errore interno del server' },
      { status: 500 }
    );
  }
}
