'use client';

import React from 'react';
import { MenuItem } from '@/types';

interface TranslationStatusProps {
  items: MenuItem[];
  categories: string[];
  categoriesEn: Record<string, string>;
  onOpenTranslations?: () => void;
}

interface MissingEntry {
  label: string;
  missing: string[];
  itemId?: string;
}

const empty = (v?: string | null) => !v || !v.trim();

/** Cosa manca in inglese su un piatto (vuoto = piatto completo). */
export function getItemMissing(item: MenuItem): string[] {
  const missing: string[] = [];
  if (empty(item.name_en)) missing.push('nome');
  if (!empty(item.description) && empty(item.description_en)) missing.push('descrizione');
  const ings = item.ingredients || [];
  const ingsEn = item.ingredients_en || [];
  if (ings.length > 0 && ings.some((_, i) => empty(ingsEn[i]))) missing.push('ingredienti');
  const allergens = item.allergens || [];
  if (allergens.length > 0 && allergens.some((_, i) => empty(item.allergens_en?.[i])))
    missing.push('allergeni');
  const tags = item.dishTags || [];
  if (tags.length > 0 && tags.some((_, i) => empty(item.dishTagsEn?.[i]))) missing.push('tag');

  (item.optionGroups || []).forEach((g) => {
    const isSupplements =
      g.id === 'supplementi-singoli' || g.name === 'Supplementi' || g.name === 'Supplementi Singoli';
    if (!isSupplements && empty(g.name_en)) missing.push(`gruppo «${g.name}»`);
    const choices = (g.choices || []).filter((c) => empty(c.name_en));
    if (choices.length > 0)
      missing.push(
        isSupplements
          ? `supplementi (${choices.map((c) => c.name).join(', ')})`
          : `scelte di «${g.name}» (${choices.map((c) => c.name).join(', ')})`
      );
  });
  return missing;
}

/** Elenca cosa manca in inglese, cioè ciò che il cliente straniero vedrebbe ancora in italiano. */
export function computeMissingTranslations(
  items: MenuItem[],
  categories: string[],
  categoriesEn: Record<string, string>
): MissingEntry[] {
  const out: MissingEntry[] = [];

  categories.forEach((cat) => {
    if (empty(categoriesEn[cat])) out.push({ label: `Categoria «${cat}»`, missing: ['nome'] });
  });

  items.forEach((item) => {
    const missing = getItemMissing(item);
    if (missing.length > 0) out.push({ label: item.name, missing, itemId: item.id });
  });

  return out;
}

export default function TranslationStatus({
  items,
  categories,
  categoriesEn,
  onOpenTranslations,
}: TranslationStatusProps) {
  const missing = React.useMemo(
    () => computeMissingTranslations(items, categories, categoriesEn),
    [items, categories, categoriesEn]
  );

  if (items.length === 0) return null;

  if (missing.length === 0) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-xs font-semibold text-emerald-700">
        🌐 Menu completamente tradotto in inglese: i clienti stranieri vedono tutto nella loro lingua.
      </div>
    );
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div>
        <p className="font-bold text-amber-800">
          🌐 Traduzione inglese facoltativa: {missing.length}{' '}
          {missing.length === 1 ? 'voce' : 'voci'} da completare
        </p>
        <p className="text-amber-700/90 mt-0.5">
          Ciò che manca viene mostrato in italiano ai clienti che usano il menu in inglese.
        </p>
      </div>
      {onOpenTranslations && (
        <button
          type="button"
          onClick={onOpenTranslations}
          className="bg-amber-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-700 whitespace-nowrap cursor-pointer"
        >
          Completa traduzioni
        </button>
      )}
    </div>
  );
}
