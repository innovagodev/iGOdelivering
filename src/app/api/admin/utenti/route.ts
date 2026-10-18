import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { fetchAllPages } from '@/lib/fetchAll';
import { isCountedOrder } from '@/lib/dashboardStats';
import { effectiveStatus } from '@/lib/orderStatus';
import type { AdminUserRow } from '@/lib/adminUsers';

/** Finestra su cui si guardano gli ordini: oltre, "nessun ordine" vale come "inattivo". */
const ORDERS_WINDOW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * GET /api/admin/utenti
 *
 * Elenco dei ristoratori per il pannello admin, con stato dell'account,
 * ultimo accesso e attività degli ordini.
 *
 * L'elenco parte dai ristoranti e non solo dai profili: il profilo nasce quando
 * il titolare imposta la password, quindi chi è stato invitato e non ha ancora
 * attivato l'account non comparirebbe da nessuna parte.
 *
 * Serve la service role key (token di attivazione e `last_sign_in_at` non sono
 * leggibili dal browser): la route è riservata agli admin autenticati.
 * `last_sign_in_at` si aggiorna a ogni login con password, non quando una
 * sessione già aperta viene rinnovata: per l'attività reale c'è l'ultimo ordine.
 */
export async function GET() {
  try {
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

    const { data: me } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!me || me.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey || serviceRoleKey === 'YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE') {
      return NextResponse.json(
        { error: 'Configurazione server mancante (SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 }
      );
    }

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const now = Date.now();
    const since = new Date(now - ORDERS_WINDOW_DAYS * DAY_MS).toISOString();

    const [profiles, restaurants, tokens, orders, lastSignIn] = await Promise.all([
      fetchAllPages((from, to) =>
        admin
          .from('profiles')
          .select('id, name, email')
          .eq('role', 'ristoratore')
          .order('id')
          .range(from, to)
      ),
      fetchAllPages((from, to) =>
        admin
          .from('restaurants')
          .select('id, name, slug, email, status, owner_id, created_at')
          .order('created_at')
          .order('id')
          .range(from, to)
      ),
      fetchAllPages((from, to) =>
        admin
          .from('restaurant_activation_tokens')
          .select('restaurant_id, expires_at')
          .order('restaurant_id')
          .range(from, to)
      ),
      fetchAllPages((from, to) =>
        admin
          .from('orders')
          .select('restaurant_id, status, payment_status, accept_deadline, scheduled_at, created_at')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .order('id')
          .range(from, to)
      ),
      readLastSignIn(admin),
    ]);

    // Ordini conteggiabili per ristorante: stesso criterio di dashboard e storico
    // (stato effettivo, niente annullati/rifiutati/scaduti né online mai pagati).
    const stats = new Map<string, { lastAt: string | null; count30: number }>();
    const since30 = now - 30 * DAY_MS;
    for (const o of orders as any[]) {
      if (!o.created_at) continue;
      if (!isCountedOrder({ status: effectiveStatus(o, now), payment_status: o.payment_status })) {
        continue;
      }
      const s = stats.get(o.restaurant_id) ?? { lastAt: null, count30: 0 };
      if (!s.lastAt || o.created_at > s.lastAt) s.lastAt = o.created_at;
      if (new Date(o.created_at).getTime() >= since30) s.count30++;
      stats.set(o.restaurant_id, s);
    }

    const statsOf = (restaurantIds: string[]) => {
      let lastAt: string | null = null;
      let count30 = 0;
      for (const id of restaurantIds) {
        const s = stats.get(id);
        if (!s) continue;
        if (s.lastAt && (!lastAt || s.lastAt > lastAt)) lastAt = s.lastAt;
        count30 += s.count30;
      }
      return { lastAt, count30 };
    };

    const restaurantsByOwner = new Map<string, any[]>();
    for (const r of restaurants as any[]) {
      if (!r.owner_id) continue;
      const list = restaurantsByOwner.get(r.owner_id) ?? [];
      list.push(r);
      restaurantsByOwner.set(r.owner_id, list);
    }

    const rows: AdminUserRow[] = [];

    // 1. Titolari che hanno già attivato l'account.
    for (const p of profiles as any[]) {
      const owned = restaurantsByOwner.get(p.id) ?? [];
      const first = owned[0];
      const { lastAt, count30 } = statsOf(owned.map((r) => r.id));
      rows.push({
        id: p.id,
        userId: p.id,
        name: p.name || 'Gestore',
        email: p.email || first?.email || '',
        restaurantId: first?.id ?? null,
        restaurantName: first?.name || 'Nessun ristorante',
        slug: first?.slug ?? null,
        account:
          first?.status === 'suspended'
            ? 'suspended'
            : first?.status === 'published'
              ? 'active'
              : 'pending',
        lastLogin: lastSignIn.get(p.id) ?? null,
        lastOrderAt: lastAt,
        orders30: count30,
      });
    }

    // 2. Ristoranti pubblicati senza titolare: invito inviato ma non ancora usato.
    const tokenExpiry = new Map<string, string>(
      (tokens as any[]).map((t) => [t.restaurant_id, t.expires_at])
    );
    for (const r of restaurants as any[]) {
      if (r.owner_id || r.status !== 'published') continue;
      const expiresAt = tokenExpiry.get(r.id);
      const valid = !!expiresAt && new Date(expiresAt).getTime() > now;
      rows.push({
        id: r.id,
        userId: null,
        name: '—',
        email: r.email || '',
        restaurantId: r.id,
        restaurantName: r.name,
        slug: r.slug ?? null,
        account: valid ? 'invited' : 'invite_expired',
        lastLogin: null,
        lastOrderAt: null,
        orders30: 0,
      });
    }

    return NextResponse.json({ users: rows }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    console.error('Error in admin/utenti API:', err);
    return NextResponse.json(
      { error: err.message || 'Errore interno del server' },
      { status: 500 }
    );
  }
}

/** `last_sign_in_at` di tutti gli utenti Auth (listUsers è paginato). */
async function readLastSignIn(admin: SupabaseClient) {
  const PER_PAGE = 1000;
  const map = new Map<string, string | null>();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw new Error(`listUsers: ${error.message}`);
    for (const u of data.users) map.set(u.id, u.last_sign_in_at ?? null);
    if (data.users.length < PER_PAGE) break;
  }
  return map;
}
