import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { userId, name, email, password } = await request.json();

    if (!userId || !name || !email) {
      return NextResponse.json({ error: 'Nome ed Email sono obbligatori' }, { status: 400 });
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

    // 3. Update Auth User
    const updatePayload: any = {
      email,
      user_metadata: { name },
    };
    if (password) {
      updatePayload.password = password;
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload);

    if (authError) {
      return NextResponse.json(
        { error: authError.message || "Errore durante l'aggiornamento in Auth" },
        { status: 400 }
      );
    }

    // 4. Update Profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ name, email })
      .eq('id', userId);

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message || "Errore durante l'aggiornamento del profilo" },
        { status: 400 }
      );
    }

    // 5. Update Restaurant Email (if linked as owner)
    await supabaseAdmin
      .from('restaurants')
      .update({ email })
      .eq('owner_id', userId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in update-ristoratore API:', err);
    return NextResponse.json(
      { error: err.message || 'Errore interno del server' },
      { status: 500 }
    );
  }
}
