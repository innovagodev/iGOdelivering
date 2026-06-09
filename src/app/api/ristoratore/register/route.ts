import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { name, email, password, restaurantId } = await request.json();

    if (!name || !email || !password || !restaurantId) {
      return NextResponse.json({ error: 'Tutti i campi sono obbligatori' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Configurazione server mancante (SUPABASE_SERVICE_ROLE_KEY)' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Verify restaurant existence and claim status
    const { data: restaurant, error: restError } = await supabaseAdmin
      .from('restaurants')
      .select('id, email, owner_id')
      .eq('id', restaurantId)
      .maybeSingle();

    if (restError || !restaurant) {
      return NextResponse.json({ error: 'Ristorante non trovato' }, { status: 404 });
    }

    if (restaurant.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: "L'email inserita non coincide con quella registrata per questo ristorante" }, { status: 400 });
    }

    if (restaurant.owner_id) {
      return NextResponse.json({ error: 'Questo ristorante ha già un proprietario registrato' }, { status: 400 });
    }

    // 2. Create Auth User
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (authError || !authUser.user) {
      return NextResponse.json({ error: authError?.message || 'Impossibile creare l\'utente in Auth' }, { status: 400 });
    }

    const userId = authUser.user.id;

    // 3. Create profile entry
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        role: 'ristoratore',
        name,
        email,
      });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message || 'Impossibile creare il profilo' }, { status: 400 });
    }

    // 4. Update owner_id in restaurants
    const { error: linkError } = await supabaseAdmin
      .from('restaurants')
      .update({ owner_id: userId })
      .eq('id', restaurantId);

    if (linkError) {
      await supabaseAdmin.from('profiles').delete().eq('id', userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: linkError.message || 'Impossibile associare il proprietario al ristorante' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in register-ristoratore API:', err);
    return NextResponse.json({ error: err.message || 'Errore interno del server' }, { status: 500 });
  }
}
