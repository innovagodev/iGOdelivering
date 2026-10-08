import { nowInZone } from '@/lib/serviceHours';

/**
 * Numeri della dashboard: un solo posto, usato da KPI, grafico e riepiloghi.
 *
 * Regole:
 * - "Oggi" è il giorno di Roma, lo stesso orologio con cui il server controlla
 *   gli orari: con la data del browser un tablet con fuso diverso conterebbe
 *   gli ordini sul giorno sbagliato.
 * - Un ordine annullato, rifiutato o scaduto non è un ordine né un incasso.
 * - Le variazioni percentuali si calcolano solo se il termine di confronto è
 *   maggiore di zero: da 0 a qualcosa non è "+100%", è "nessun dato di ieri".
 */

const NOT_COUNTED = new Set(['cancelled', 'rejected', 'expired']);

export interface DashboardOrder {
  status?: string | null;
  total?: number | string | null;
  created_at?: string | null;
}

export const isCountedOrder = (o: DashboardOrder) => !NOT_COUNTED.has(String(o.status ?? ''));

/** Giorno di Roma ("YYYY-MM-DD") di un istante. */
export const romeDay = (at: Date | string) => nowInZone('Europe/Rome', new Date(at)).date;

/** Giorno di calendario spostato di `days` giorni ("YYYY-MM-DD"). */
export const shiftDay = (day: string, days: number) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

export interface Totals {
  count: number;
  revenue: number;
  average: number;
}

const totalsOf = (orders: DashboardOrder[]): Totals => {
  const revenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  return {
    count: orders.length,
    revenue,
    average: orders.length > 0 ? revenue / orders.length : 0,
  };
};

/** Ordini conteggiabili di un giorno di Roma. */
export const ordersOfDay = <T extends DashboardOrder>(orders: T[], day: string): T[] =>
  orders.filter((o) => o.created_at && isCountedOrder(o) && romeDay(o.created_at) === day);

export interface DashboardKpis {
  today: Totals;
  /** Ieri fino alla stessa ora di adesso: confrontare con ieri intero penalizzerebbe la mattina. */
  yesterdaySoFar: Totals;
  pending: number;
}

export const computeKpis = (orders: DashboardOrder[], now = new Date()): DashboardKpis => {
  const { date: today, minutes } = nowInZone('Europe/Rome', now);
  const yesterday = shiftDay(today, -1);

  const todayOrders = ordersOfDay(orders, today);
  const yesterdaySoFar = ordersOfDay(orders, yesterday).filter(
    (o) => nowInZone('Europe/Rome', new Date(o.created_at as string)).minutes <= minutes
  );
  const pending = orders.filter((o) => o.status === 'new' || o.status === 'pending').length;

  return { today: totalsOf(todayOrders), yesterdaySoFar: totalsOf(yesterdaySoFar), pending };
};

/** Variazione percentuale a un decimale, oppure null se il confronto non ha senso. */
export const percentChange = (current: number, previous: number): number | null =>
  previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null;
