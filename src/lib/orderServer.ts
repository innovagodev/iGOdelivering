import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { toCents } from '@/lib/pricing';

/**
 * Parte server del checkout, condivisa da /api/orders e /api/bookings:
 * validazione delle righe del carrello e prezzatura con i dati del database.
 * Da importare solo in codice server: usa la service role key.
 */

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LINES = 100;
const MAX_QTY = 99;

export type Fail = { status: number; body: Record<string, unknown> };
export const fail = (status: number, error: string, message: string, extra = {}): Fail => ({
  status,
  body: { error, message, ...extra },
});

export const str = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

export interface LineInput {
  menuItemId: string;
  qty: number;
  added: { name: string; price: number }[];
  removed: string[];
  note: string;
}

export function parseLines(raw: unknown): LineInput[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_LINES) return null;
  const lines: LineInput[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') return null;
    const o = r as Record<string, unknown>;
    if (typeof o.menuItemId !== 'string' || !UUID_RE.test(o.menuItemId)) return null;
    if (!Number.isInteger(o.qty) || (o.qty as number) < 1 || (o.qty as number) > MAX_QTY) {
      return null;
    }
    const added = Array.isArray(o.added) ? o.added : [];
    const removed = Array.isArray(o.removed) ? o.removed : [];
    if (added.length > 30 || removed.length > 30) return null;
    if (!removed.every((x) => typeof x === 'string')) return null;
    const validAdded = added.every(
      (x) =>
        !!x &&
        typeof x === 'object' &&
        typeof (x as { name?: unknown }).name === 'string' &&
        Number.isFinite((x as { price?: unknown }).price)
    );
    if (!validAdded) return null;
    lines.push({
      menuItemId: o.menuItemId,
      qty: o.qty as number,
      added: added as { name: string; price: number }[],
      removed: (removed as string[]).map((x) => x.slice(0, 80)),
      note: str(o.note, 300),
    });
  }
  return lines;
}

export interface PricedLine {
  menu_item_id: string;
  name: string;
  unitCents: number;
  qty: number;
  note: string | null;
  added_ingredients: { name: string; price: number }[];
  removed_ingredients: string[];
}

/**
 * Prezzi ammessi per ogni opzione di un piatto, in centesimi, dagli
 * `option_groups` configurati dal ristoratore nel wizard. La stessa opzione
 * può comparire in più gruppi con prezzi diversi: per questo un nome mappa su
 * un insieme di prezzi. `defaultOption` di un gruppo vale 0 (è la scelta
 * preselezionata che la vetrina aggiunge al carrello, es. "Impasto classico").
 */
function optionPrices(optionGroups: unknown): Map<string, Set<number>> {
  const prices = new Map<string, Set<number>>();
  const add = (name: unknown, cents: number) => {
    if (typeof name !== 'string' || !name) return;
    if (!prices.has(name)) prices.set(name, new Set());
    prices.get(name)!.add(cents);
  };
  if (!Array.isArray(optionGroups)) return prices;
  for (const g of optionGroups) {
    if (!g || typeof g !== 'object') continue;
    add(g.defaultOption, 0);
    for (const c of Array.isArray(g.choices) ? g.choices : []) {
      add(c?.name, toCents(Number(c?.price) || 0));
    }
  }
  return prices;
}

/**
 * Prezza le righe con i dati del database. Condivisa con /api/bookings, che
 * registra il pre-ordine di una prenotazione con gli stessi prezzi.
 *
 * Il prezzo di un'aggiunta inviato dal client serve solo a scegliere fra due
 * opzioni omonime: è accettato se coincide con uno dei prezzi configurati per
 * quel nome su quel piatto, altrimenti la riga è rifiutata. In nessun caso un
 * valore del client entra nel totale se non è già un prezzo del menu.
 */
export async function priceLines(
  admin: SupabaseClient,
  restaurantId: string,
  lines: LineInput[]
): Promise<{ lines: PricedLine[]; itemsCents: number } | Fail> {
  const ids = [...new Set(lines.map((l) => l.menuItemId))];
  const { data: items, error } = await admin
    .from('menu_items')
    .select('id, name, price, option_groups, available, customization_enabled')
    .eq('restaurant_id', restaurantId)
    .in('id', ids);

  if (error) {
    console.error('[orders] menu_items query error:', error.message);
    return fail(500, 'server_error', 'Impossibile completare l’ordine, riprova.');
  }

  const byId = new Map((items || []).map((i) => [i.id as string, i]));
  const priced: PricedLine[] = [];
  let itemsCents = 0;

  for (const l of lines) {
    const item = byId.get(l.menuItemId);
    // Un piatto di un altro locale non compare nella select filtrata per
    // restaurant_id: per il cliente è indistinguibile da uno rimosso.
    if (!item || item.available === false) {
      return fail(
        409,
        'item_unavailable',
        'Uno dei piatti nel carrello non è più disponibile. Ricarica il menu e riprova.'
      );
    }

    const allowed = optionPrices(item.option_groups);
    const added: { name: string; price: number }[] = [];
    let unitCents = toCents(Number(item.price));
    for (const a of l.added) {
      const cents = toCents(a.price);
      if (item.customization_enabled === false || !allowed.get(a.name)?.has(cents)) {
        return fail(
          409,
          'price_changed',
          'Le opzioni di un piatto sono cambiate. Ricarica il menu e riprova.'
        );
      }
      added.push({ name: a.name, price: cents / 100 });
      unitCents += cents;
    }

    itemsCents += unitCents * l.qty;
    priced.push({
      menu_item_id: item.id as string,
      name: item.name as string,
      unitCents,
      qty: l.qty,
      note: l.note || null,
      added_ingredients: added,
      removed_ingredients: l.removed,
    });
  }

  return { lines: priced, itemsCents };
}

export function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export const isFail = (x: unknown): x is Fail =>
  !!x && typeof x === 'object' && 'status' in x && 'body' in x;

/**
 * IP del cliente. Su Vercel `x-real-ip` e il primo elemento di
 * `x-forwarded-for` sono impostati dalla piattaforma e non dal browser.
 */
export function clientIp(request: Request): string {
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return 'unknown';
}

export interface RateRule {
  key: string;
  limit: number;
  windowSeconds: number;
}

/**
 * Applica una o più regole di rate limit (rilievo M4, migration 021).
 *
 * Fail open: se il contatore non risponde la richiesta passa e l'errore va
 * nei log. Un guasto del rate limit non deve impedire ai clienti di ordinare;
 * il prezzo è che, finché dura il guasto, il limite non c'è.
 */
export async function rateLimited(admin: SupabaseClient, rules: RateRule[]): Promise<Fail | null> {
  for (const r of rules) {
    const { data, error } = await admin.rpc('check_rate_limit', {
      p_key: r.key,
      p_limit: r.limit,
      p_window_seconds: r.windowSeconds,
    });
    if (error) {
      console.error('[rate-limit] check_rate_limit error:', error.message);
      return null;
    }
    if (data === false) {
      return fail(
        429,
        'rate_limited',
        'Troppe richieste in poco tempo da questa connessione. Riprova tra qualche minuto.'
      );
    }
  }
  return null;
}
