/**
 * Listino delle personalizzazioni e regole di calcolo del totale d'ordine.
 *
 * È l'UNICA fonte di questi valori, condivisa fra la vetrina (che li mostra)
 * e /api/orders (che li applica). Prima vivevano solo nel componente della
 * vetrina, e il server non aveva modo di sapere quanto costasse un extra:
 * prezzi e totali arrivavano già calcolati dal browser e venivano scritti così
 * com'erano (rilievo C8 di AUDIT_REPORT.md). Un prezzo cambiato qui cambia
 * in entrambi i punti; un prezzo cambiato altrove non ha effetto sul server.
 *
 * Tutti gli importi del calcolo sono in CENTESIMI interi: le colonne sono
 * numeric(10,2) e la somma di float in euro accumula errori di arrotondamento.
 */

export type OrderType = 'domicilio' | 'asporto' | 'tavolo';

export interface PricedExtra {
  name: string;
  price: number;
}

export const getCustomizationOptions = (
  category: string
): { extras: PricedExtra[]; removes: string[] } => {
  const normalized = (category || '').toLowerCase();
  if (normalized === 'pizza') {
    return {
      extras: [
        { name: 'Doppia Mozzarella', price: 1.5 },
        { name: 'Prosciutto Cotto', price: 1.5 },
        { name: 'Funghi Champignon', price: 1.0 },
        { name: 'Salame Piccante', price: 1.5 },
        { name: 'Olive Nere', price: 0.8 },
      ],
      removes: ['Basilico', 'Origano', 'Mozzarella'],
    };
  }
  if (normalized === 'primi' || normalized === 'secondi' || normalized === 'antipasti') {
    return {
      extras: [
        { name: 'Parmigiano Reggiano', price: 1.2 },
        { name: 'Pane extra', price: 1.0 },
        { name: 'Olio al tartufo', price: 2.0 },
        { name: 'Pancetta croccante', price: 1.5 },
      ],
      removes: ['Pepe', 'Cipolla', 'Aglio', 'Prezzemolo'],
    };
  }
  if (normalized === 'dolci') {
    return {
      extras: [
        { name: 'Panna montata', price: 1.0 },
        { name: 'Granella di nocciole', price: 0.8 },
        { name: 'Cioccolato fuso', price: 1.2 },
      ],
      removes: [],
    };
  }
  if (normalized === 'bevande') {
    return {
      extras: [
        { name: 'Ghiaccio', price: 0.0 },
        { name: 'Fetta di limone', price: 0.5 },
      ],
      removes: ['Ghiaccio'],
    };
  }
  return { extras: [], removes: [] };
};

/**
 * Impasti e cotture. `cartName` è la voce che la vetrina aggiunge agli
 * `addedIngredients` quando lo stile è scelto; 'classico' non aggiunge nulla.
 */
export const COOKING_STYLES = [
  { id: 'classico', label: 'Classico', price: 0.0, cartName: null },
  { id: 'ben-cotto', label: 'Ben Cotto', price: 0.0, cartName: 'Cottura: Ben Cotto' },
  { id: 'calzone', label: 'A Calzone', price: 0.0, cartName: 'Stile: A Calzone' },
  { id: 'schiacciata', label: 'A Schiacciata', price: 1.5, cartName: 'Stile: A Schiacciata' },
] as const;

export type CookingStyleId = (typeof COOKING_STYLES)[number]['id'];

export const hasCookingStyles = (category: string): boolean => {
  const c = (category || '').toLowerCase();
  return c.includes('pizz') || c.includes('panin') || c.includes('burger');
};

/** Voci aggiungibili a un piatto di quella categoria, con il loro prezzo. */
export const allowedAdditionsFor = (category: string): Map<string, number> => {
  const allowed = new Map<string, number>();
  for (const e of getCustomizationOptions(category).extras) allowed.set(e.name, e.price);
  if (hasCookingStyles(category)) {
    for (const s of COOKING_STYLES) if (s.cartName) allowed.set(s.cartName, s.price);
  }
  return allowed;
};

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
