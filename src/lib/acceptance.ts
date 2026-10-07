import {
  HoursConfig,
  isServiceOpenAt,
  nextOpeningAt,
  nowInZone,
  ServiceKind,
} from '@/lib/serviceHours';

/**
 * Regola unica di accettazione per ordini e prenotazioni (migration 034).
 *
 *   live      il locale è aperto quando il cliente ordina: il ristorante ha
 *             LIVE_ACCEPT_SECONDS per accettare e il cliente vede il conto alla
 *             rovescia. Vale per qualunque orario scelto per il ritiro o la
 *             consegna.
 *   deferred  il locale è chiuso (preordine): niente conto alla rovescia, la
 *             scadenza è DEFERRED_GRACE_MINUTES dopo la prossima apertura.
 *             Un'ora e non pochi minuti: un locale non sempre apre in punto o
 *             ha già acceso il gestionale, e i preordini arrivano tutti insieme.
 *
 * Funzioni pure, senza dipendenze dal server: la usano /api/orders,
 * /api/bookings e il webhook di Stripe, e la vetrina per i testi.
 */

export const LIVE_ACCEPT_SECONDS = 180;
export const DEFERRED_GRACE_MINUTES = 60;

/**
 * Un'autorizzazione di carta dura al massimo 7 giorni (meno presso alcune
 * banche): una richiesta non può aspettare oltre questo limite. Un giorno di
 * margine.
 */
export const MAX_HOLD_MS = 6 * 24 * 60 * 60 * 1000;

export type AcceptanceMode = 'live' | 'deferred';

export interface Acceptance {
  mode: AcceptanceMode;
  deadline: Date;
}

/** Scadenza di una richiesta live che diventa visibile al ristorante in `fromMs`. */
export const liveDeadline = (fromMs: number): Date =>
  new Date(fromMs + LIVE_ACCEPT_SECONDS * 1000);

/**
 * Modalità e scadenza di una richiesta in arrivo adesso.
 * `service` null = richiesta fatta dal tavolo, dentro il locale: sempre live.
 */
export function decideAcceptance(
  config: HoursConfig | null | undefined,
  service: ServiceKind | null,
  at: Date = new Date()
): Acceptance {
  const nowMs = at.getTime();
  if (service === null) return { mode: 'live', deadline: liveDeadline(nowMs) };

  const now = nowInZone('Europe/Rome', at);
  if (isServiceOpenAt(config, service, now.date, now.minutes)) {
    return { mode: 'live', deadline: liveDeadline(nowMs) };
  }

  const opening = nextOpeningAt(config, service, now);
  const base = opening ? opening.getTime() + DEFERRED_GRACE_MINUTES * 60_000 : nowMs + MAX_HOLD_MS;
  return { mode: 'deferred', deadline: new Date(Math.min(base, nowMs + MAX_HOLD_MS)) };
}
