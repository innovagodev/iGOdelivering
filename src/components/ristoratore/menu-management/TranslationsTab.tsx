'use client';

import React from 'react';
import { Search } from 'lucide-react';
import TRow from '@/components/shared/TranslationRow';
import { supabase } from '@/lib/supabase';
import { MenuItem, OptionGroup } from '@/types';
import {
  getTranslationForAllergen,
  getTranslationForTag,
  splitTag,
} from '@/lib/menu-translations';
import { getItemMissing } from './TranslationStatus';

interface TranslationsTabProps {
  restaurantId: string;
  items: MenuItem[];
  setItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  categories: string[];
  categoriesEn: Record<string, string>;
  setCategoriesEn: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  /** Apre il form completo del piatto (per modifiche diverse dalla traduzione). */
  onEditItem?: (id: string) => void;
}

const isSupplementGroup = (g: OptionGroup) =>
  g.id === 'supplementi-singoli' || g.name === 'Supplementi' || g.name === 'Supplementi Singoli';

const isEmptyStr = (v?: string | null) => !v || !v.trim();

/**
 * Gruppo di opzioni condiviso: lo stesso gruppo (per nome) compare su più
 * piatti. Si traduce una volta e il valore viene applicato a tutti.
 */
interface SharedGroup {
  key: string;
  name: string;
  supplements: boolean;
  count: number;
  nameEn: string;
  defaults: Map<string, string>; // opzione predefinita IT -> EN
  choices: Map<string, string>; // scelta IT -> EN
}

const groupKey = (g: OptionGroup) =>
  isSupplementGroup(g) ? 'S::supplementi' : `G::${g.name.trim().toLowerCase()}`;

const buildSharedGroups = (items: MenuItem[]): SharedGroup[] => {
  const map = new Map<string, SharedGroup>();
  items.forEach((item) => {
    (item.optionGroups || []).forEach((g) => {
      const key = groupKey(g);
      let sg = map.get(key);
      if (!sg) {
        sg = {
          key,
          name: isSupplementGroup(g) ? 'Aggiunte / Supplementi' : g.name,
          supplements: isSupplementGroup(g),
          count: 0,
          nameEn: '',
          defaults: new Map(),
          choices: new Map(),
        };
        map.set(key, sg);
      }
      sg.count += 1;
      if (!sg.nameEn && !isEmptyStr(g.name_en)) sg.nameEn = g.name_en as string;
      if (g.defaultOption) {
        const cur = sg.defaults.get(g.defaultOption) || '';
        sg.defaults.set(g.defaultOption, cur || g.defaultOptionEn || '');
      }
      (g.choices || []).forEach((c) => {
        const cur = sg!.choices.get(c.name) || '';
        sg!.choices.set(c.name, cur || c.name_en || '');
      });
    });
  });
  return Array.from(map.values());
};

const sharedGroupMissing = (g: SharedGroup) =>
  (!g.supplements && isEmptyStr(g.nameEn)) ||
  Array.from(g.defaults.values()).some(isEmptyStr) ||
  Array.from(g.choices.values()).some(isEmptyStr);

const padTo = (arr: string[] | undefined, len: number) =>
  Array.from({ length: len }, (_, i) => arr?.[i] ?? '');

export default function TranslationsTab({
  restaurantId,
  items,
  setItems,
  categories,
  categoriesEn,
  setCategoriesEn,
  onEditItem,
}: TranslationsTabProps) {
  const [onlyMissing, setOnlyMissing] = React.useState(true);
  const [search, setSearch] = React.useState('');

  const itemMissing = React.useMemo(
    () => new Map(items.map((i) => [i.id, getItemMissing(i)])),
    [items]
  );
  // Piatti/categorie da completare al momento in cui il filtro è stato attivato:
  // restano visibili anche dopo averli completati, così non spariscono mentre si scrive.
  const [pinnedItems, setPinnedItems] = React.useState<Set<string>>(new Set());
  const [pinnedCats, setPinnedCats] = React.useState<Set<string>>(new Set());
  const itemsRef = React.useRef(items);
  itemsRef.current = items;
  const catsRef = React.useRef({ categories, categoriesEn });
  catsRef.current = { categories, categoriesEn };
  React.useEffect(() => {
    if (!onlyMissing) return;
    setPinnedItems(
      new Set(itemsRef.current.filter((i) => getItemMissing(i).length > 0).map((i) => i.id))
    );
    setPinnedCats(
      new Set(
        catsRef.current.categories.filter((c) => !(catsRef.current.categoriesEn[c] || '').trim())
      )
    );
  }, [onlyMissing]);
  const completeCount = items.filter((i) => (itemMissing.get(i.id) || []).length === 0).length;
  const missingCats = categories.filter((c) => !(categoriesEn[c] || '').trim());
  const sharedGroups = React.useMemo(() => buildSharedGroups(items), [items]);
  const [pinnedShared, setPinnedShared] = React.useState<Set<string>>(new Set());
  const sharedRef = React.useRef(sharedGroups);
  sharedRef.current = sharedGroups;
  React.useEffect(() => {
    if (!onlyMissing) return;
    setPinnedShared(new Set(sharedRef.current.filter(sharedGroupMissing).map((g) => g.key)));
  }, [onlyMissing]);
  const [bulkState, setBulkState] = React.useState<'idle' | 'saving' | 'error'>('idle');


  /** Aggiorna SOLO le colonne indicate del piatto: il resto della riga non viene toccato. */
  const persistItem = async (
    item: MenuItem,
    dbPatch: Record<string, unknown>,
    statePatch: Partial<MenuItem>
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('menu_items')
      .update(dbPatch)
      .eq('id', item.id)
      .eq('restaurant_id', restaurantId);
    if (error) {
      console.error('Error saving translation:', error);
      return false;
    }
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...statePatch } : i)));
    return true;
  };

  const saveCategory = async (cat: string, value: string) => {
    const { error } = await supabase
      .from('menu_categories')
      .update({ name_en: value || null })
      .eq('restaurant_id', restaurantId)
      .eq('name', cat);
    if (error) {
      console.error('Error saving category translation:', error);
      return false;
    }
    setCategoriesEn((p) => {
      const next = { ...p };
      if (value) next[cat] = value;
      else delete next[cat];
      return next;
    });
    return true;
  };

  const saveList = (
    item: MenuItem,
    key: 'ingredients_en' | 'allergens_en' | 'dishTagsEn',
    dbKey: string,
    length: number,
    idx: number,
    value: string
  ) => {
    const next = padTo(item[key] as string[] | undefined, length);
    next[idx] = value;
    const stored = next.every((v) => !v.trim()) ? [] : next;
    return persistItem(item, { [dbKey]: stored }, { [key]: stored } as Partial<MenuItem>);
  };

  const saveGroups = (item: MenuItem, fn: (g: OptionGroup[]) => OptionGroup[]) => {
    const next = fn(item.optionGroups || []);
    return persistItem(item, { option_groups: next }, { optionGroups: next });
  };

  /**
   * Applica una modifica a TUTTI i piatti che usano il gruppo condiviso.
   * Aggiorna solo la colonna option_groups dei piatti coinvolti e solo se è
   * davvero cambiata.
   */
  const applyToGroup = async (
    key: string,
    fn: (g: OptionGroup) => OptionGroup
  ): Promise<boolean> => {
    setBulkState('saving');
    const jobs: Promise<boolean>[] = [];
    items.forEach((item) => {
      const groups = item.optionGroups || [];
      if (!groups.some((g) => groupKey(g) === key)) return;
      const next = groups.map((g) => (groupKey(g) === key ? fn(g) : g));
      if (JSON.stringify(next) === JSON.stringify(groups)) return;
      jobs.push(persistItem(item, { option_groups: next }, { optionGroups: next }));
    });
    const results = await Promise.all(jobs);
    const ok = results.every(Boolean);
    setBulkState(ok ? 'idle' : 'error');
    return ok;
  };

  const q = search.trim().toLowerCase();
  const visibleItems = items.filter((i) => {
    if (q && !i.name.toLowerCase().includes(q) && !i.category.toLowerCase().includes(q))
      return false;
    if (onlyMissing && !pinnedItems.has(i.id) && (itemMissing.get(i.id) || []).length === 0)
      return false;
    return true;
  });

  const categoryOrder = [...categories];
  items.forEach((i) => {
    if (!categoryOrder.includes(i.category)) categoryOrder.push(i.category);
  });

  const pct = items.length ? Math.round((completeCount / items.length) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Intestazione + avanzamento */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground">🌐 Traduzioni in inglese</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Facoltativo. Ciò che non traduci viene mostrato in italiano anche ai clienti che
              usano il menu in inglese. Il testo si salva da solo quando esci dal campo.
            </p>
          </div>
          <div className="text-xs font-semibold text-foreground whitespace-nowrap">
            {completeCount} / {items.length} piatti completi
            {categories.length > 0 && ` · ${categories.length - missingCats.length}/${categories.length} categorie`}
          </div>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca piatto o categoria..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyMissing}
              onChange={(e) => setOnlyMissing(e.target.checked)}
              className="accent-primary"
            />
            Mostra solo da completare
          </label>
        </div>
      </div>

      {/* Categorie */}
      {categories.length > 0 && (!onlyMissing || pinnedCats.size > 0 || missingCats.length > 0) && !q && (
        <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Categorie</h4>
          {(onlyMissing
            ? categories.filter((c) => pinnedCats.has(c) || missingCats.includes(c))
            : categories
          ).map((cat) => (
            <TRow
              key={cat}
              source={cat}
              value={categoriesEn[cat] || ''}
              onSave={(v) => saveCategory(cat, v)}
            />
          ))}
        </section>
      )}

      {/* Gruppi di opzioni condivisi tra piatti: si traducono una volta sola */}
      {(() => {
        const list = sharedGroups.filter((g) => {
          if (q && !g.name.toLowerCase().includes(q)) return false;
          return !onlyMissing || pinnedShared.has(g.key) || sharedGroupMissing(g);
        });
        if (list.length === 0) return null;
        return (
          <section className="space-y-2">
            <div className="px-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Opzioni condivise tra piatti ({list.length})
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Impasti, aggiunte e simili: traduci una volta e il valore vale per tutti i piatti che
                li usano.
                {bulkState === 'saving' && ' Salvataggio in corso…'}
                {bulkState === 'error' && ' Alcuni piatti non sono stati aggiornati, riprova.'}
              </p>
            </div>
            {list.map((g) => (
              <details
                key={g.key}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none list-none hover:bg-muted/20">
                  <span className="font-semibold text-sm text-foreground truncate">
                    {g.name}{' '}
                    <span className="font-normal text-muted-foreground">
                      · {g.count} {g.count === 1 ? 'piatto' : 'piatti'}
                    </span>
                  </span>
                  {sharedGroupMissing(g) ? (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5 whitespace-nowrap">
                      da completare
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5 whitespace-nowrap">
                      ✓ Completo
                    </span>
                  )}
                </summary>
                <div className="px-4 pb-4 pt-3 space-y-3 border-t border-border/60">
                  {!g.supplements && (
                    <TRow
                      label="Nome gruppo"
                      source={g.name}
                      value={g.nameEn}
                      onSave={(v) =>
                        applyToGroup(g.key, (x) => ({ ...x, name_en: v || undefined }))
                      }
                    />
                  )}
                  {Array.from(g.defaults.entries()).map(([it, en]) => (
                    <TRow
                      key={`def-${it}`}
                      label="Opzione predefinita"
                      source={it}
                      value={en}
                      onSave={(v) =>
                        applyToGroup(g.key, (x) =>
                          x.defaultOption === it ? { ...x, defaultOptionEn: v || undefined } : x
                        )
                      }
                    />
                  ))}
                  {Array.from(g.choices.entries()).map(([it, en]) => (
                    <TRow
                      key={`ch-${it}`}
                      source={it}
                      value={en}
                      onSave={(v) =>
                        applyToGroup(g.key, (x) => ({
                          ...x,
                          choices: (x.choices || []).map((y) =>
                            y.name === it ? { ...y, name_en: v || undefined } : y
                          ),
                        }))
                      }
                    />
                  ))}
                </div>
              </details>
            ))}
          </section>
        );
      })()}

      {/* Piatti, raggruppati per categoria */}
      {categoryOrder.map((cat) => {
        const list = visibleItems.filter((i) => i.category === cat);
        if (list.length === 0) return null;
        return (
          <section key={cat} className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
              {cat} <span className="font-normal">({list.length})</span>
            </h4>
            {list.map((item) => {
              const missing = itemMissing.get(item.id) || [];
              const ings = item.ingredients || [];
              const allergens = item.allergens || [];
              const tags = item.dishTags || [];
              const groups = item.optionGroups || [];
              return (
                <details
                  key={item.id}
                  className="group bg-card border border-border rounded-2xl overflow-hidden"
                >
                  <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none list-none hover:bg-muted/20">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {item.name}
                    </span>
                    {missing.length === 0 ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5 whitespace-nowrap">
                        ✓ Completo
                      </span>
                    ) : (
                      <span
                        className="text-[11px] font-bold text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5 whitespace-nowrap"
                        title={missing.join(', ')}
                      >
                        {missing.length} da completare
                      </span>
                    )}
                  </summary>

                  <div className="px-4 pb-4 pt-1 space-y-4 border-t border-border/60">
                    <TRow
                      label="Nome"
                      source={item.name}
                      value={item.name_en || ''}
                      onSave={(v) => persistItem(item, { name_en: v || null }, { name_en: v })}
                    />
                    {item.description && (
                      <TRow
                        label="Descrizione"
                        source={item.description}
                        value={item.description_en || ''}
                        multiline
                        onSave={(v) =>
                          persistItem(item, { description_en: v || null }, { description_en: v })
                        }
                      />
                    )}

                    {ings.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                          Ingredienti
                        </p>
                        {ings.map((ing, idx) => (
                          <TRow
                            key={`ing-${idx}`}
                            source={ing}
                            value={item.ingredients_en?.[idx] || ''}
                            onSave={(v) =>
                              saveList(item, 'ingredients_en', 'ingredients_en', ings.length, idx, v)
                            }
                          />
                        ))}
                      </div>
                    )}

                    {allergens.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                          Allergeni
                        </p>
                        {allergens.map((a, idx) => (
                          <TRow
                            key={`all-${idx}`}
                            source={a}
                            suggestion={getTranslationForAllergen(a)}
                            value={item.allergens_en?.[idx] || ''}
                            onSave={(v) =>
                              saveList(item, 'allergens_en', 'allergens_en', allergens.length, idx, v)
                            }
                          />
                        ))}
                      </div>
                    )}

                    {tags.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                          Tag
                        </p>
                        {tags.map((tag, idx) => {
                          const { prefix, label } = splitTag(tag);
                          const enFull = item.dishTagsEn?.[idx] || '';
                          return (
                            <TRow
                              key={`tag-${idx}`}
                              source={label}
                              suggestion={splitTag(getTranslationForTag(tag)).label}
                              value={enFull ? splitTag(enFull).label : ''}
                              onSave={(v) =>
                                saveList(
                                  item,
                                  'dishTagsEn',
                                  'dish_tags_en',
                                  tags.length,
                                  idx,
                                  v ? (prefix ? `${prefix}:${v}` : v) : ''
                                )
                              }
                            />
                          );
                        })}
                      </div>
                    )}

                    {groups.map((g) => {
                      const supp = isSupplementGroup(g);
                      return (
                        <div key={g.id} className="space-y-2">
                          <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                            {supp ? 'Aggiunte / Supplementi' : `Opzioni: ${g.name}`}
                          </p>
                          {!supp && (
                            <TRow
                              label="Nome gruppo"
                              source={g.name}
                              value={g.name_en || ''}
                              onSave={(v) =>
                                saveGroups(item, (all) =>
                                  all.map((x) =>
                                    x.id === g.id ? { ...x, name_en: v || undefined } : x
                                  )
                                )
                              }
                            />
                          )}
                          {g.defaultOption && (
                            <TRow
                              label="Opzione predefinita"
                              source={g.defaultOption}
                              value={g.defaultOptionEn || ''}
                              onSave={(v) =>
                                saveGroups(item, (all) =>
                                  all.map((x) =>
                                    x.id === g.id ? { ...x, defaultOptionEn: v || undefined } : x
                                  )
                                )
                              }
                            />
                          )}
                          {(g.choices || []).map((c) => (
                            <TRow
                              key={c.id}
                              source={c.name}
                              value={c.name_en || ''}
                              onSave={(v) =>
                                saveGroups(item, (all) =>
                                  all.map((x) =>
                                    x.id === g.id
                                      ? {
                                          ...x,
                                          choices: x.choices.map((y) =>
                                            y.id === c.id ? { ...y, name_en: v || undefined } : y
                                          ),
                                        }
                                      : x
                                  )
                                )
                              }
                            />
                          ))}
                        </div>
                      );
                    })}

                    {onEditItem && (
                      <button
                        type="button"
                        onClick={() => onEditItem(item.id)}
                        className="text-xs font-semibold text-muted-foreground hover:text-primary hover:underline cursor-pointer"
                      >
                        Modifica altri dati del piatto →
                      </button>
                    )}
                  </div>
                </details>
              );
            })}
          </section>
        );
      })}

      {visibleItems.length === 0 && (
        <div className="text-center py-10 text-sm text-muted-foreground">
          {items.length === 0
            ? 'Nessun piatto nel menu.'
            : onlyMissing
              ? '🎉 Tutti i piatti sono tradotti.'
              : 'Nessun piatto corrisponde alla ricerca.'}
        </div>
      )}
    </div>
  );
}
