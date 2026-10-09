'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, ImagePlus, Lock, Plus, Smartphone, Monitor, Store, Tag, Trash2, X } from 'lucide-react';
import PageTopbar from '@/components/layout/PageTopbar';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import { PREVIEW_MESSAGE, PREVIEW_READY, PreviewValues } from '@/lib/profilePreview';
import { digitsOnly, phoneChars, provinceLetters, websiteOnBlur, websiteOnFocus } from '@/lib/fields';
import { uploadImage } from '@/lib/storage-upload';
import {
  ACCEPTED_IMAGE_TYPES,
  BANNER_OPTIONS,
  ImageError,
  LOGO_OPTIONS,
  prepareImage,
} from '@/lib/imageResize';
import {
  normalizeFacebook,
  normalizeInstagram,
  normalizePhone,
  normalizeWebsite,
  normalizeWhatsapp,
} from '@/lib/contacts';

/**
 * Profilo del ristorante: ciò che il cliente vede in testa alla vetrina e nei
 * contatti. Prima lo impostava solo l'admin.
 *
 * Il salvataggio passa da /api/ristoratore/profilo, che accetta solo questi
 * campi e controlla le immagini. Indirizzo web della vetrina, email, partita
 * IVA e stato restano all'admin e qui sono in sola lettura.
 */

interface ProfileRow {
  id: string;
  name: string | null;
  category: string | null;
  description: string | null;
  description_en: string | null;
  phone: string | null;
  email: string | null;
  vat_number: string | null;
  slug: string | null;
  status: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  cap: string | null;
  logo_url: string | null;
  background_url: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  whatsapp: string | null;
  delivery_fee: number | string | null;
}

const COLUMNS =
  'id, name, category, description, description_en, phone, email, vat_number, slug, status, address, city, province, cap, logo_url, background_url, website, instagram, facebook, whatsapp, delivery_fee';

interface FormState {
  name: string;
  category: string;
  description: string;
  descriptionEn: string;
  phone: string;
  whatsapp: string;
  website: string;
  instagram: string;
  facebook: string;
  address: string;
  city: string;
  province: string;
  cap: string;
}

const FORM_KEYS = [
  'name',
  'category',
  'description',
  'descriptionEn',
  'phone',
  'whatsapp',
  'website',
  'instagram',
  'facebook',
  'address',
  'city',
  'province',
  'cap',
] as const satisfies readonly (keyof FormState)[];

const toForm = (r: ProfileRow): FormState => ({
  name: r.name ?? '',
  category: r.category ?? '',
  description: r.description ?? '',
  descriptionEn: r.description_en ?? '',
  phone: r.phone ?? '',
  // Si mostra come lo si scrive: +39 333 1234567 invece delle sole cifre salvate.
  whatsapp: r.whatsapp ? `+${r.whatsapp}` : '',
  website: r.website ?? '',
  instagram: r.instagram ?? '',
  facebook: r.facebook ?? '',
  address: r.address ?? '',
  city: r.city ?? '',
  province: r.province ?? '',
  cap: r.cap ?? '',
});

interface ImageState {
  file: File | null;
  previewUrl: string | null;
  removed: boolean;
  info: string | null;
}
const emptyImage: ImageState = { file: null, previewUrl: null, removed: false, info: null };

const inputCls =
  'w-full rounded-xl border border-border bg-input px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary disabled:opacity-60';

function Section({
  title,
  hint,
  badge,
  children,
}: {
  title: string;
  hint?: string;
  badge?: { label: string; tone: 'public' | 'private' };
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {badge && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              badge.tone === 'public'
                ? 'bg-[var(--success-bg)] text-[var(--success)]'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {badge.tone === 'private' && <Lock size={11} />}
            {badge.label}
          </span>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  error,
  hint,
  counter,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  counter?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
        <span>{label}</span>
        {counter}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-semibold text-[var(--danger)]">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

function ImageField({
  label,
  hint,
  url,
  shape,
  state,
  busy,
  error,
  onPick,
  onRemove,
}: {
  label: string;
  hint: string;
  url: string;
  shape: 'circle' | 'wide';
  state: ImageState;
  busy: boolean;
  error?: string;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="flex items-center gap-4">
        <div
          className={`flex flex-shrink-0 items-center justify-center overflow-hidden border border-border bg-muted ${
            shape === 'circle' ? 'h-20 w-20 rounded-full' : 'h-20 w-36 rounded-xl'
          }`}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className={`h-full w-full ${shape === 'circle' ? 'object-contain bg-white' : 'object-cover'}`} />
          ) : (
            <ImagePlus size={22} className="text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              className="touch-target inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
            >
              <ImagePlus size={15} />
              {url ? 'Cambia' : 'Carica'}
            </button>
            {url && (
              <button
                type="button"
                disabled={busy}
                onClick={onRemove}
                className="touch-target inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-bg)] disabled:opacity-60"
              >
                <Trash2 size={15} />
                Rimuovi
              </button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{state.info ?? hint}</p>
        </div>
        <input
          ref={input}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) onPick(f);
          }}
        />
      </div>
      {error && <p className="mt-1 text-xs font-semibold text-[var(--danger)]">{error}</p>}
    </div>
  );
}

/**
 * Categoria: menu a tendina con le categorie esistenti e un "+" per aggiungerne una nuova,
 * come nel modulo dell'admin. La categoria nuova entra nell'elenco al salvataggio (la route).
 */
function CategoryPicker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [added, setAdded] = useState<string[]>([]);
  const draftRef = useRef<HTMLInputElement>(null);

  // Il valore attuale e le categorie aggiunte qui compaiono sempre, anche se non sono ancora nell'elenco.
  const all = Array.from(new Set([...options, ...added, ...(value ? [value] : [])])).sort((a, b) =>
    a.localeCompare(b, 'it')
  );

  const confirm = () => {
    const v = draft.trim().slice(0, 60);
    if (!v) return;
    const existing = all.find((c) => c.toLowerCase() === v.toLowerCase());
    if (!existing) setAdded((p) => [...p, v]);
    onChange(existing ?? v);
    setDraft('');
    setAdding(false);
  };

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Tag size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} pl-9`}>
            <option value="">Seleziona categoria…</option>
            {all.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            setAdding((v) => !v);
            setTimeout(() => draftRef.current?.focus(), 50);
          }}
          title="Aggiungi una categoria"
          aria-label="Aggiungi una categoria"
          className="touch-target flex h-[2.875rem] w-[2.875rem] flex-shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
        >
          <Plus size={16} />
        </button>
      </div>
      {adding && (
        <div className="mt-2 flex gap-2">
          <input
            ref={draftRef}
            type="text"
            value={draft}
            maxLength={60}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                confirm();
              }
              if (e.key === 'Escape') setAdding(false);
            }}
            placeholder="Nuova categoria…"
            className={`${inputCls} min-w-0 flex-1`}
          />
          <button
            type="button"
            onClick={confirm}
            aria-label="Conferma la categoria"
            className="touch-target flex h-[2.875rem] w-[2.875rem] flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary-hover"
          >
            <Check size={15} />
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            aria-label="Annulla"
            className="touch-target flex h-[2.875rem] w-[2.875rem] flex-shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

const DESKTOP_W = 1280;
const DESKTOP_H = 820;

/** Una riga di sola lettura: etichetta sopra, valore subito sotto (la colonna è stretta: niente tagli). */
function ReadOnlyRow({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <dt className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
        {label}
        {action}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/**
 * Anteprima: la vetrina VERA (`/menu/<slug>?preview=1`) in una cornice, che riceve a ogni
 * modifica i valori del modulo non ancora salvati (vedi src/lib/profilePreview.ts).
 * Stato aperto/chiuso, orari, intestazione e categorie sono quelli reali.
 * Telefono: larghezza reale del telefono. Computer: la vetrina a 1280px, rimpicciolita.
 */
function StorefrontPreview({
  slug,
  device,
  lang,
  values,
}: {
  slug: string;
  device: 'phone' | 'desktop';
  lang: 'it' | 'en';
  values: PreviewValues;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const latest = useRef({ values, lang });
  latest.current = { values, lang };
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(1);

  const post = useCallback(() => {
    frame.current?.contentWindow?.postMessage(
      { type: PREVIEW_MESSAGE, values: latest.current.values, lang: latest.current.lang },
      window.location.origin
    );
  }, []);

  // La vetrina dice "pronta" quando ascolta; da lì in poi riceve ogni modifica.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      if (e.data?.type === PREVIEW_READY) {
        setReady(true);
        post();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [post]);

  useEffect(() => {
    if (ready) post();
  }, [ready, values, lang, post]);

  // Vista computer: la scala segue la larghezza disponibile.
  useEffect(() => {
    const el = box.current;
    if (!el || device !== 'desktop') return;
    const update = () => setScale(Math.min(1, el.clientWidth / DESKTOP_W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [device]);

  const src = `/menu/${encodeURIComponent(slug)}?preview=1`;
  const loading = !ready && (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-xs font-semibold text-muted-foreground">
      Carico la vetrina…
    </div>
  );

  if (device === 'phone') {
    return (
      <div className="mx-auto w-full max-w-[406px] rounded-[2.1rem] bg-neutral-900 p-2 shadow-xl">
        <div
          className="relative overflow-hidden rounded-[1.6rem] bg-background"
          style={{ height: 'clamp(520px, calc(100dvh - 14rem), 760px)' }}
        >
          <iframe
            ref={frame}
            key="phone"
            src={src}
            title="Anteprima della vetrina su telefono"
            className="h-full w-full border-0"
          />
          {loading}
        </div>
      </div>
    );
  }
  return (
    <div
      ref={box}
      className="relative w-full overflow-hidden rounded-xl border border-border bg-background"
      style={{ height: DESKTOP_H * scale }}
    >
      <iframe
        ref={frame}
        key="desktop"
        src={src}
        title="Anteprima della vetrina su computer"
        className="absolute left-0 top-0 border-0"
        style={{ width: DESKTOP_W, height: DESKTOP_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      />
      {loading}
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  published: 'Pubblicato',
  draft: 'Bozza',
  suspended: 'Sospeso',
};

export default function ProfiloRistorantePage() {
  const { user, isLoading } = useAuth();
  const restaurantId = user?.restaurantId || '';

  const [row, setRow] = useState<ProfileRow | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [original, setOriginal] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logo, setLogo] = useState<ImageState>(emptyImage);
  const [banner, setBanner] = useState<ImageState>(emptyImage);
  const [imageBusy, setImageBusy] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [device, setDevice] = useState<'phone' | 'desktop'>('phone');
  const [previewLang, setPreviewLang] = useState<'it' | 'en'>('it');
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const revoke = (s: ImageState) => {
    if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
  };

  const load = useCallback(async () => {
    if (!restaurantId || restaurantId === 'r-001') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('restaurants')
      .select(COLUMNS)
      .eq('id', restaurantId)
      .maybeSingle();
    if (error || !data) {
      console.error('[profilo] lettura fallita:', error?.message);
      setLoadError('Non è stato possibile caricare il profilo. Riprova tra poco.');
      setLoading(false);
      return;
    }
    const r = data as unknown as ProfileRow;
    setRow(r);
    setForm(toForm(r));
    setOriginal(toForm(r));
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    supabase
      .from('restaurant_categories')
      .select('name')
      .order('name')
      .then(({ data }) => setCategories((data ?? []).map((c: { name: string }) => c.name)));
  }, []);

  const dirty = useMemo(() => {
    if (!form || !original) return false;
    return (
      FORM_KEYS.some((k) => form[k] !== original[k]) ||
      !!logo.file ||
      logo.removed ||
      !!banner.file ||
      banner.removed
    );
  }, [form, original, logo, banner]);

  // Modifiche non salvate: avviso prima di chiudere o ricaricare la pagina.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (key: keyof FormState, value: string) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setErrors((e) => {
      if (!e[key]) return e;
      const { [key]: _removed, ...rest } = e;
      return rest;
    });
  };

  const pickImage = async (kind: 'logo' | 'banner', file: File) => {
    setImageBusy(true);
    try {
      const prepared = await prepareImage(file, kind === 'logo' ? LOGO_OPTIONS : BANNER_OPTIONS);
      const previewUrl = URL.createObjectURL(prepared);
      const info = `Pronta: ${Math.max(1, Math.round(prepared.size / 1024))} KB`;
      const setter = kind === 'logo' ? setLogo : setBanner;
      const current = kind === 'logo' ? logo : banner;
      revoke(current);
      setter({ file: prepared, previewUrl, removed: false, info });
      setErrors((e) => {
        const key = kind === 'logo' ? 'logoUrl' : 'backgroundUrl';
        const { [key]: _removed, ...rest } = e;
        return rest;
      });
    } catch (err) {
      notify.error(err instanceof ImageError ? err.message : 'Impossibile elaborare l’immagine.');
    } finally {
      setImageBusy(false);
    }
  };

  const removeImage = (kind: 'logo' | 'banner') => {
    const setter = kind === 'logo' ? setLogo : setBanner;
    const current = kind === 'logo' ? logo : banner;
    revoke(current);
    setter({ ...emptyImage, removed: true });
  };

  const discard = () => {
    revoke(logo);
    revoke(banner);
    setLogo(emptyImage);
    setBanner(emptyImage);
    if (original) setForm(original);
    setErrors({});
  };

  const save = async () => {
    if (!form || !original || !row || saving) return;
    setSaving(true);
    setErrors({});
    const uploaded: { bucket: 'restaurant-logos' | 'restaurant-banners'; path: string }[] = [];
    const cleanup = async () => {
      for (const u of uploaded) await supabase.storage.from(u.bucket).remove([u.path]);
    };
    try {
      const patch: Record<string, unknown> = {};
      FORM_KEYS.forEach((k) => {
        if (form[k] !== original[k]) patch[k] = form[k];
      });

      const upload = async (
        state: ImageState,
        bucket: 'restaurant-logos' | 'restaurant-banners',
        tag: string
      ): Promise<string | null | undefined> => {
        if (state.file) {
          const ext = state.file.name.split('.').pop() || 'jpg';
          const path = `${row.id}/${Date.now()}-${tag}.${ext}`;
          const url = await uploadImage(state.file, bucket, path);
          uploaded.push({ bucket, path });
          return url;
        }
        return state.removed ? null : undefined;
      };
      const logoUrl = await upload(logo, 'restaurant-logos', 'logo');
      const backgroundUrl = await upload(banner, 'restaurant-banners', 'banner');
      if (logoUrl !== undefined) patch.logoUrl = logoUrl;
      if (backgroundUrl !== undefined) patch.backgroundUrl = backgroundUrl;

      if (Object.keys(patch).length === 0) {
        notify.info('Nessuna modifica da salvare.');
        return;
      }

      const res = await fetch('/api/ristoratore/profilo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        await cleanup();
        if (json?.fields) setErrors(json.fields);
        notify.error(json?.message || json?.error || 'Salvataggio non riuscito. Riprova.');
        return;
      }

      revoke(logo);
      revoke(banner);
      setLogo(emptyImage);
      setBanner(emptyImage);
      await load();
      notify.success('Profilo salvato. La vetrina è già aggiornata.');
    } catch (err) {
      await cleanup();
      console.error('[profilo] salvataggio fallito:', err);
      notify.error('Salvataggio non riuscito. Controlla la connessione e riprova.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Anteprima: i valori del modulo, anche non salvati, per la vetrina incorniciata ──────
  const preview = useMemo(() => {
    if (!form || !row) return null;
    const ok = (v: string | null | undefined) => (typeof v === 'string' ? v : '');
    const logoShown = logo.removed ? '' : (logo.previewUrl ?? row.logo_url ?? '');
    const bannerShown = banner.removed ? '' : (banner.previewUrl ?? row.background_url ?? '');
    const values: PreviewValues = {
      name: form.name || 'Nome del ristorante',
      tagline: form.description,
      taglineEn: form.descriptionEn.trim(),
      address: form.address,
      city: form.city,
      province: form.province,
      cap: form.cap,
      phone: ok(normalizePhone(form.phone)),
      whatsapp: ok(normalizeWhatsapp(form.whatsapp)),
      website: ok(normalizeWebsite(form.website)),
      instagram: ok(normalizeInstagram(form.instagram)),
      facebook: ok(normalizeFacebook(form.facebook)),
      logoUrl: logoShown,
      image: bannerShown,
    };
    return { logoShown, bannerShown, values };
  }, [form, row, logo, banner]);

  const copyLink = async () => {
    if (!row?.slug) return;
    try {
      await navigator.clipboard.writeText(`${origin}/menu/${row.slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error('Copia non riuscita: seleziona il link e copialo a mano.');
    }
  };

  const noRestaurant = !restaurantId || restaurantId === 'r-001';

  return (
    <div className="flex flex-1 min-h-0 min-w-0 bg-background overflow-hidden relative">
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <PageTopbar
          left={
            <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <Store size={16} className="flex-shrink-0 text-primary" />
              <span className="truncate text-base font-semibold text-foreground">Profilo ristorante</span>
            </div>
          }
        />

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8">
            {isLoading || loading ? (
              <div className="flex min-h-[50dvh] flex-col items-center justify-center space-y-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="animate-pulse text-sm font-medium text-muted-foreground">Caricamento del profilo…</p>
              </div>
            ) : noRestaurant ? (
              <div className="flex min-h-[50dvh] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Store size={32} />
                </div>
                <h2 className="text-xl font-bold text-foreground">Nessun ristorante collegato</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Il tuo account non è ancora collegato a un ristorante attivo. Contatta l’amministratore.
                </p>
              </div>
            ) : loadError || !form || !row || !preview ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <p className="text-sm font-semibold text-foreground">{loadError ?? 'Profilo non disponibile.'}</p>
                <button
                  type="button"
                  onClick={load}
                  className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover"
                >
                  Riprova
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-foreground">Profilo del ristorante</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Come ti vedono i clienti: logo, foto di copertina, descrizione e contatti.
                  </p>
                </div>

                <div
                  className={`grid gap-6 grid-cols-[minmax(0,1fr)] ${
                    device === 'phone'
                      ? 'xl:grid-cols-[minmax(0,1fr)_440px]'
                      : 'xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'
                  }`}
                >
                  {/* ─── Anteprima: la vetrina vera, in tempo reale ─── */}
                  <aside className="order-first min-w-0 xl:order-last xl:sticky xl:top-4 xl:self-start">
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="text-sm font-bold text-foreground">Anteprima della vetrina</h2>
                          <p className="text-[11px] text-muted-foreground">Si aggiorna mentre scrivi, prima di salvare.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <div className="flex rounded-lg bg-muted p-0.5" role="group" aria-label="Dispositivo">
                            {(
                              [
                                ['phone', Smartphone, 'Telefono'],
                                ['desktop', Monitor, 'Computer'],
                              ] as const
                            ).map(([key, Icon, label]) => (
                              <button
                                key={key}
                                type="button"
                                aria-pressed={device === key}
                                onClick={() => setDevice(key)}
                                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-bold ${
                                  device === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                                }`}
                              >
                                <Icon size={12} />
                                {label}
                              </button>
                            ))}
                          </div>
                          <div className="flex rounded-lg bg-muted p-0.5" role="group" aria-label="Lingua">
                            {(['it', 'en'] as const).map((l) => (
                              <button
                                key={l}
                                type="button"
                                aria-pressed={previewLang === l}
                                onClick={() => setPreviewLang(l)}
                                className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold uppercase ${
                                  previewLang === l ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                                }`}
                              >
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      {row.slug ? (
                        <StorefrontPreview slug={row.slug} device={device} lang={previewLang} values={preview.values} />
                      ) : (
                        <p className="rounded-xl bg-muted px-4 py-8 text-center text-sm text-muted-foreground">
                          L’anteprima sarà disponibile appena la vetrina ha un indirizzo web.
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="min-w-0 flex-1 text-[11px] text-muted-foreground">
                          È la vetrina vera: stato, orari e categorie sono quelli di oggi.
                        </p>
                        {row.slug && (
                          <a
                            href={`/menu/${encodeURIComponent(row.slug)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                          >
                            Apri la vetrina
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  </aside>

                  {/* ─── Modulo ─── */}
                  <div className="space-y-5 pb-28">
                    <Section
                      title="Immagini"
                      hint="Le ridimensioniamo e comprimiamo noi, così la vetrina resta veloce da telefono."
                      badge={{ label: 'Visibile ai clienti', tone: 'public' }}
                    >
                      <ImageField
                        label="Logo"
                        hint="Quadrato, sfondo trasparente o bianco. PNG, JPG o WebP."
                        url={preview.logoShown}
                        shape="circle"
                        state={logo}
                        busy={imageBusy || saving}
                        error={errors.logoUrl}
                        onPick={(f) => pickImage('logo', f)}
                        onRemove={() => removeImage('logo')}
                      />
                      <ImageField
                        label="Foto di copertina"
                        hint="Orizzontale."
                        url={preview.bannerShown}
                        shape="wide"
                        state={banner}
                        busy={imageBusy || saving}
                        error={errors.backgroundUrl}
                        onPick={(f) => pickImage('banner', f)}
                        onRemove={() => removeImage('banner')}
                      />
                    </Section>

                    <Section
                      title="Presentazione"
                      hint="Nome, categoria e descrizione: compaiono in testa alla vetrina."
                      badge={{ label: 'Visibile ai clienti', tone: 'public' }}
                    >
                      <div className={`grid gap-4 sm:grid-cols-2 ${device === 'desktop' ? 'xl:grid-cols-1' : ''}`}>
                        <Field label="Nome *" error={errors.name}>
                          <input
                            type="text"
                            value={form.name}
                            onChange={(e) => set('name', e.target.value)}
                            className={inputCls}
                          />
                        </Field>
                        <div>
                          <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Categoria</span>
                          <CategoryPicker
                            value={form.category}
                            options={categories}
                            onChange={(v) => set('category', v)}
                          />
                          {errors.category && (
                            <span className="mt-1 block text-xs font-semibold text-[var(--danger)]">{errors.category}</span>
                          )}
                        </div>
                      </div>
                      <Field
                        label="Descrizione in italiano"
                        error={errors.description}
                        counter={
                          <span className={form.description.length > 300 ? 'text-[var(--danger)]' : ''}>
                            {form.description.length}/300
                          </span>
                        }
                      >
                        <textarea
                          value={form.description}
                          onChange={(e) => set('description', e.target.value)}
                          rows={3}
                          placeholder="Due righe che raccontano il tuo locale"
                          className={inputCls}
                        />
                      </Field>
                      <Field
                        label="Descrizione in inglese (facoltativa)"
                        error={errors.descriptionEn}
                        hint="Se la lasci vuota, i clienti che usano l’inglese vedono quella italiana."
                        counter={
                          <span className={form.descriptionEn.length > 300 ? 'text-[var(--danger)]' : ''}>
                            {form.descriptionEn.length}/300
                          </span>
                        }
                      >
                        <textarea
                          value={form.descriptionEn}
                          onChange={(e) => set('descriptionEn', e.target.value)}
                          rows={3}
                          className={inputCls}
                        />
                      </Field>
                    </Section>

                    <Section
                      title="Dove siamo"
                      hint="L’indirizzo compare in testa alla vetrina e apre le indicazioni stradali."
                      badge={{ label: 'Visibile ai clienti', tone: 'public' }}
                    >
                      <Field label="Via / piazza *" error={errors.address}>
                        <input
                          type="text"
                          value={form.address}
                          onChange={(e) => set('address', e.target.value)}
                          className={inputCls}
                        />
                      </Field>
                      <div className="grid grid-cols-6 gap-4">
                        <div className="col-span-6 sm:col-span-3">
                          <Field label="Città *" error={errors.city}>
                            <input
                              type="text"
                              value={form.city}
                              onChange={(e) => set('city', e.target.value)}
                              className={inputCls}
                            />
                          </Field>
                        </div>
                        <div className="col-span-3 sm:col-span-1">
                          <Field label="Prov." error={errors.province}>
                            <input
                              type="text"
                              value={form.province}
                              onChange={(e) => set('province', provinceLetters(e.target.value))}
                              maxLength={2}
                              className={inputCls}
                            />
                          </Field>
                        </div>
                        <div className="col-span-3 sm:col-span-2">
                          <Field label="CAP" error={errors.cap}>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={form.cap}
                              onChange={(e) => set('cap', digitsOnly(e.target.value, 5))}
                              className={inputCls}
                            />
                          </Field>
                        </div>
                      </div>
                    </Section>

                    <Section
                      title="Contatti"
                      hint="Compaiono nel pulsante “Contatti” della vetrina. Lascia vuoto ciò che non hai."
                      badge={{ label: 'Visibile ai clienti', tone: 'public' }}
                    >
                      <div className={`grid gap-4 sm:grid-cols-2 ${device === 'desktop' ? 'xl:grid-cols-1' : ''}`}>
                        <Field label="Telefono *" error={errors.phone}>
                          <input
                            type="tel"
                            inputMode="tel"
                            value={form.phone}
                            onChange={(e) => set('phone', phoneChars(e.target.value))}
                            placeholder="0932 123456"
                            className={inputCls}
                          />
                        </Field>
                        <Field label="WhatsApp" error={errors.whatsapp}>
                          <input
                            type="tel"
                            inputMode="tel"
                            value={form.whatsapp}
                            onChange={(e) => set('whatsapp', phoneChars(e.target.value))}
                            placeholder="+39 333 1234567"
                            className={inputCls}
                          />
                        </Field>
                        <div className="sm:col-span-2 xl:col-span-1">
                        <Field label="Sito web" error={errors.website}>
                          <input
                            type="url"
                            inputMode="url"
                            value={form.website}
                            onFocus={() => set('website', websiteOnFocus(form.website))}
                            onBlur={() => set('website', websiteOnBlur(form.website))}
                            onChange={(e) => set('website', e.target.value)}
                            placeholder="https://www.tuosito.it"
                            className={inputCls}
                          />
                        </Field>
                        </div>
                        <div className="sm:col-span-2 xl:col-span-1">
                        <Field label="Instagram" error={errors.instagram} hint="@nomeprofilo oppure il link.">
                          <input
                            type="text"
                            value={form.instagram}
                            onChange={(e) => set('instagram', e.target.value)}
                            placeholder="@nomeprofilo"
                            className={inputCls}
                          />
                        </Field>
                        </div>
                        <div className="sm:col-span-2 xl:col-span-1">
                        <Field label="Facebook" error={errors.facebook} hint="Il nome della pagina oppure il link.">
                          <input
                            type="text"
                            value={form.facebook}
                            onChange={(e) => set('facebook', e.target.value)}
                            placeholder="nomepagina"
                            className={inputCls}
                          />
                        </Field>
                        </div>
                      </div>
                    </Section>

                    <Section
                      title="Gestiti dall’assistenza"
                      hint="Per modificarli scrivi all’assistenza: cambiarli senza controllo avrebbe effetti su QR code, accesso e pagamenti."
                      badge={{ label: 'Sola lettura', tone: 'private' }}
                    >
                      <dl className="divide-y divide-border/70 rounded-xl border border-border bg-muted/40 text-sm">
                        <ReadOnlyRow
                          label="Indirizzo web della vetrina"
                          action={
                            <button
                              type="button"
                              onClick={copyLink}
                              className="touch-target -my-1 inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                            >
                              {copied ? <Check size={13} className="text-[var(--success)]" /> : <Copy size={13} />}
                              {copied ? 'Copiato' : 'Copia'}
                            </button>
                          }
                        >
                          <span className="font-medium text-foreground [overflow-wrap:anywhere]">
                            {row.slug ? `${origin}/menu/${row.slug}` : '—'}
                          </span>
                        </ReadOnlyRow>
                        <ReadOnlyRow label="Email dell’account">
                          <span className="font-medium text-foreground [overflow-wrap:anywhere]">{row.email || '—'}</span>
                        </ReadOnlyRow>
                        <ReadOnlyRow label="Partita IVA">
                          <span className="font-medium text-foreground">{row.vat_number || '—'}</span>
                        </ReadOnlyRow>
                        <ReadOnlyRow label="Stato della vetrina">
                          <span className="font-medium text-foreground">
                            {STATUS_LABEL[row.status ?? ''] ?? row.status ?? '—'}
                          </span>
                        </ReadOnlyRow>
                      </dl>
                    </Section>




                  </div>
                </div>
              </>
            )}
          </div>

          {/* Barra di salvataggio: sempre raggiungibile, anche da tablet */}
          {form && row && !loading && !noRestaurant && (
            <div className="sticky bottom-0 z-20 border-t border-border bg-card/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md sm:px-6 lg:px-8">
              <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-3">
                <p className={`text-xs font-semibold ${dirty ? 'text-[var(--warning)]' : 'text-muted-foreground'}`}>
                  {dirty ? 'Hai modifiche non salvate' : 'Nessuna modifica'}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={discard}
                    disabled={!dirty || saving}
                    className="touch-target rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={!dirty || saving || imageBusy}
                    className="touch-target rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover disabled:opacity-50 disabled:shadow-none"
                  >
                    {saving ? 'Salvataggio…' : 'Salva modifiche'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
