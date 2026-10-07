/**
 * Traduzioni standard di allergeni e tag piatto, usate per suggerire il valore
 * inglese e per riempire i campi `_en` senza costringere il ristoratore a
 * digitarli. I valori non presenti nelle mappe restano invariati.
 */

export const STANDARD_ALLERGENS_MAP: Record<string, string> = {
  '🌾 Glutine': '🌾 Gluten',
  '🥛 Lattosio': '🥛 Lactose',
  '🥜 Arachidi': '🥜 Peanuts',
  '🥚 Uova': '🥚 Eggs',
  '🐟 Pesce': '🐟 Fish',
  '🦀 Crostacei': '🦀 Crustaceans',
  '🦪 Molluschi': '🦪 Molluscs',
  '🥜 Frutta a guscio': '🥜 Nuts',
  '🌾 Soia': '🌾 Soy',
  '🌱 Sedano': '🌱 Celery',
  '🍯 Senape': '🍯 Mustard',
  '🌾 Sesamo': '🌾 Sesame',
  '🍷 Anidride solforosa': '🍷 Sulphur dioxide',
  '🌱 Lupini': '🌱 Lupins',
};

export const STANDARD_TAGS_MAP: Record<string, string> = {
  'vegan:Vegano': 'vegan:Vegan',
  'leaf:Vegetariano': 'leaf:Vegetarian',
  'flame:Piccante': 'flame:Spicy',
  'wheat:Senza Glutine': 'wheat:Gluten Free',
  'sparkles:Novità': 'sparkles:New',
  'star:Consigliato': 'star:Recommended',
  'milk:Senza Lattosio': 'milk:Lactose Free',
  'snowflake:Surgelato': 'snowflake:Frozen',
};

export const getTranslationForAllergen = (a: string) => STANDARD_ALLERGENS_MAP[a] || a;

export const getTranslationForTag = (t: string) => STANDARD_TAGS_MAP[t] || t;

/** Un tag è salvato come `icona:Etichetta`; restituisce le due parti. */
export const splitTag = (tag: string): { prefix: string; label: string } => {
  const i = tag.indexOf(':');
  if (i === -1) return { prefix: '', label: tag };
  return { prefix: tag.slice(0, i), label: tag.slice(i + 1).trim() };
};

/**
 * Lista da mostrare in inglese: voce per voce usa la traduzione se c'è,
 * altrimenti l'originale italiano. Evita elenchi con buchi quando il
 * ristoratore ha tradotto solo una parte delle voci.
 */
export const mergeTranslated = (base: string[] = [], en: string[] = []): string[] =>
  base.map((value, i) => (en[i] && en[i].trim() ? en[i] : value));
