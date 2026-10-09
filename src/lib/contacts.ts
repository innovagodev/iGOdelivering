/**
 * Contatti pubblici del ristorante (telefono, WhatsApp, sito, social, mappa).
 *
 * Un'unica libreria usata da due parti:
 *  - il server (/api/ristoratore/profilo) per validare e normalizzare ciò che
 *    il ristoratore scrive prima di salvarlo;
 *  - la vetrina per costruire i collegamenti.
 *
 * Il valore salvato è sempre "pulito": un sito è un indirizzo https, un profilo
 * Instagram o Facebook è un indirizzo https del loro dominio, un numero
 * WhatsApp sono solo cifre con il prefisso internazionale. Nessun valore
 * arbitrario (per esempio `javascript:`) entra nel database, e nessun
 * collegamento della vetrina nasce da un testo non verificato.
 */

/** `null` = campo vuoto, `undefined` = valore non valido. */
export type Normalized = string | null | undefined;

const MAX = 300;

const clean = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

const hostOf = (url: URL) => url.hostname.toLowerCase().replace(/^www\./, '');

/** Sito web: https obbligatorio. Senza schema si aggiunge https://. */
export function normalizeWebsite(input: unknown): Normalized {
  const raw = clean(input);
  if (!raw) return null;
  if (raw.length > MAX || /\s/.test(raw)) return undefined;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return undefined;
  }
  // Solo http(s): niente javascript:, data:, mailto:, ecc. http viene portato a https.
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
  if (!url.hostname.includes('.') || url.username || url.password) return undefined;
  url.protocol = 'https:';
  // Solo la barra della radice si toglie (https://sito.it/ -> https://sito.it).
  const out = url.toString();
  return url.pathname === '/' && !url.search && !url.hash ? out.replace(/\/$/, '') : out;
}

const handleRe = /^[A-Za-z0-9._-]{1,60}$/;

/** Instagram: `@nome`, `nome` oppure un indirizzo instagram.com. */
export function normalizeInstagram(input: unknown): Normalized {
  const raw = clean(input);
  if (!raw) return null;
  if (raw.length > MAX) return undefined;
  if (/^https?:\/\//i.test(raw) || /^(www\.)?instagram\.com\//i.test(raw)) {
    let url: URL;
    try {
      url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    } catch {
      return undefined;
    }
    if (hostOf(url) !== 'instagram.com') return undefined;
    const handle = url.pathname.split('/').filter(Boolean)[0];
    if (!handle || !handleRe.test(handle)) return undefined;
    return `https://www.instagram.com/${handle}`;
  }
  const handle = raw.replace(/^@/, '');
  return handleRe.test(handle) ? `https://www.instagram.com/${handle}` : undefined;
}

/** Facebook: nome della pagina oppure un indirizzo facebook.com / fb.com / fb.me. */
export function normalizeFacebook(input: unknown): Normalized {
  const raw = clean(input);
  if (!raw) return null;
  if (raw.length > MAX) return undefined;
  if (/^https?:\/\//i.test(raw) || /^(www\.|m\.)?(facebook|fb)\.(com|me)\//i.test(raw)) {
    let url: URL;
    try {
      url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    } catch {
      return undefined;
    }
    const host = hostOf(url).replace(/^m\./, '');
    if (host !== 'facebook.com' && host !== 'fb.com' && host !== 'fb.me') return undefined;
    const path = url.pathname.replace(/\/+$/, '');
    if (!path || path === '/') return undefined;
    return `https://www.facebook.com${path}${path === '/profile.php' ? url.search : ''}`;
  }
  return handleRe.test(raw) ? `https://www.facebook.com/${raw}` : undefined;
}

/**
 * WhatsApp: si salvano solo le cifre con prefisso internazionale. Un numero
 * italiano scritto senza prefisso (cellulare che comincia per 3) prende il 39.
 */
export function normalizeWhatsapp(input: unknown): Normalized {
  const raw = clean(input);
  if (!raw) return null;
  if (!/^[+\d][\d\s().-]*$/.test(raw)) return undefined;
  let digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) {
    // già internazionale
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('3') && digits.length >= 9 && digits.length <= 10) {
    digits = `39${digits}`;
  } else {
    return undefined;
  }
  return digits.length >= 8 && digits.length <= 15 ? digits : undefined;
}

/** Telefono di contatto: cifre, spazi e simboli usuali, con almeno 6 cifre. */
export function normalizePhone(input: unknown): Normalized {
  const raw = clean(input);
  if (!raw) return null;
  if (raw.length > 30 || !/^[+\d][\d\s().-]*$/.test(raw)) return undefined;
  return raw.replace(/\D/g, '').length >= 6 ? raw : undefined;
}

/**
 * Valida e normalizza sito e social di un modulo (admin). `invalid` elenca i
 * campi sbagliati con il nome da mostrare; un campo vuoto diventa `null`.
 */
export function normalizeContacts(input: {
  website?: string;
  instagram?: string;
  facebook?: string;
  whatsapp?: string;
}):
  | { ok: true; value: { website: string | null; instagram: string | null; facebook: string | null; whatsapp: string | null } }
  | { ok: false; invalid: string[] } {
  const checks: [string, Normalized][] = [
    ['Sito web', normalizeWebsite(input.website)],
    ['Instagram', normalizeInstagram(input.instagram)],
    ['Facebook', normalizeFacebook(input.facebook)],
    ['WhatsApp', normalizeWhatsapp(input.whatsapp)],
  ];
  const invalid = checks.filter(([, v]) => v === undefined).map(([name]) => name);
  if (invalid.length > 0) return { ok: false, invalid };
  const [website, instagram, facebook, whatsapp] = checks.map(([, v]) => v as string | null);
  return { ok: true, value: { website, instagram, facebook, whatsapp } };
}

// ─── Collegamenti per la vetrina ────────────────────────────────────────────

/** `tel:` dal telefono scritto dal ristoratore. */
export const telHref = (phone: string): string | null => {
  const compact = phone.replace(/[^\d+]/g, '');
  return compact.replace(/\D/g, '').length >= 6 ? `tel:${compact}` : null;
};

export const whatsappHref = (digits: string): string | null =>
  /^\d{8,15}$/.test(digits) ? `https://wa.me/${digits}` : null;

/** Indicazioni stradali dall'indirizzo, senza bisogno di coordinate. */
export const mapsHref = (parts: {
  address?: string | null;
  city?: string | null;
  province?: string | null;
  cap?: string | null;
}): string | null => {
  const query = [parts.address, parts.cap, parts.city, parts.province]
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .join(', ');
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
};

/** Un valore letto dal database è un https sicuro da usare come href? (difesa in più) */
export const safeHttpsHref = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
};
