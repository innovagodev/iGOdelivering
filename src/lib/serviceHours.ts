/**
 * Orari di servizio e ordini programmati: regole condivise da vetrina e
 * /api/orders (rilievo N16 di AUDIT_REPORT.md).
 *
 * Prima vivevano solo nella vetrina, in più copie leggermente diverse, e il
 * server non le applicava: un ordine poteva arrivare per un servizio sospeso o
 * fuori orario. Una sola implementazione evita che vetrina e server tornino a
 * divergere.
 *
 * Tutti gli orari sono in minuti dalla mezzanotte. "00:00" come fine di una
 * fascia vale 1440, cioè mezzanotte: confrontare gli orari come stringhe
 * ("20:00" <= "00:00" è falso) faceva risultare chiuso per tutta la sera un
 * locale che chiude a mezzanotte.
 */

export type ServiceKind = 'delivery' | 'pickup';

interface DayConfig {
  enabled?: boolean;
  open?: boolean;
  lunchEnabled?: boolean;
  dinnerEnabled?: boolean;
  lunch?: { from?: string; to?: string };
  dinner?: { from?: string; to?: string };
}

export interface HoursConfig {
  useGeneral?: Partial<Record<string, boolean>>;
  serviceHours?: Record<string, Record<string, DayConfig> | undefined>;
  serviceSuspended?: Partial<Record<string, boolean>>;
  temporaryClosure?: {
    enabled?: boolean;
    from?: string;
    to?: string;
    message?: string;
    messageEn?: string;
  };
}

interface ScheduledServiceConfig {
  minNoticeValue?: number;
  minNoticeUnit?: string;
  maxNoticeDays?: number;
  timeWindowMinutes?: number;
}

export interface ScheduledOrdersConfig {
  delivery?: ScheduledServiceConfig;
  pickup?: ScheduledServiceConfig;
  onPremise?: ScheduledServiceConfig;
}

export const DAY_NAMES_IT = [
  'Domenica',
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato',
];

export const toMinutes = (t: string, isEnd = false): number => {
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  const total = h * 60 + m;
  return isEnd && total === 0 ? 24 * 60 : total;
};

/** Giorno della settimana di una data YYYY-MM-DD, senza passare dal fuso. */
export const dayNameOf = (date: string): string => {
  const [y, m, d] = date.split('-').map(Number);
  return DAY_NAMES_IT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
};

export const isTemporarilyClosed = (config: HoursConfig | null | undefined, date: string) => {
  const c = config?.temporaryClosure;
  return !!(c?.enabled && c.from && c.to && date >= c.from && date <= c.to);
};

export const isSuspended = (config: HoursConfig | null | undefined, service: ServiceKind) =>
  config?.serviceSuspended?.[service] === true;

/**
 * Fasce di apertura di un servizio in una data, in minuti. `null` se il
 * locale non ha orari configurati (nessun vincolo applicabile).
 */
export const serviceRanges = (
  config: HoursConfig | null | undefined,
  service: ServiceKind,
  date: string
): { start: number; end: number }[] | null => {
  if (!config?.serviceHours) return null;
  const useGeneral = config.useGeneral?.[service] !== false && !!config.serviceHours.general;
  const day = config.serviceHours[useGeneral ? 'general' : service]?.[dayNameOf(date)];
  if (!day) return null;
  if (day.enabled === false || day.open === false) return [];
  const ranges: { start: number; end: number }[] = [];
  if (day.lunchEnabled !== false && day.lunch?.from && day.lunch?.to) {
    ranges.push({ start: toMinutes(day.lunch.from), end: toMinutes(day.lunch.to, true) });
  }
  if (day.dinnerEnabled !== false && day.dinner?.from && day.dinner?.to) {
    ranges.push({ start: toMinutes(day.dinner.from), end: toMinutes(day.dinner.to, true) });
  }
  return ranges;
};

/** Il servizio è aperto in quel momento? Senza orari configurati: sì. */
export const isServiceOpenAt = (
  config: HoursConfig | null | undefined,
  service: ServiceKind,
  date: string,
  minutes: number
): boolean => {
  if (isTemporarilyClosed(config, date) || isSuspended(config, service)) return false;
  const ranges = serviceRanges(config, service, date);
  if (ranges === null) return true;
  return ranges.some((r) => minutes >= r.start && minutes <= r.end);
};

const scheduledFor = (
  scheduled: ScheduledOrdersConfig | null | undefined,
  service: ServiceKind
): ScheduledServiceConfig | undefined =>
  service === 'delivery' ? scheduled?.delivery : scheduled?.pickup;

/**
 * Preavviso minimo in minuti. Il pannello salva l'unità in italiano
 * ("minuti", "ore"); la vetrina riconosceva solo "hours", e un preavviso di
 * un'ora diventava di un minuto.
 */
export const minNoticeMinutes = (
  scheduled: ScheduledOrdersConfig | null | undefined,
  service: ServiceKind
): number => {
  const c = scheduledFor(scheduled, service);
  if (!c) return 30;
  const value = Number(c.minNoticeValue) || 0;
  const unit = (c.minNoticeUnit || 'minutes').toLowerCase();
  return unit === 'hours' || unit === 'ore' || unit === 'ora' ? value * 60 : value;
};

export const maxNoticeDays = (
  scheduled: ScheduledOrdersConfig | null | undefined,
  service: ServiceKind
): number => scheduledFor(scheduled, service)?.maxNoticeDays ?? 7;

/** Data e minuti correnti in un fuso, per il server (Europe/Rome). */
export const nowInZone = (timeZone = 'Europe/Rome', at = new Date()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
};

const daysBetween = (from: string, to: string) => {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
};

export type ScheduleCheck =
  | { ok: true }
  | {
      ok: false;
      reason: 'closed_holiday' | 'suspended' | 'missing_time' | 'too_soon' | 'too_far' | 'out_of_hours';
    };

/**
 * Un ordine a domicilio o d'asporto per l'orario indicato è accettabile?
 * Stesse regole con cui la vetrina genera gli orari selezionabili, più il
 * controllo di sospensione e chiusura che la vetrina applica altrove.
 *
 * `graceMinutes` assorbe il tempo fra la generazione degli orari nella
 * pagina e l'invio dell'ordine: senza, il primo orario disponibile
 * scadrebbe mentre il cliente compila il modulo.
 */
export const checkSchedule = (
  config: HoursConfig | null | undefined,
  scheduled: ScheduledOrdersConfig | null | undefined,
  service: ServiceKind,
  slot: { date: string; minutes: number } | null,
  now: { date: string; minutes: number },
  graceMinutes = 15
): ScheduleCheck => {
  if (isTemporarilyClosed(config, now.date)) return { ok: false, reason: 'closed_holiday' };
  if (isSuspended(config, service)) return { ok: false, reason: 'suspended' };
  if (!slot) return { ok: false, reason: 'missing_time' };

  const ahead = daysBetween(now.date, slot.date);
  if (ahead < 0) return { ok: false, reason: 'too_soon' };
  if (ahead > maxNoticeDays(scheduled, service)) return { ok: false, reason: 'too_far' };
  if (isTemporarilyClosed(config, slot.date)) return { ok: false, reason: 'closed_holiday' };

  const absSlot = ahead * 1440 + slot.minutes;
  if (absSlot < now.minutes + minNoticeMinutes(scheduled, service) - graceMinutes) {
    return { ok: false, reason: 'too_soon' };
  }

  const ranges = serviceRanges(config, service, slot.date);
  if (ranges !== null && !ranges.some((r) => slot.minutes >= r.start && slot.minutes <= r.end)) {
    return { ok: false, reason: 'out_of_hours' };
  }
  return { ok: true };
};
