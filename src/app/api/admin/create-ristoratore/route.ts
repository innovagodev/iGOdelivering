import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { slugify } from '@/lib/restaurant-utils';

export async function POST(request: Request) {
  try {
    const { name, email, restaurantName, password } = await request.json();

    if (!name || !email || !restaurantName || !password) {
      return NextResponse.json({ error: 'Tutti i campi sono obbligatori' }, { status: 400 });
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

    // 3. Create Auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (authError || !authUser.user) {
      return NextResponse.json(
        { error: authError?.message || 'Errore creazione utente auth' },
        { status: 400 }
      );
    }

    // 4. Create profile entry
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: authUser.user.id,
      role: 'ristoratore',
      name,
    });

    if (profileError) {
      // Clean up user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json(
        { error: profileError.message || 'Errore creazione profilo' },
        { status: 400 }
      );
    }

    // 5. Create restaurant entry
    // Generate clean unique slug
    const baseSlug = slugify(restaurantName);
    let slug = baseSlug;
    let counter = 1;

    // Check slug uniqueness
    while (true) {
      const { data: existing } = await supabaseAdmin
        .from('restaurants')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const { data: restaurant, error: restError } = await supabaseAdmin
      .from('restaurants')
      .insert({
        owner_id: authUser.user.id,
        name: restaurantName,
        slug,
        email,
        status: 'published',
      })
      .select()
      .single();

    if (restError) {
      // Clean up profile and user
      await supabaseAdmin.from('profiles').delete().eq('id', authUser.user.id);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json(
        { error: restError.message || 'Errore creazione ristorante' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authUser.user.id,
        name,
        email,
        restaurantName: restaurant.name,
        restaurantId: restaurant.id,
        slug: restaurant.slug,
      },
    });
  } catch (err: any) {
    console.error('Error in create-ristoratore API:', err);
    return NextResponse.json(
      { error: err.message || 'Errore interno del server' },
      { status: 500 }
    );
  }
}
