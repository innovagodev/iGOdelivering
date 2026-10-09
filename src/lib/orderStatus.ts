/**
 * Stato di un ordine come lo vede il ristoratore, in un posto solo (dashboard e storico).
 *
 * Un ordine "nuovo" non accettato entro la scadenza è perso anche se nel database è
 * rimasto 'new' (lo stesso criterio di Ordini live): senza questa regola uno storico di
 * una settimana fa mostrerebbe ordini ancora "da accettare".
 */

export type OrderTone = 'success' | 'danger' | 'info' | 'warning' | 'primary' | 'neutral';

export interface OrderLike {
  status?: string | null;
  payment_status?: string | null;
  accept_deadline?: string | null;
  scheduled_at?: string | null;
  created_at?: string | null;
}

/** Stato effettivo: 'new'/'pending' scaduti e non incassati diventano 'expired'. */
export const effectiveStatus = (o: OrderLike, now = Date.now()): string => {
  const st = String(o.status ?? '');
  if (st !== 'new' && st !== 'pending') return st;
  if (o.payment_status === 'paid' || o.payment_status === 'partially_refunded') return st;
  if (o.accept_deadline) return now >= new Date(o.accept_deadline).getTime() ? 'expired' : st;
  if (!o.scheduled_at && o.created_at && now - new Date(o.created_at).getTime() >= 3 * 60000) return 'expired';
  return st;
};

export const STATUS_LABEL: Record<string, string> = {
  new: 'Da accettare',
  pending: 'Da accettare',
  accepted: 'In corso',
  preparing: 'In corso',
  ready: 'In corso',
  delivering: 'In corso',
  delivered: 'Consegnato',
  completed: 'Consegnato',
  cancelled: 'Annullato',
  rejected: 'Rifiutato',
  expired: 'Perso',
};

export const statusLabel = (status: string): string => STATUS_LABEL[status] ?? 'Altro';

export const statusTone = (status: string): OrderTone => {
  switch (status) {
    case 'delivered':
    case 'completed':
      return 'success';
    case 'cancelled':
    case 'rejected':
    case 'expired':
      return 'danger';
    case 'accepted':
    case 'preparing':
    case 'ready':
    case 'delivering':
      return 'info';
    case 'new':
    case 'pending':
      return 'warning';
    default:
      return 'neutral';
  }
};

/** Gruppo per il filtro dello storico. */
export type StatusGroup = 'all' | 'done' | 'open' | 'lost';
export const statusGroupOf = (status: string): Exclude<StatusGroup, 'all'> => {
  if (status === 'delivered' || status === 'completed') return 'done';
  if (status === 'cancelled' || status === 'rejected' || status === 'expired') return 'lost';
  return 'open';
};

export const typeLabel = (type?: string | null): string =>
  type === 'domicilio' ? 'Domicilio' : type === 'asporto' ? 'Asporto' : type === 'tavolo' ? 'Tavolo' : '—';

export const paymentLabel = (o: { payment_method?: string | null; payment_status?: string | null }): string =>
  o.payment_status === 'paid'
    ? 'Online · pagato'
    : o.payment_status === 'refunded' || o.payment_status === 'partially_refunded'
      ? 'Online · rimborsato'
      : o.payment_status === 'voided'
        ? 'Online · non addebitato'
        : o.payment_method === 'pos'
          ? 'POS'
          : o.payment_method === 'cash'
            ? 'Contanti'
            : o.payment_method === 'online'
              ? 'Online'
              : '—';
