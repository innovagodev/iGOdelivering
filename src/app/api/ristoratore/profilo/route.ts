import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/stripeServer';
import { rateLimited } from '@/lib/orderServer';
import {
  normalizeFacebook,
  normalizeInstagram,
  normalizePhone,
  normalizeWebsite,
  normalizeWhatsapp,
} from '@/lib/contacts';

/**
 * PATCH /api/ristoratore/profilo
 *
 * Il ristoratore modifica il profilo pubblico del proprio ristorante: immagini,
 * descrizione, contatti, indirizzo, nome e categoria.
 *
 * Perché una route e non una scrittura dal browser: la policy "owner write" di
 * `restaurants` lascia al titolare scrivere ogni colonna della propria riga,
 * compresi lo stato di pubblicazione e l'indirizzo web della vetrina. Qui si
 * accetta solo un elenco chiuso di campi, ciascuno validato; slug, email,
 * partita IVA, stato, proprietario e piano restano all'admin (e il trigger
 * guard_restaurant_identity, migration 040, li protegge anche dal browser).
 *
 * Gli indirizzi di logo e sfondo devono puntare alla cartella DEL PROPRIO
 * ristorante nel nostro storage: nessun collegamento esterno finisce in
 * vetrina.
 *
 * Il corpo contiene solo i campi da cambiare. Risposta di errore di validazione:
 *   { error: 'invalid', message, fields: { <campo>: <messaggio> } }
 */

const IMAGE_BUCKETS = {
  logoUrl: { bucket: 'restaurant-logos', column: 'logo_url' },
  backgroundUrl: { bucket: 'restaurant-banners', column: 'background_url' },
} as const;

type ImageKey = keyof typeof IMAGE_BUCKETS;

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Percorso nel bucket, se l'URL è un oggetto pubblico di questo ristorante. */
function ownObjectPath(url: unknown, bucket: string, restaurantId: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (typeof url !== 'string' || !base) return null;
  const prefix = `${base.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${restaurantId}/`;
  if (!url.startsWith(prefix)) return null;
  const rest = url.slice(prefix.length);
  // Nessun salto di cartella, nessuna query: un solo nome di file.
  if (!rest || /[/?#\\]|\.\./.test(rest)) return null;
  try {
    const name = decodeURIComponent(rest);
    return /[/\\]|\.\./.test(name) ? null : `${restaurantId}/${name}`;
  } catch {
    return null;
  }
}

export async function PATCH(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (ctx.role !== 'ristoratore') {
    return NextResponse.json({ error: 'Solo il ristoratore modifica il proprio profilo.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const { admin } = ctx;

  // Un titolare con più locali è un caso non supportato (A2): il primo.
  const { data: restaurant, error: rErr } = await admin
    .from('restaurants')
    .select('id, logo_url, background_url')
    .eq('owner_id', ctx.userId)
    .limit(1)
    .maybeSingle();
  if (rErr) {
    console.error('[profilo] lettura ristorante fallita:', rErr.message);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
  if (!restaurant) return NextResponse.json({ error: 'Ristorante non trovato' }, { status: 404 });

  const limited = await rateLimited(admin, [
    { key: `profile:${ctx.userId}`, limit: 40, windowSeconds: 600 },
  ]);
  if (limited) return NextResponse.json(limited.body, { status: limited.status });

  const patch: Record<string, unknown> = {};
  const fields: Record<string, string> = {};
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

  // ─── Testi e dati dell'attività ─────────────────────────────────────────
  if (has('name')) {
    const v = text(body.name);
    if (!v) fields.name = 'Il nome è obbligatorio.';
    else if (v.length > 120) fields.name = 'Il nome è troppo lungo (massimo 120 caratteri).';
    else patch.name = v;
  }
  if (has('category')) {
    const v = text(body.category);
    if (v.length > 60) fields.category = 'La categoria è troppo lunga (massimo 60 caratteri).';
    else patch.category = v || null;
  }
  if (has('description')) {
    const v = text(body.description);
    if (v.length > 300) fields.description = 'La descrizione è troppo lunga (massimo 300 caratteri).';
    else patch.description = v || null;
  }
  if (has('descriptionEn')) {
    const v = text(body.descriptionEn);
    if (v.length > 300) fields.descriptionEn = 'La descrizione inglese è troppo lunga (massimo 300 caratteri).';
    else patch.description_en = v || null;
  }

  // ─── Indirizzo ──────────────────────────────────────────────────────────
  if (has('address')) {
    const v = text(body.address);
    if (!v) fields.address = 'L’indirizzo è obbligatorio.';
    else if (v.length > 200) fields.address = 'L’indirizzo è troppo lungo.';
    else patch.address = v;
  }
  if (has('city')) {
    const v = text(body.city);
    if (!v) fields.city = 'La città è obbligatoria.';
    else if (v.length > 100) fields.city = 'Il nome della città è troppo lungo.';
    else patch.city = v;
  }
  if (has('province')) {
    const v = text(body.province).toUpperCase();
    if (v && !/^[A-Z]{2,3}$/.test(v)) fields.province = 'La provincia va scritta con la sigla (per esempio RG).';
    else patch.province = v || null;
  }
  if (has('cap')) {
    const v = text(body.cap);
    if (v && !/^\d{5}$/.test(v)) fields.cap = 'Il CAP è di 5 cifre.';
    else patch.cap = v || null;
  }

  // ─── Contatti pubblici ──────────────────────────────────────────────────
  if (has('phone')) {
    const v = normalizePhone(body.phone);
    if (v === null) fields.phone = 'Il telefono è obbligatorio.';
    else if (v === undefined) fields.phone = 'Telefono non valido: usa solo cifre, per esempio 0932 123456.';
    else patch.phone = v;
  }
  if (has('whatsapp')) {
    const v = normalizeWhatsapp(body.whatsapp);
    if (v === undefined) fields.whatsapp = 'Numero WhatsApp non valido: scrivilo con il prefisso, per esempio +39 333 1234567.';
    else patch.whatsapp = v;
  }
  if (has('website')) {
    const v = normalizeWebsite(body.website);
    if (v === undefined) fields.website = 'Sito web non valido: usa un indirizzo come www.tuosito.it.';
    else patch.website = v;
  }
  if (has('instagram')) {
    const v = normalizeInstagram(body.instagram);
    if (v === undefined) fields.instagram = 'Profilo Instagram non valido: scrivi @nomeprofilo oppure il link del profilo.';
    else patch.instagram = v;
  }
  if (has('facebook')) {
    const v = normalizeFacebook(body.facebook);
    if (v === undefined) fields.facebook = 'Pagina Facebook non valida: scrivi il nome della pagina oppure il link.';
    else patch.facebook = v;
  }

  // ─── Immagini: solo oggetti del proprio ristorante, oppure null per toglierle ──
  const replaced: { bucket: string; path: string }[] = [];
  (Object.keys(IMAGE_BUCKETS) as ImageKey[]).forEach((key) => {
    if (!has(key)) return;
    const { bucket, column } = IMAGE_BUCKETS[key];
    const value = body[key];
    const oldUrl = (restaurant as Record<string, unknown>)[column];
    if (value === null || value === '') {
      patch[column] = null;
    } else if (ownObjectPath(value, bucket, restaurant.id)) {
      patch[column] = value;
    } else {
      fields[key] = 'Immagine non valida: va caricata dalla pagina del profilo.';
      return;
    }
    if (oldUrl && oldUrl !== patch[column]) {
      const oldPath = ownObjectPath(oldUrl, bucket, restaurant.id);
      if (oldPath) replaced.push({ bucket, path: oldPath });
    }
  });

  if (Object.keys(fields).length > 0) {
    return NextResponse.json(
      { error: 'invalid', message: 'Controlla i campi evidenziati.', fields },
      { status: 400 }
    );
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  // .select('id'): una scrittura che non cambia nulla non deve sembrare riuscita.
  const { data: updated, error: uErr } = await admin
    .from('restaurants')
    .update(patch)
    .eq('id', restaurant.id)
    .select('id');
  if (uErr || !updated || updated.length === 0) {
    console.error('[profilo] aggiornamento fallito:', uErr?.message ?? 'nessuna riga');
    return NextResponse.json(
      { error: 'save_failed', message: 'Non è stato possibile salvare le modifiche. Riprova.' },
      { status: 500 }
    );
  }

  // Una categoria nuova entra nell'elenco, come fa l'admin (23505 = già presente).
  if (typeof patch.category === 'string' && patch.category) {
    const { error: cErr } = await admin.from('restaurant_categories').insert({ name: patch.category });
    if (cErr && cErr.code !== '23505') console.warn('[profilo] categoria non aggiunta:', cErr.message);
  }

  // Le immagini sostituite si cancellano: restano nello storage solo quelle in uso.
  for (const r of replaced) {
    const { error: dErr } = await admin.storage.from(r.bucket).remove([r.path]);
    if (dErr) console.warn('[profilo] immagine precedente non rimossa:', r.path, dErr.message);
  }

  return NextResponse.json({ ok: true });
}
