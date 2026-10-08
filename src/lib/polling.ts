/**
 * Controllo periodico con ritmo adattivo, per chi aspetta una risposta del
 * server (stato di un ordine o di una prenotazione).
 *
 * Perché non un intervallo fisso: con un controllo ogni 3 secondi, 500 clienti
 * in attesa nello stesso momento fanno circa 170 richieste al secondo, ognuna
 * con una lettura sul database. Qui il ritmo rallenta man mano che si aspetta
 * e si ferma del tutto quando la scheda è nascosta (telefono bloccato, altra
 * app in primo piano); al ritorno controlla subito.
 */
export interface PollStep {
  /** Fino a quanti ms dall'inizio vale questo ritmo. */
  untilMs: number;
  /** Ogni quanti ms si controlla. */
  everyMs: number;
}

/**
 * Cliente in attesa: reattivo nella finestra in cui il ristorante deve
 * rispondere (3 minuti a locale aperto), poi sempre più rado.
 */
export const CUSTOMER_POLL_SCHEDULE: PollStep[] = [
  { untilMs: 60_000, everyMs: 4_000 },
  { untilMs: 180_000, everyMs: 6_000 },
  { untilMs: 900_000, everyMs: 15_000 },
  { untilMs: Infinity, everyMs: 30_000 },
];

/** Avvia i controlli; restituisce la funzione che li ferma. */
export function startAdaptivePolling(
  poll: () => Promise<unknown> | unknown,
  schedule: PollStep[] = CUSTOMER_POLL_SCHEDULE
): () => void {
  const startedAt = Date.now();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let inFlight = false;

  const nextDelay = () => {
    const elapsed = Date.now() - startedAt;
    return (schedule.find((s) => elapsed < s.untilMs) ?? schedule[schedule.length - 1]).everyMs;
  };

  const tick = async () => {
    timer = null;
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      await poll();
    } catch {
      // Rete assente o errore del server: si riprova al prossimo giro.
    } finally {
      inFlight = false;
    }
    if (!stopped && !document.hidden) timer = setTimeout(tick, nextDelay());
  };

  const onVisibility = () => {
    if (stopped) return;
    if (document.hidden) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    } else if (!timer && !inFlight) {
      void tick();
    }
  };

  document.addEventListener('visibilitychange', onVisibility);
  void tick();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
