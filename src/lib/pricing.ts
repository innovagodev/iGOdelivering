/**
 * Regole di calcolo del totale d'ordine usate da /api/orders.
 *
 * I prezzi non stanno qui: quello base viene da `menu_items.price`, quelli
 * delle opzioni da `menu_items.option_groups`, entrambi configurati dal
 * ristoratore e letti dal database al momento dell'ordine (rilievo C8 di
 * AUDIT_REPORT.md). Qui restano solo le regole: conversione in centesimi e
 * sconto.
 *
 * Tutti gli importi del calcolo sono in CENTESIMI interi: le colonne sono
 * numeric(10,2) e la somma di float in euro accumula errori di arrotondamento.
 */

export type OrderType = 'domicilio' | 'asporto' | 'tavolo';

export const toCents = (euros: number): number => Math.round(euros * 100);
export const fromCents = (cents: number): number => cents / 100;

export interface PromoForPricing {
  type: string;
  value: number;
}

/**
 * Sconto in centesimi. Stesse regole della vetrina: percentuale (anche
 * first_order) sul totale articoli, free_delivery pari alla consegna, ogni
 * altro tipo come importo fisso limitato al totale articoli.
 */
export const computeDiscountCents = (
  promo: PromoForPricing | null,
  itemsCents: number,
  deliveryCents: number
): number => {
  if (!promo) return 0;
  if (promo.type === 'percentage' || promo.type === 'first_order') {
    return Math.round((itemsCents * promo.value) / 100);
  }
  if (promo.type === 'free_delivery') return deliveryCents;
  return Math.min(toCents(promo.value), itemsCents);
};
