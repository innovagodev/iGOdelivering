import type { ScheduledOrdersConfig } from '@/types/wizard';

/**
 * Impostazioni "Ordini programmati" e prenotazioni, con i valori predefiniti.
 *
 * - `pickup` e `delivery`: preavviso minimo e giorni di anticipo per asporto e
 *   consegna; `delivery.timeWindowMinutes` è ogni quanti minuti si propongono
 *   gli orari.
 * - `booking`: preavviso minimo e anticipo massimo delle PRENOTAZIONI del
 *   tavolo. Per chi ordina al tavolo (QR) non c'è preavviso: è già seduto.
 * - `onPremise` è il vecchio "Ordini al tavolo": non è più applicato da nessuna
 *   parte e non ha interfaccia. Resta nei dati per non perdere nulla.
 */
export const DEFAULT_SCHEDULED_ORDERS: ScheduledOrdersConfig = {
  enabled: true,
  pickup: { minNoticeValue: 30, minNoticeUnit: 'minuti', maxNoticeDays: 4 },
  delivery: { minNoticeValue: 1, minNoticeUnit: 'ore', maxNoticeDays: 4, timeWindowMinutes: 15 },
  booking: { minNoticeValue: 60, minNoticeUnit: 'minuti', maxNoticeDays: 30 },
  onPremise: { minNoticeValue: 30, minNoticeUnit: 'minuti', maxNoticeDays: 1 },
  hideAsap: false,
  pickupExpanded: true,
  deliveryExpanded: true,
  bookingExpanded: true,
  onPremiseExpanded: true,
  altroExpanded: true,
};

/**
 * Completa ciò che arriva dal database con i valori predefiniti. La colonna
 * `scheduled_orders` può essere vuota (`{}`) o mancare di sezioni nate dopo:
 * senza questo passaggio la pagina leggerebbe `undefined.minNoticeValue`.
 */
export const withScheduledDefaults = (raw: unknown): ScheduledOrdersConfig => {
  const d = DEFAULT_SCHEDULED_ORDERS;
  const so = raw && typeof raw === 'object' ? (raw as Record<string, any>) : {};
  const section = <T extends object>(base: T, extra: unknown): T =>
    extra && typeof extra === 'object' ? { ...base, ...(extra as object) } : { ...base };

  return {
    ...d,
    enabled: so.enabled ?? d.enabled,
    hideAsap: so.hideAsap ?? d.hideAsap,
    pickup: section(d.pickup, so.pickup),
    delivery: section(d.delivery, so.delivery),
    booking: section(d.booking, so.booking),
    onPremise: section(d.onPremise, so.onPremise),
  };
};
