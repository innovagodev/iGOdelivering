'use client';

import React from 'react';
import { Search } from 'lucide-react';
import TRow from '@/components/shared/TranslationRow';
import {
  getTranslationForAllergen,
  getTranslationForTag,
  splitTag,
} from '@/lib/menu-translations';
import type { MenuItemWizardDraft, RestaurantInfo, WizardOptionGroup } from '@/types/wizard';

interface TranslationsStepProps {
  info: RestaurantInfo;
  setInfo: React.Dispatch<React.SetStateAction<RestaurantInfo>>;
  menuCategories: { name: string; name_en?: string }[];
  setMenuCategories: React.Dispatch<React.SetStateAction<{ name: string; name_en?: string }[]>>;
  menuItems: MenuItemWizardDraft[];
  setMenuItems: React.Dispatch<React.SetStateAction<MenuItemWizardDraft[]>>;
  optionGroups: WizardOptionGroup[];
  setOptionGroups: React.Dispatch<React.SetStateAction<WizardOptionGroup[]>>;
}

const empty = (v?: string | null) => !v || !v.trim();
const padTo = (arr: string[] | undefined, len: number) =>
  Array.from({ length: len }, (_, i) => arr?.[i] ?? '');
const ok = async () => true;

const itemMissing = (item: MenuItemWizardDraft): string[] => {
  const m: string[] = [];
  if (empty(item.name_en)) m.push('nome');
  if (!empty(item.description) && empty(item.description_en)) m.push('descrizione');
  const ings = item.ingredients || [];
  if (ings.some((_, i) => empty(item.ingredients_en?.[i]))) m.push('ingredienti');
  const all = item.allergens || [];
  if (all.some((_, i) => empty(item.allergens_en?.[i]))) m.push('allergeni');
  const tags = item.dishTags || [];
  if (tags.some((_, i) => empty(item.dishTagsEn?.[i]))) m.push('tag');
  if ((item.singleSupplements || []).some((c) => empty(c.name_en))) m.push('supplementi');
  return m;
};

const groupMissing = (g: WizardOptionGroup) =>
  empty(g.name_en) ||
  (!!g.defaultOption && empty(g.defaultOptionEn)) ||
  g.choices.some((c) => empty(c.name_en));

export default function TranslationsStep({
  info,
  setInfo,
  menuCategories,
  setMenuCategories,
  menuItems,
  setMenuItems,
  optionGroups,
  setOptionGroups,
}: TranslationsStepProps) {
  const [onlyMissing, setOnlyMissing] = React.useState(true);
  const [search, setSearch] = React.useState('');

  // Elementi da completare quando il filtro è stato attivato: restano visibili
  // anche dopo averli completati, così non spariscono mentre si scrive.
  const [pinnedItems, setPinnedItems] = React.useState<Set<string>>(new Set());
  const [pinnedCats, setPinnedCats] = React.useState<Set<string>>(new Set());
  const [pinnedGroups, setPinnedGroups] = React.useState<Set<string>>(new Set());
  const latest = React.useRef({ menuItems, menuCategories, optionGroups });
  latest.current = { menuItems, menuCategories, optionGroups };
  React.useEffect(() => {
    if (!onlyMissing) return;
    const l = latest.current;
    setPinnedItems(new Set(l.menuItems.filter((i) => itemMissing(i).length > 0).map((i) => i.id)));
    setPinnedCats(new Set(l.menuCategories.filter((c) => empty(c.name_en)).map((c) => c.name)));
    setPinnedGroups(new Set(l.optionGroups.filter(groupMissing).map((g) => g.id)));
  }, [onlyMissing]);

  const updateItem = (id: string, patch: Partial<MenuItemWizardDraft>) =>
    setMenuItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const updateList = (
    item: MenuItemWizardDraft,
    key: 'ingredients_en' | 'allergens_en' | 'dishTagsEn',
    length: number,
    idx: number,
    value: string
  ) => {
    const next = padTo(item[key] as string[] | undefined, length);
    next[idx] = value;
    updateItem(item.id, { [key]: next.every((v) => !v.trim()) ? [] : next } as Partial<MenuItemWizardDraft>);
  };

  const q = search.trim().toLowerCase();
  const completeItems = menuItems.filter((i) => itemMissing(i).length === 0).length;
  const total = menuItems.length;
  const pct = total ? Math.round((completeItems / total) * 100) : 100;

  const visibleItems = menuItems.filter((i) => {
    if (q && !i.name.toLowerCase().includes(q) && !i.category.toLowerCase().includes(q))
      return false;
    if (onlyMissing && !pinnedItems.has(i.id) && itemMissing(i).length === 0) return false;
    return true;
  });
  const visibleCats = menuCategories.filter(
    (c) => !onlyMissing || pinnedCats.has(c.name) || empty(c.name_en)
  );
  const visibleGroups = optionGroups.filter((g) => {
    if (q && !g.name.toLowerCase().includes(q)) return false;
    return !onlyMissing || pinnedGroups.has(g.id) || groupMissing(g);
  });

  const categoryOrder = menuCategories.map((c) => c.name);
  menuItems.forEach((i) => {
    if (!categoryOrder.includes(i.category)) categoryOrder.push(i.category);
  });

  const Heading = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
      {children}
    </p>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Traduzioni in inglese</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Passaggio facoltativo: puoi saltarlo con «Continua» e completarlo in seguito. Ciò che non
          viene tradotto resta in italiano anche per i clienti che usano il menu in inglese.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-foreground">
          <span>
            {completeItems} / {total} piatti completi
          </span>
          <span className="text-muted-foreground">{pct}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
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
              placeholder="Cerca piatto, categoria o gruppo..."
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

      {/* Descrizione del ristorante */}
      {!q && (!onlyMissing || !empty(info.description)) && (
        <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <Heading>Descrizione del ristorante</Heading>
          <TRow
            source={info.description || '—'}
            value={info.descriptionEn || ''}
            multiline
            onSave={async (v) => {
              setInfo((p) => ({ ...p, descriptionEn: v }));
              return true;
            }}
          />
        </section>
      )}

      {/* Categorie */}
      {!q && visibleCats.length > 0 && (
        <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <Heading>Categorie</Heading>
          {visibleCats.map((c) => (
            <TRow
              key={c.name}
              source={c.name}
              value={c.name_en || ''}
              onSave={async (v) => {
                setMenuCategories((p) =>
                  p.map((x) => (x.name === c.name ? { ...x, name_en: v || undefined } : x))
                );
                return true;
              }}
            />
          ))}
        </section>
      )}

      {/* Gruppi di opzioni (impasto, aggiunte...): condivisi tra più piatti */}
      {visibleGroups.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
            Gruppi di opzioni ({visibleGroups.length})
          </p>
          {visibleGroups.map((g) => (
            <details key={g.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none list-none hover:bg-muted/20">
                <span className="font-semibold text-sm text-foreground truncate">{g.name}</span>
                {groupMissing(g) ? (
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
                <TRow
                  label="Nome gruppo"
                  source={g.name}
                  value={g.name_en || ''}
                  onSave={async (v) => {
                    setOptionGroups((p) =>
                      p.map((x) => (x.id === g.id ? { ...x, name_en: v || undefined } : x))
                    );
                    return true;
                  }}
                />
                {g.defaultOption && (
                  <TRow
                    label="Opzione predefinita"
                    source={g.defaultOption}
                    value={g.defaultOptionEn || ''}
                    onSave={async (v) => {
                      setOptionGroups((p) =>
                        p.map((x) => (x.id === g.id ? { ...x, defaultOptionEn: v || undefined } : x))
                      );
                      return true;
                    }}
                  />
                )}
                {g.choices.map((c) => (
                  <TRow
                    key={c.id}
                    source={c.name}
                    value={c.name_en || ''}
                    onSave={async (v) => {
                      setOptionGroups((p) =>
                        p.map((x) =>
                          x.id === g.id
                            ? {
                                ...x,
                                choices: x.choices.map((y) =>
                                  y.id === c.id ? { ...y, name_en: v || undefined } : y
                                ),
                              }
                            : x
                        )
                      );
                      return true;
                    }}
                  />
                ))}
              </div>
            </details>
          ))}
        </section>
      )}

      {/* Piatti per categoria */}
      {categoryOrder.map((cat) => {
        const list = visibleItems.filter((i) => i.category === cat);
        if (list.length === 0) return null;
        return (
          <section key={cat} className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
              {cat} <span className="font-normal">({list.length})</span>
            </p>
            {list.map((item) => {
              const missing = itemMissing(item);
              const ings = item.ingredients || [];
              const allergens = item.allergens || [];
              const tags = item.dishTags || [];
              const supps = item.singleSupplements || [];
              return (
                <details
                  key={item.id}
                  className="bg-card border border-border rounded-2xl overflow-hidden"
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
                  <div className="px-4 pb-4 pt-3 space-y-4 border-t border-border/60">
                    <TRow
                      label="Nome"
                      source={item.name}
                      value={item.name_en || ''}
                      onSave={async (v) => {
                        updateItem(item.id, { name_en: v });
                        return true;
                      }}
                    />
                    {item.description && (
                      <TRow
                        label="Descrizione"
                        source={item.description}
                        value={item.description_en || ''}
                        multiline
                        onSave={async (v) => {
                          updateItem(item.id, { description_en: v });
                          return true;
                        }}
                      />
                    )}
                    {ings.length > 0 && (
                      <div className="space-y-2">
                        <Heading>Ingredienti</Heading>
                        {ings.map((ing, idx) => (
                          <TRow
                            key={`ing-${idx}`}
                            source={ing}
                            value={item.ingredients_en?.[idx] || ''}
                            onSave={async (v) => {
                              updateList(item, 'ingredients_en', ings.length, idx, v);
                              return true;
                            }}
                          />
                        ))}
                      </div>
                    )}
                    {allergens.length > 0 && (
                      <div className="space-y-2">
                        <Heading>Allergeni</Heading>
                        {allergens.map((a, idx) => (
                          <TRow
                            key={`all-${idx}`}
                            source={a}
                            suggestion={getTranslationForAllergen(a)}
                            value={item.allergens_en?.[idx] || ''}
                            onSave={async (v) => {
                              updateList(item, 'allergens_en', allergens.length, idx, v);
                              return true;
                            }}
                          />
                        ))}
                      </div>
                    )}
                    {tags.length > 0 && (
                      <div className="space-y-2">
                        <Heading>Tag</Heading>
                        {tags.map((tag, idx) => {
                          const { prefix, label } = splitTag(tag);
                          const enFull = item.dishTagsEn?.[idx] || '';
                          return (
                            <TRow
                              key={`tag-${idx}`}
                              source={label}
                              suggestion={splitTag(getTranslationForTag(tag)).label}
                              value={enFull ? splitTag(enFull).label : ''}
                              onSave={async (v) => {
                                updateList(
                                  item,
                                  'dishTagsEn',
                                  tags.length,
                                  idx,
                                  v ? (prefix ? `${prefix}:${v}` : v) : ''
                                );
                                return true;
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                    {supps.length > 0 && (
                      <div className="space-y-2">
                        <Heading>Aggiunte / Supplementi</Heading>
                        {supps.map((c) => (
                          <TRow
                            key={c.id}
                            source={c.name}
                            value={c.name_en || ''}
                            onSave={async (v) => {
                              updateItem(item.id, {
                                singleSupplements: supps.map((y) =>
                                  y.id === c.id ? { ...y, name_en: v || undefined } : y
                                ),
                              });
                              return ok();
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </section>
        );
      })}

      {total === 0 && (
        <div className="text-center py-10 text-sm text-muted-foreground">
          Nessun piatto nel menu: aggiungi i piatti nel passaggio «Menu», poi torna qui.
        </div>
      )}
      {total > 0 && visibleItems.length === 0 && onlyMissing && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          🎉 Tutti i piatti sono tradotti.
        </div>
      )}
    </div>
  );
}
