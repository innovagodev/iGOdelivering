/**
 * Filtri e normalizzazioni per i campi dei moduli (telefono, partita IVA, CAP,
 * provincia, elenco di CAP, numero del tavolo).
 *
 * I filtri si applicano mentre si scrive (`onChange`): un campo numerico non
 * accetta testo, nemmeno incollato. Le normalizzazioni si applicano al
 * salvataggio e dicono se il valore è valido. Il server ripete i controlli
 * che contano: i filtri del browser sono comodità, non sicurezza.
 */

/** Sole cifre, con un massimo di lunghezza. */
export const digitsOnly = (value: string, max = 40): string => value.replace(/\D/g, '').slice(0, max);

/**
 * Telefono scritto a mano: cifre, spazi e i simboli usuali (- . ( ) ); il + solo
 * all'inizio. Massimo 20 caratteri.
 */
export const phoneChars = (value: string, max = 20): string => {
  const cleaned = value.replace(/[^\d\s+().-]/g, '');
  const plus = cleaned.trimStart().startsWith('+') ? '+' : '';
  return (plus + cleaned.replace(/\+/g, '').replace(/^\s+/, '')).slice(0, max);
};

/** Telefono del cliente (vetrina): solo cifre, con un + iniziale; al massimo 15 cifre. */
export const phoneDigits = (value: string): string => {
  const plus = value.trimStart().startsWith('+') ? '+' : '';
  return plus + value.replace(/\D/g, '').slice(0, 15);
};

/** Partita IVA italiana: 11 cifre. Il prefisso IT, se incollato, si toglie. */
export const vatDigits = (value: string): string =>
  value.trim().replace(/^IT/i, '').replace(/\D/g, '').slice(0, 11);

/** `null` = vuota, `undefined` = non valida (diversa da 11 cifre), altrimenti le 11 cifre. */
export const normalizeVat = (value: unknown): string | null | undefined => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const digits = vatDigits(value);
  const stripped = value.trim().replace(/^IT/i, '').replace(/\s/g, '');
  // Se oltre alle cifre c'era altro (lettere, simboli) il valore non è una partita IVA.
  return /^\d{11}$/.test(stripped) && digits.length === 11 ? digits : undefined;
};

/** Provincia: solo lettere maiuscole (la sigla, di 2 lettere). */
export const provinceLetters = (value: string, max = 2): string =>
  value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, max);

/** Elenco di CAP: cifre, virgole e spazi. */
export const capListChars = (value: string): string => value.replace(/[^\d,\s]/g, '').slice(0, 400);

/**
 * Elenco di CAP validato e ripulito ("20121, 20122"): ogni voce è di 5 cifre,
 * senza doppioni. `null` = vuoto, `undefined` = c'è una voce sbagliata.
 */
export const normalizeCapList = (value: unknown): string | null | undefined => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const items = value.split(',').map((s) => s.trim()).filter(Boolean);
  if (items.length === 0 || items.some((c) => !/^\d{5}$/.test(c))) return undefined;
  return Array.from(new Set(items)).join(', ');
};

/** Numero del tavolo digitato dal cliente: cifre, fino a 3. */
export const tableNumberDigits = (value: string): string => digitsOnly(value, 3);

/** Prefisso proposto al click sul campo "Sito web" (se è vuoto). */
export const HTTPS_PREFIX = 'https://';

/** Al click sul campo vuoto si scrive già `https://`. */
export const websiteOnFocus = (value: string): string => (value.trim() ? value : HTTPS_PREFIX);

/** Uscendo dal campo, se è rimasto solo il prefisso si svuota (il sito è facoltativo). */
export const websiteOnBlur = (value: string): string => (value.trim() === HTTPS_PREFIX ? '' : value);

/** Elenco di CAP tenendo solo le voci valide di 5 cifre, senza doppioni (per i salvataggi in blocco). */
export const keepValidCaps = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const items = value.split(',').map((s) => s.trim()).filter((c) => /^\d{5}$/.test(c));
  return Array.from(new Set(items)).join(', ');
};
