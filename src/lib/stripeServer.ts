import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { adminClient } from '@/lib/orderServer';

/**
 * Parte server dell'integrazione Stripe Connect (piano pagamenti, fase 2).
 * Da importare solo in codice server: usa la chiave segreta di Stripe e la
 * service role key di Supabase.
 *
 * MODELLO. Ogni ristorante incassa sul PROPRIO account Stripe: account creati
 * con l'API Accounts v2, dashboard Stripe completa, commissioni e perdite a
 * carico di Stripe e del ristorante, nessuna commissione per la piattaforma.
 * Lo stato del collegamento si legge con l'API v1 (charges_enabled, …), che è
 * compatibile con gli account v2 e restituisce esattamente quello che serve.
 *
 * Le colonne stripe_* di `restaurants` le scrive solo il server: un trigger
 * (migration 028–029) rifiuta le modifiche fatte dal browser.
 */

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeSingleton) stripeSingleton = new Stripe(key);
  return stripeSingleton;
}

export const siteUrl = (request: Request) =>
  process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

// ─── Stato del collegamento ─────────────────────────────────────────────────

export type StripeConnectionState =
  | 'not_connected' // nessun account creato
  | 'onboarding' // account creato, procedura non completata
  | 'pending' // procedura completata, Stripe non ha ancora abilitato gli incassi
  | 'active'; // può ricevere pagamenti

export interface StripeConnectionStatus {
  state: StripeConnectionState;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  currentlyDue: string[];
  pastDue: string[];
  disabledReason: string | null;
  syncedAt: string | null;
}

export interface RestaurantStripeRow {
  id: string;
  stripe_account_id: string | null;
  stripe_connected: boolean | null;
  stripe_payouts_enabled: boolean | null;
  stripe_details_submitted: boolean | null;
  stripe_requirements: any;
  stripe_synced_at: string | null;
}

export const RESTAURANT_STRIPE_COLUMNS =
  'id, name, email, owner_id, vat_number, stripe_account_id, stripe_connected, stripe_payouts_enabled, stripe_details_submitted, stripe_requirements, stripe_synced_at';

export function statusFromRow(r: RestaurantStripeRow): StripeConnectionStatus {
  const req = r.stripe_requirements || {};
  const chargesEnabled = !!r.stripe_connected;
  const detailsSubmitted = !!r.stripe_details_submitted;
  return {
    state: !r.stripe_account_id
      ? 'not_connected'
      : chargesEnabled
        ? 'active'
        : detailsSubmitted
          ? 'pending'
          : 'onboarding',
    chargesEnabled,
    payoutsEnabled: !!r.stripe_payouts_enabled,
    detailsSubmitted,
    currentlyDue: Array.isArray(req.currently_due) ? req.currently_due : [],
    pastDue: Array.isArray(req.past_due) ? req.past_due : [],
    disabledReason: req.disabled_reason ?? null,
    syncedAt: r.stripe_synced_at,
  };
}

/**
 * Allinea le colonne stripe_* del ristorante allo stato reale dell'account su
 * Stripe. Legge sempre da Stripe invece di fidarsi del contenuto di un evento:
 * gli eventi possono arrivare fuori ordine, lo stato attuale no.
 */
export async function syncRestaurantStripe(
  stripe: Stripe,
  admin: SupabaseClient,
  restaurantId: string,
  accountId: string
): Promise<StripeConnectionStatus | { error: string }> {
  let account: Stripe.Account;
  try {
    account = await stripe.accounts.retrieve(accountId);
  } catch (e: any) {
    console.error('[stripe] lettura account fallita:', accountId, e?.message);
    return { error: 'Impossibile leggere lo stato dell’account Stripe.' };
  }

  const requirements = {
    currently_due: account.requirements?.currently_due ?? [],
    past_due: account.requirements?.past_due ?? [],
    eventually_due: account.requirements?.eventually_due ?? [],
    disabled_reason: account.requirements?.disabled_reason ?? null,
    current_deadline: account.requirements?.current_deadline ?? null,
  };

  // Scelte del titolare per servizio: il pagamento online si offre ai clienti
  // (stripe_enabled) appena l'account può incassare, secondo quelle scelte.
  // Prima dipendeva dal salvataggio del pannello: un titolare che tornava da
  // Stripe con l'account attivo e non premeva "Salva" non offriva mai il
  // pagamento online, pur vedendo gli interruttori accesi.
  const { data: prefs } = await admin
    .from('restaurants')
    .select('stripe_delivery, stripe_pickup')
    .eq('id', restaurantId)
    .maybeSingle();
  const offersOnline =
    !!account.charges_enabled &&
    (prefs?.stripe_delivery !== false || prefs?.stripe_pickup !== false);

  const { data, error } = await admin
    .from('restaurants')
    .update({
      stripe_enabled: offersOnline,
      stripe_connected: !!account.charges_enabled,
      stripe_payouts_enabled: !!account.payouts_enabled,
      stripe_details_submitted: !!account.details_submitted,
      stripe_requirements: requirements,
      stripe_synced_at: new Date().toISOString(),
    })
    .eq('id', restaurantId)
    .eq('stripe_account_id', accountId)
    .select(RESTAURANT_STRIPE_COLUMNS)
    .maybeSingle();

  if (error || !data) {
    console.error(
      '[stripe] aggiornamento ristorante fallito:',
      restaurantId,
      error?.message ?? 'nessuna riga'
    );
    return { error: 'Impossibile salvare lo stato del collegamento.' };
  }
  return statusFromRow(data as RestaurantStripeRow);
}

// ─── Autenticazione delle route ─────────────────────────────────────────────

export type AuthContext =
  | { ok: true; userId: string; role: 'admin' | 'ristoratore'; admin: SupabaseClient }
  | { ok: false; status: number; error: string };

/** Sessione dal cookie + ruolo letto dal database (come le route admin). */
export async function getAuthContext(): Promise<AuthContext> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const admin = adminClient();
  if (!url || !anonKey || !admin) {
    return { ok: false, status: 500, error: 'Configurazione server mancante' };
  }

  const cookieStore = await cookies();
  const supabaseServer = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'Non autorizzato' };

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || (profile.role !== 'admin' && profile.role !== 'ristoratore')) {
    return { ok: false, status: 403, error: 'Non autorizzato' };
  }
  return { ok: true, userId: user.id, role: profile.role, admin };
}

/**
 * Ristorante su cui opera la richiesta: per il ristoratore sempre e solo il
 * proprio (l'id eventualmente inviato viene ignorato); per l'admin quello
 * indicato nel body.
 */
export async function resolveRestaurant(
  ctx: Extract<AuthContext, { ok: true }>,
  requestedId: unknown
): Promise<{ ok: true; restaurant: any } | { ok: false; status: number; error: string }> {
  let query = ctx.admin.from('restaurants').select(RESTAURANT_STRIPE_COLUMNS);
  if (ctx.role === 'ristoratore') {
    query = query.eq('owner_id', ctx.userId);
  } else {
    if (typeof requestedId !== 'string' || !requestedId) {
      return { ok: false, status: 400, error: 'Ristorante non indicato' };
    }
    query = query.eq('id', requestedId);
  }
  // Un titolare con più locali è un caso non supportato (A2): si prende il
  // primo, come fa my_restaurant_id().
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) {
    console.error('[stripe] lettura ristorante fallita:', error.message);
    return { ok: false, status: 500, error: 'Errore interno' };
  }
  if (!data) return { ok: false, status: 404, error: 'Ristorante non trovato' };
  return { ok: true, restaurant: data };
}
