/**
 * Anteprima del Profilo ristorante: la pagina del ristoratore incornicia la
 * vetrina vera (`/menu/<slug>?preview=1`) e le manda, a ogni modifica del
 * modulo, i valori ancora non salvati. Così l'anteprima è sempre la vetrina
 * reale (intestazione, stato, orari, categorie), non una copia da tenere allineata.
 *
 * Sicurezza: la vetrina accetta i messaggi solo se è dentro una cornice, ha
 * `?preview=1` e il messaggio arriva dalla stessa origine; i valori sono solo
 * testo e le immagini solo `https:` o `blob:`. Nulla viene salvato.
 */

export const PREVIEW_MESSAGE = 'igo-profile-preview';
export const PREVIEW_READY = 'igo-profile-preview-ready';

/** Campi della vetrina che il modulo può sovrascrivere nell'anteprima. */
export const PREVIEW_FIELDS = [
  'name',
  'tagline',
  'taglineEn',
  'address',
  'city',
  'province',
  'cap',
  'phone',
  'website',
  'instagram',
  'facebook',
  'whatsapp',
  'logoUrl',
  'image',
] as const;

export type PreviewField = (typeof PREVIEW_FIELDS)[number];
export type PreviewValues = Partial<Record<PreviewField, string>>;

const IMAGE_FIELDS: PreviewField[] = ['logoUrl', 'image'];

/** Vero solo dentro una cornice e con `?preview=1`. */
export function isProfilePreview(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top && new URLSearchParams(window.location.search).get('preview') === '1';
  } catch {
    return false;
  }
}

/** Tiene dal messaggio solo i campi noti, come testo, con le immagini limitate a https/blob. */
export function sanitizePreviewValues(input: unknown): PreviewValues {
  const out: PreviewValues = {};
  if (!input || typeof input !== 'object') return out;
  for (const key of PREVIEW_FIELDS) {
    const v = (input as Record<string, unknown>)[key];
    if (typeof v !== 'string') continue;
    const value = v.slice(0, 2000);
    if (IMAGE_FIELDS.includes(key) && value && !/^(https:\/\/|blob:)/.test(value)) continue;
    out[key] = value;
  }
  return out;
}
