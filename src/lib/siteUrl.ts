/**
 * Indirizzo pubblico del sito e costruzione degli URL assoluti.
 *
 * `NEXT_PUBLIC_SITE_URL` viene scritta a mano su Vercel e capita che finisca
 * con una "/": concatenarla a "/register?..." produceva
 * "https://dominio//register?...". Tutti i link assoluti (mail di attivazione,
 * tracking, link di Stripe) passano da qui.
 */

const PRODUCTION_FALLBACK = 'https://igodelivering.it';
const DEV_FALLBACK = 'http://localhost:4028';

let warnedMissing = false;

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

/**
 * Origine del sito, senza barra finale.
 *
 * Se la variabile manca si usa, nell'ordine, `fallbackOrigin` (di solito
 * l'origine della richiesta in corso), poi il dominio di produzione. Mai
 * `localhost` fuori dallo sviluppo: un link di localhost in una mail non si
 * apre da nessuna parte.
 */
export function getSiteUrl(fallbackOrigin?: string): string {
  const configured = stripTrailingSlashes((process.env.NEXT_PUBLIC_SITE_URL || '').trim());
  if (configured) return configured;

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && !warnedMissing) {
    warnedMissing = true;
    console.warn(
      '[siteUrl] NEXT_PUBLIC_SITE_URL non è impostata: i link nelle mail useranno un indirizzo di ripiego. ' +
        'Impostarla su Vercel (senza "/" finale) e rifare il deploy.'
    );
  }

  if (fallbackOrigin) return stripTrailingSlashes(fallbackOrigin);
  return isProduction ? PRODUCTION_FALLBACK : DEV_FALLBACK;
}

/**
 * Unisce un indirizzo di base e un percorso con una sola "/" in mezzo,
 * qualunque sia il numero di barre ai bordi.
 */
export function absoluteUrl(path: string, base: string = getSiteUrl()): string {
  return `${stripTrailingSlashes(base)}/${path.replace(/^\/+/, '')}`;
}
