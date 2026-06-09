'use client';
import React from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Upload,
  X,
  Euro,
  Eye,
  EyeOff,
  ChevronDown,
  Leaf,
  Flame,
  Wheat,
  Sparkles,
  Star,
  Milk,
  Heart,
  Fish,
  Apple,
  Coffee,
  Wine,
  Pizza
} from 'lucide-react';
import Toggle from '@/components/ui/Toggle';
import { DISH_TAGS_LIST } from '@/lib/constants';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  leaf: Leaf,
  flame: Flame,
  wheat: Wheat,
  sparkles: Sparkles,
  star: Star,
  milk: Milk,
  heart: Heart,
  fish: Fish,
  apple: Apple,
  coffee: Coffee,
  wine: Wine,
  pizza: Pizza
};

const ICON_LABELS: Record<string, string> = {
  leaf: 'Vegano / Vegetariano',
  flame: 'Piccante',
  wheat: 'Senza Glutine',
  sparkles: 'Nuovo / Novità',
  star: 'Consigliato / Specialità',
  milk: 'Senza Lattosio',
  heart: 'Salutare / Bio',
  fish: 'Pesce',
  apple: 'Fresco / Frutta',
  coffee: 'Colazione',
  wine: 'Alcolico / Vino',
  pizza: 'Pizza / Forno'
};

const getIconComponent = (name: string, size = 14, className = "") => {
  const Icon = ICON_MAP[name.toLowerCase()];
  if (!Icon) return null;
  return <Icon size={size} className={className} />;
};

const parseTag = (tag: string) => {
  if (tag.includes(':')) {
    const parts = tag.split(':');
    const iconName = parts[0].trim().toLowerCase();
    const label = parts.slice(1).join(':').trim();
    return { iconName, label };
  }
  
  // Legacy parsing fallback
  const t = tag.toLowerCase();
  let iconName = 'leaf';
  let label = tag;
  
  label = label.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

  if (t.includes('vegan') || t.includes('vegetar') || tag.includes('🌱') || tag.includes('🥗')) {
    iconName = 'leaf';
  } else if (t.includes('piccant') || t.includes('diavola') || t.includes('spicy') || tag.includes('🌶️') || tag.includes('🔥')) {
    iconName = 'flame';
  } else if (t.includes('gluten') || t.includes('glutine') || tag.includes('🌾')) {
    iconName = 'wheat';
  } else if (t.includes('novit') || t.includes('nuov') || t.includes('new') || tag.includes('🆕')) {
    iconName = 'sparkles';
  } else if (t.includes('consigliat') || t.includes('special') || tag.includes('⭐') || tag.includes('👑')) {
    iconName = 'star';
  } else if (t.includes('lattosio') || tag.includes('🥛')) {
    iconName = 'milk';
  }
  
  return { iconName, label };
};

import {
  MenuItemWizardDraft,
  DishVisibility,
  WizardOptionGroup,
  WizardOptionChoice,
} from '@/types';

interface MenuStepProps {
  menuCategories: string[];
  setMenuCategories: React.Dispatch<React.SetStateAction<string[]>>;
  showNewCategory: boolean;
  setShowNewCategory: (show: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  addNewCategory: () => void;
  optionGroups: WizardOptionGroup[];
  showAddGroup: boolean;
  setShowAddGroup: (show: boolean) => void;
  newGroupName: string;
  setNewGroupName: (name: string) => void;
  newGroupChoices: WizardOptionChoice[];
  addChoice: () => void;
  updateChoice: (id: string, field: 'name' | 'price', value: string | number) => void;
  removeChoice: (id: string) => void;
  addWizardOptionGroup: (minSel?: number, maxSel?: number | null) => void;
  removeWizardOptionGroup: (id: string) => void;
  editingGroupId: string | null;
  startEditGroup: (group: WizardOptionGroup) => void;
  editGroupName: string;
  setEditGroupName: (name: string) => void;
  editGroupChoices: WizardOptionChoice[];
  addEditChoice: () => void;
  updateEditChoice: (id: string, field: 'name' | 'price', value: string | number) => void;
  removeEditChoice: (id: string) => void;
  saveEditGroup: () => void;
  cancelEditGroup: () => void;
  menuItems: MenuItemWizardDraft[];
  newItem: MenuItemWizardDraft;
  setNewItem: React.Dispatch<React.SetStateAction<MenuItemWizardDraft>>;
  showAddItem: boolean;
  setShowAddItem: (show: boolean) => void;
  addMenuItem: () => void;
  removeMenuItem: (id: string) => void;
  toggleAllergen: (allergen: string) => void;
  handleImageFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  toggleItemOptionGroup: (groupId: string) => void;
  showVisibilityPanel: boolean;
  setShowVisibilityPanel: (show: boolean) => void;
  toggleVisibilityDay: (day: string) => void;
  days: string[];
  allergensList: string[];
}

export default function MenuStep({
  menuCategories,
  setMenuCategories,
  showNewCategory,
  setShowNewCategory,
  newCategoryName,
  setNewCategoryName,
  addNewCategory,
  optionGroups,
  showAddGroup,
  setShowAddGroup,
  newGroupName,
  setNewGroupName,
  newGroupChoices,
  addChoice,
  updateChoice,
  removeChoice,
  addWizardOptionGroup,
  removeWizardOptionGroup,
  editingGroupId,
  startEditGroup,
  editGroupName,
  setEditGroupName,
  editGroupChoices,
  addEditChoice,
  updateEditChoice,
  removeEditChoice,
  saveEditGroup,
  cancelEditGroup,
  menuItems,
  newItem,
  setNewItem,
  showAddItem,
  setShowAddItem,
  addMenuItem,
  removeMenuItem,
  toggleAllergen,
  handleImageFile,
  imageInputRef,
  toggleItemOptionGroup,
  showVisibilityPanel,
  setShowVisibilityPanel,
  toggleVisibilityDay,
  days,
  allergensList,
}: MenuStepProps) {
  const [isPromo, setIsPromo] = React.useState(!!newItem.originalPrice);
  const [newGroupMinSelections, setNewGroupMinSelections] = React.useState(0);
  const [newGroupMaxSelections, setNewGroupMaxSelections] = React.useState<number | null>(null);
  const [newWizardSuppName, setNewWizardSuppName] = React.useState('');
  const [newWizardSuppPrice, setNewWizardSuppPrice] = React.useState('');
  const [availableAllergens, setAvailableAllergens] = React.useState<string[]>([]);
  const [customAllergen, setCustomAllergen] = React.useState('');
  const [availableDishTags, setAvailableDishTags] = React.useState<string[]>([]);
  const [customTag, setCustomTag] = React.useState('');
  const [newIngredientInput, setNewIngredientInput] = React.useState('');
  const [showErrors, setShowErrors] = React.useState(false);

  React.useEffect(() => {
    if (!showAddItem) {
      setShowErrors(false);
    }
  }, [showAddItem]);

  const handleAddIngredient = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    setNewItem((p) => {
      const currentIngredients = p.ingredients || [];
      if (currentIngredients.includes(trimmed)) return p;
      return { ...p, ingredients: [...currentIngredients, trimmed] };
    });
  };

  const handleRemoveIngredient = (ing: string) => {
    setNewItem((p) => {
      const currentIngredients = p.ingredients || [];
      return { ...p, ingredients: currentIngredients.filter((x) => x !== ing) };
    });
  };

  // Emoji Picker States
  const [allergenEmoji, setAllergenEmoji] = React.useState('➕');
  const [showAllergenEmojiPicker, setShowAllergenEmojiPicker] = React.useState(false);
  const [selectedTagIcon, setSelectedTagIcon] = React.useState('leaf');

  const EMOJI_LIST = [
    '🌱', '🥗', '🌶️', '🔥', '🆕', '⭐', '👑',
    '🍕', '🍔', '🍣', '🥩', '🐟', '🥛', '🥚',
    '🥜', '🌾', '🍪', '🍇', '🍋', '🥤', '🍷',
    '❄️', '🧪'
  ];

  React.useEffect(() => {
    setIsPromo(!!newItem.originalPrice);
  }, [newItem.originalPrice]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('iGO_allergens_list');
      let list: string[] = [];
      if (stored) {
        try {
          list = JSON.parse(stored);
        } catch (e) {
          list = [];
        }
      }
      const initialSet = new Set([...list, ...(newItem.allergens || [])]);
      const merged = Array.from(initialSet).filter(Boolean);
      setAvailableAllergens(merged);
    }
  }, [newItem.allergens]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('iGO_dish_tags_list');
      let list: string[] = [];
      if (stored) {
        try {
          list = JSON.parse(stored);
        } catch (e) {
          list = [];
        }
      } else {
        list = DISH_TAGS_LIST;
      }
      const initialSet = new Set([...list, ...(newItem.dishTags || [])]);
      const merged = Array.from(initialSet).filter(Boolean);
      setAvailableDishTags(merged);
    }
  }, [newItem.dishTags]);

  const saveAllergensToLocalStorage = (list: string[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('iGO_allergens_list', JSON.stringify(list));
    }
  };

  const handleAddAllergen = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    setAvailableAllergens((prev) => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      saveAllergensToLocalStorage(next);
      return next;
    });
    if (!newItem.allergens.includes(trimmed)) {
      toggleAllergen(trimmed);
    }
  };

  const handleDeleteAllergen = (a: string) => {
    setAvailableAllergens((prev) => {
      const next = prev.filter((x) => x !== a);
      saveAllergensToLocalStorage(next);
      return next;
    });
    if (newItem.allergens.includes(a)) {
      toggleAllergen(a);
    }
  };

  const saveDishTagsToLocalStorage = (list: string[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('iGO_dish_tags_list', JSON.stringify(list));
    }
  };

  const handleAddDishTag = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    setAvailableDishTags((prev) => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      saveDishTagsToLocalStorage(next);
      return next;
    });
    const currentTags = newItem.dishTags || [];
    if (!currentTags.includes(trimmed)) {
      toggleDishTag(trimmed);
    }
  };

  const handleDeleteDishTag = (a: string) => {
    setAvailableDishTags((prev) => {
      const next = prev.filter((x) => x !== a);
      saveDishTagsToLocalStorage(next);
      return next;
    });
    if ((newItem.dishTags || []).includes(a)) {
      toggleDishTag(a);
    }
  };

  const toggleDishTag = (tag: string) => {
    setNewItem((p) => {
      const currentTags = p.dishTags || [];
      return {
        ...p,
        dishTags: currentTags.includes(tag)
          ? currentTags.filter((x: string) => x !== tag)
          : [...currentTags, tag],
      };
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">Menu</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Crea le categorie, i piatti e le opzioni del tuo menu
        </p>
      </div>

      {/* ─── Categories ─── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Categorie Menu</p>
          <button
            onClick={() => setShowNewCategory(true)}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <Plus size={14} />
            Aggiungi Categoria
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {menuCategories.map((cat) => (
            <div
              key={cat}
              className="group relative bg-muted px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground border border-border flex items-center gap-2"
            >
              {cat}
              <button
                onClick={() => setMenuCategories((p) => p.filter((c) => c !== cat))}
                className="text-muted-foreground hover:text-[var(--danger)] transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
        {showNewCategory && (
          <div className="flex items-center gap-2 max-w-sm">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Nome categoria..."
              className="flex-1 px-3 py-2 text-base bg-input border border-border rounded-xl focus:outline-none"
            />
            <button
              onClick={addNewCategory}
              className="bg-primary text-white px-3 py-2 rounded-xl text-xs font-bold"
            >
              Aggiungi
            </button>
            <button
              onClick={() => setShowNewCategory(false)}
              className="text-muted-foreground hover:text-foreground p-2"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </section>

      {/* ─── Option Groups ─── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            Gruppi di Opzioni (es. Ingredienti Extra)
          </p>
          <button
            onClick={() => setShowAddGroup(true)}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <Plus size={14} />
            Nuovo Gruppo
          </button>
        </div>

        {/* Existing groups */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {optionGroups.map((group) => (
            <div key={group.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">{group.name}</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEditGroup(group)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => removeWizardOptionGroup(group.id)}
                    className="p-1.5 rounded-lg hover:bg-[var(--danger-bg)] text-muted-foreground hover:text-[var(--danger)] transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.choices.map((c) => (
                  <span
                    key={c.id}
                    className="text-[10px] bg-muted px-2 py-0.5 rounded-md border border-border"
                  >
                    {c.name} (+€{c.price.toFixed(2)})
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Add Group Form */}
        {showAddGroup && (
          <div className="bg-muted/40 border-2 border-dashed border-border rounded-xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Nome gruppo (es. Scegli impasto, Ingredienti extra...)"
              className="w-full px-3 py-2 text-base bg-input border border-border rounded-xl focus:outline-none"
            />
            {/* Regole di Selezione & Vincoli per il Nuovo Gruppo */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-sm text-left">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/60 pb-2 flex items-center gap-1.5">
                ⚙️ Regole di comportamento per il cliente
              </h4>

              {/* Question 1: Solo una o più scelte? */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-foreground">
                  1. Quante opzioni può selezionare il cliente?
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewGroupMaxSelections(1);
                      setNewGroupMinSelections((prev) => Math.min(1, prev));
                    }}
                    className={`flex flex-col text-left p-3 border rounded-xl transition-all cursor-pointer ${newGroupMaxSelections === 1
                      ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20'
                      : 'bg-card border-border hover:border-border-strong hover:bg-muted/10'
                      }`}
                  >
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${newGroupMaxSelections === 1 ? 'border-primary' : 'border-muted-foreground'}`}>
                        {newGroupMaxSelections === 1 && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </span>
                      Una sola scelta (es. Impasto)
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1 leading-relaxed font-medium">
                      Il cliente può scegliere un solo elemento. La selezione di uno esclude gli altri.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewGroupMaxSelections(null);
                    }}
                    className={`flex flex-col text-left p-3 border rounded-xl transition-all cursor-pointer ${newGroupMaxSelections !== 1
                      ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20'
                      : 'bg-card border-border hover:border-border-strong hover:bg-muted/10'
                      }`}
                  >
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${newGroupMaxSelections !== 1 ? 'border-primary bg-primary/10' : 'border-muted-foreground'}`}>
                        {newGroupMaxSelections !== 1 && <span className="w-1.5 h-1.5 bg-primary rounded-[2px]" />}
                      </span>
                      Scelte multiple (es. Aggiunte)
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1 leading-relaxed font-medium">
                      Il cliente può selezionare più opzioni contemporaneamente o nessuna.
                    </span>
                  </button>
                </div>
              </div>

              {/* Question 2: Obbligatorio o opzionale? */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-foreground">
                  2. La scelta è obbligatoria per poter ordinare?
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewGroupMinSelections(0);
                    }}
                    className={`flex flex-col text-left p-3 border rounded-xl transition-all cursor-pointer ${newGroupMinSelections === 0
                      ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20'
                      : 'bg-card border-border hover:border-border-strong hover:bg-muted/10'
                      }`}
                  >
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className="text-xs">⚪</span>
                      Facoltativa
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1 leading-relaxed font-medium">
                      Il cliente può procedere all'ordine anche senza selezionare alcuna opzione da questo gruppo.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewGroupMinSelections(1);
                    }}
                    className={`flex flex-col text-left p-3 border rounded-xl transition-all cursor-pointer ${newGroupMinSelections > 0
                      ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20'
                      : 'bg-card border-border hover:border-border-strong hover:bg-muted/10'
                      }`}
                  >
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className="text-xs">🔴</span>
                      Obbligatoria
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1 leading-relaxed font-medium">
                      Il cliente non può aggiungere il piatto al carrello se non seleziona almeno un'opzione.
                    </span>
                  </button>
                </div>
              </div>

              {/* Summary rules badge */}
              <div className="pt-2 flex items-center justify-between text-xs border-t border-border/40">
                <span className="text-muted-foreground font-semibold">Regola applicata:</span>
                <span className="px-3 py-1 font-bold rounded-lg bg-primary/10 text-primary border border-primary/20">
                  {newGroupMinSelections > 0
                    ? newGroupMaxSelections === 1
                      ? '🔴 Selezione Obbligatoria (1 sola scelta)'
                      : '🔴 Selezione Obbligatoria (Scelte multiple)'
                    : newGroupMaxSelections === 1
                      ? '⚪ Selezione Facoltativa (Max 1 scelta)'
                      : '⚪ Selezione Facoltativa (Scelte multiple libere)'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-left">
                Opzioni
              </p>
              {newGroupChoices.map((choice) => (
                <div key={choice.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={choice.name}
                    onChange={(e) => updateChoice(choice.id, 'name', e.target.value)}
                    placeholder="Nome opzione"
                    className="flex-1 px-3 py-1.5 text-base bg-input border border-border rounded-lg"
                  />
                  <div className="relative w-24">
                    <Euro
                      size={10}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type="number"
                      value={choice.price}
                      onChange={(e) =>
                        updateChoice(choice.id, 'price', parseFloat(e.target.value) || 0)
                      }
                      placeholder="Prezzo"
                      className="w-full pl-6 pr-2 py-1.5 text-base bg-input border border-border rounded-lg"
                    />
                  </div>
                  <button
                    onClick={() => removeChoice(choice.id)}
                    className="p-1.5 text-muted-foreground hover:text-[var(--danger)] cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button
                onClick={addChoice}
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} />
                Aggiungi Opzione
              </button>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  addWizardOptionGroup(newGroupMinSelections, newGroupMaxSelections);
                  setNewGroupMinSelections(0);
                  setNewGroupMaxSelections(null);
                }}
                className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Salva Gruppo
              </button>
              <button
                onClick={() => {
                  setShowAddGroup(false);
                  setNewGroupMinSelections(0);
                  setNewGroupMaxSelections(null);
                }}
                className="text-xs font-semibold text-muted-foreground cursor-pointer"
              >
                Annulla
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ─── Dishes ─── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Piatti</p>
          <button
            type="button"
            onClick={() => {
              if (menuCategories.length === 0) {
                alert('Aggiungi prima almeno una categoria menu.');
                return;
              }
              setNewItem({
                id: '',
                name: '',
                category: menuCategories[0] || 'Pizza',
                price: '',
                originalPrice: '',
                description: '',
                available: true,
                imageUrl: '',
                imageFile: null,
                allergens: [],
                dishTags: [],
                ingredients: [],
                optionGroups: [],
                singleSupplements: [],
                visibility: {
                  mode: 'always',
                  timeFrom: '10:00',
                  timeTo: '15:00',
                  days: [...days],
                  dateFrom: '',
                  dateFromTime: '10:00',
                  dateTo: '',
                  dateToTime: '15:00',
                },
                customizationEnabled: true,
                notesEnabled: true,
              });
              setShowAddItem(true);
            }}
            className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Aggiungi Piatto
          </button>
        </div>

        {/* Existing Items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="bg-card border border-border rounded-xl overflow-hidden flex gap-4 p-3 group"
            >
              <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden border border-border">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Upload size={20} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">
                    {item.category}
                  </p>
                  <div className="flex items-center gap-1 opacity-70 hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:hover:!opacity-100 transition-all">
                    <button
                      type="button"
                      onClick={() => {
                        setNewItem({ ...item });
                        setShowAddItem(true);
                      }}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Modifica piatto"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMenuItem(item.id)}
                      className="p-1 text-muted-foreground hover:text-[var(--danger)] transition-colors cursor-pointer"
                      title="Elimina piatto"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                {item.ingredients && item.ingredients.length > 0 && (
                  <p className="text-[10px] text-muted-foreground/80 font-medium truncate mt-0.5">
                    {item.ingredients.join(', ')}
                  </p>
                )}
                {item.originalPrice ? (
                  <div className="mt-1 flex flex-col">
                    <span className="text-xs text-muted-foreground line-through">
                      €{parseFloat(item.price || '0').toFixed(2)}
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      €{parseFloat(item.originalPrice || '0').toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-foreground mt-1">
                    €{parseFloat(item.price || '0').toFixed(2)}
                  </p>
                )}
                {/* Visibility logic removed */}
              </div>
            </div>
          ))}
        </div>

        {/* Add Piatto Form */}
        {showAddItem && (
          <div className="bg-muted/40 border-2 border-dashed border-border rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">
                {newItem.id ? 'Modifica Piatto' : 'Aggiungi Nuovo Piatto'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddItem(false)}
                className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Nome Piatto *
                  </label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => {
                      setNewItem((p) => ({ ...p, name: e.target.value }));
                      if (e.target.value.trim()) setShowErrors(false);
                    }}
                    placeholder="es. Margherita"
                    className={`w-full px-3.5 py-2.5 text-base bg-input border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      showErrors && !newItem.name.trim()
                        ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
                        : 'border-border focus:ring-primary/20 focus:border-primary'
                    }`}
                  />
                  {showErrors && !newItem.name.trim() && (
                    <p className="text-red-500 text-[10px] font-semibold mt-1">Il nome del piatto è obbligatorio</p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Categoria *
                    </label>
                    <select
                      value={newItem.category}
                      onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
                      className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none"
                    >
                      {menuCategories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Prezzo (€) *
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Euro
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                          type="number"
                          value={newItem.price}
                          onChange={(e) => {
                            setNewItem((p) => ({ ...p, price: e.target.value }));
                            if (e.target.value.trim()) setShowErrors(false);
                          }}
                          placeholder="7.50"
                          step="0.1"
                          className={`w-full pl-8 pr-3 py-2.5 text-base bg-input border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                            showErrors && !newItem.price.trim()
                              ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
                              : 'border-border focus:ring-primary/20 focus:border-primary'
                          }`}
                        />
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none py-2">
                        <input
                          type="checkbox"
                          checked={isPromo}
                          onChange={(e) => {
                            setIsPromo(e.target.checked);
                            if (!e.target.checked) {
                              setNewItem((p) => ({ ...p, originalPrice: '' }));
                            }
                          }}
                          className="w-4 h-4 text-primary border-border rounded focus:ring-ring cursor-pointer"
                        />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Promo
                        </span>
                      </label>
                    </div>
                    {showErrors && !newItem.price.trim() && (
                      <p className="text-red-500 text-[10px] font-semibold mt-1">Il prezzo di listino è obbligatorio</p>
                    )}
                  </div>
                </div>
                {isPromo && (
                  <div className="animate-in fade-in duration-200">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Prezzo Scontato (€) *
                    </label>
                    <div className="relative">
                      <Euro
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <input
                        type="number"
                        value={newItem.originalPrice || ''}
                        onChange={(e) => setNewItem((p) => ({ ...p, originalPrice: e.target.value }))}
                        placeholder="5.50"
                        step="0.1"
                        className="w-full pl-8 pr-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Descrizione
                  </label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Pomodoro, mozzarella, basilico..."
                    rows={2}
                    className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Ingredienti del Piatto
                    </p>
                    {(newItem.ingredients || []).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setNewItem((p) => ({ ...p, ingredients: [] }))}
                        className="text-[9px] font-bold text-muted-foreground hover:text-foreground hover:underline uppercase cursor-pointer"
                      >
                        Pulisci tutto
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3 max-h-28 overflow-y-auto pr-1 p-2 bg-muted/25 border border-border rounded-xl">
                    {(!newItem.ingredients || newItem.ingredients.length === 0) && (
                      <p className="text-xs text-muted-foreground italic">Nessun ingrediente inserito (es. Pomodoro, Mozzarella...)</p>
                    )}
                    {(newItem.ingredients || []).map((ing) => (
                      <div
                        key={ing}
                        className="relative px-2.5 py-1.5 rounded-lg text-[10px] font-bold border bg-card border-border text-foreground select-none pr-6 flex items-center"
                      >
                        {ing}
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(ing)}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center border border-white shadow-sm transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                          style={{ fontSize: '7px', lineHeight: '1' }}
                          title={`Elimina ${ing}`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newIngredientInput}
                      onChange={(e) => setNewIngredientInput(e.target.value)}
                      placeholder="Aggiungi ingrediente..."
                      className="flex-1 px-3 py-2 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring min-w-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const txt = newIngredientInput.trim();
                          if (txt) {
                            handleAddIngredient(txt);
                            setNewIngredientInput('');
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const txt = newIngredientInput.trim();
                        if (txt) {
                          handleAddIngredient(txt);
                          setNewIngredientInput('');
                        }
                      }}
                      className="px-2.5 py-2 bg-primary text-white hover:bg-primary-hover rounded-lg text-[10px] font-bold flex items-center justify-center gap-0.5 cursor-pointer transition-colors"
                    >
                      <Plus size={10} />
                      Aggiungi
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Immagine Piatto
                </label>
                <div
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full aspect-video rounded-2xl border-2 border-dashed border-border bg-card flex flex-col items-center justify-center cursor-pointer hover:bg-muted hover:border-primary transition-all group overflow-hidden relative"
                >
                  {newItem.imageUrl ? (
                    <>
                      <img
                        src={newItem.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                        <Upload size={24} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Upload size={20} className="text-muted-foreground" />
                      </div>
                      <p className="text-xs font-bold text-muted-foreground">Clicca per caricare</p>
                    </>
                  )}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFile}
                  />
                </div>
              </div>
            </div>

            {/* Opzioni & Allergeni & Tag Panels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border text-left">
              <div className="space-y-6">
                {/* Supplementi Singoli Section */}
                <div className="border border-border/80 rounded-2xl p-4 bg-muted/10 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Supplementi Singoli del Piatto
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Aggiungi o importa da gruppi opzioni creati.
                      </p>
                    </div>
                    {optionGroups.filter((g) => g.id !== 'supplementi-singoli' && g.name !== 'Supplementi' && g.name !== 'Supplementi Singoli' && !newItem.optionGroups.includes(g.id)).length > 0 && (
                      <select
                        onChange={(e) => {
                          const gid = e.target.value;
                          if (!gid) return;
                          setNewItem((prev) => {
                            const currentGroups = prev.optionGroups || [];
                            if (currentGroups.includes(gid)) return prev;
                            return {
                              ...prev,
                              optionGroups: [...currentGroups, gid],
                            };
                          });
                          e.target.value = ''; // Reset select
                        }}
                        className="px-2 py-0.5 text-[10px] bg-input border border-border rounded-md focus:outline-none cursor-pointer self-start sm:self-auto font-semibold"
                        defaultValue=""
                      >
                        <option value="" disabled>Inserisci da gruppo...</option>
                        {optionGroups
                          .filter((g) => g.id !== 'supplementi-singoli' && g.name !== 'Supplementi' && g.name !== 'Supplementi Singoli' && !newItem.optionGroups.includes(g.id))
                          .map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                      </select>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2 bg-card border border-border rounded-xl">
                    {(!newItem.singleSupplements || newItem.singleSupplements.length === 0) && (
                      <p className="text-[10px] text-muted-foreground italic">Nessun supplemento singolo configurato.</p>
                    )}
                    {(newItem.singleSupplements || []).map((choice) => (
                      <div
                        key={choice.id}
                        className="relative px-2 py-1 rounded-lg text-[10px] font-semibold border bg-card border-border text-foreground pr-6"
                      >
                        <span>{choice.name}</span>
                        <span className="text-primary font-bold ml-1">(+€{choice.price.toFixed(2)})</span>
                        <button
                          type="button"
                          onClick={() => setNewItem((prev) => ({
                            ...prev,
                            singleSupplements: (prev.singleSupplements || []).filter((c) => c.id !== choice.id),
                          }))}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center border border-white shadow-sm transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                          style={{ fontSize: '7px', lineHeight: '1' }}
                          title={`Elimina ${choice.name}`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Supplement inline form */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newWizardSuppName}
                      onChange={(e) => setNewWizardSuppName(e.target.value)}
                      placeholder="Nome supplemento..."
                      className="flex-1 px-3 py-1.5 text-xs bg-input border border-border rounded-lg focus:outline-none min-w-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newWizardSuppName.trim()) {
                            const price = parseFloat(newWizardSuppPrice) >= 0 ? parseFloat(newWizardSuppPrice) : 0;
                            setNewItem((prev) => ({
                              ...prev,
                              singleSupplements: [
                                ...(prev.singleSupplements || []),
                                { id: `choice-${Date.now()}`, name: newWizardSuppName.trim(), price },
                              ],
                            }));
                            setNewWizardSuppName('');
                            setNewWizardSuppPrice('');
                          }
                        }
                      }}
                    />
                    <input
                      type="number"
                      value={newWizardSuppPrice}
                      onChange={(e) => setNewWizardSuppPrice(e.target.value)}
                      placeholder="Prezzo"
                      min={0}
                      step={0.1}
                      className="w-16 px-2 py-1.5 text-xs bg-input border border-border rounded-lg text-center min-w-0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newWizardSuppName.trim()) {
                          const price = parseFloat(newWizardSuppPrice) >= 0 ? parseFloat(newWizardSuppPrice) : 0;
                          setNewItem((prev) => ({
                            ...prev,
                            singleSupplements: [
                              ...(prev.singleSupplements || []),
                              { id: `choice-${Date.now()}`, name: newWizardSuppName.trim(), price },
                            ],
                          }));
                          setNewWizardSuppName('');
                          setNewWizardSuppPrice('');
                        }
                      }}
                      className="px-2.5 py-1.5 bg-primary text-white hover:bg-primary-hover rounded-lg text-[10px] font-bold flex items-center justify-center gap-0.5 cursor-pointer transition-colors"
                    >
                      <Plus size={10} />
                      Aggiungi
                    </button>
                  </div>
                </div>

                {/* Gruppi Opzioni Applicabili Section */}
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    Gruppi Opzioni Applicabili (con regole)
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {optionGroups.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">
                        Nessun gruppo opzioni creato
                      </p>
                    )}
                    {optionGroups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleItemOptionGroup(g.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer ${newItem.optionGroups.includes(g.id) ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold">{g.name}</span>
                          <span className="text-[9px] text-muted-foreground font-semibold">
                            {g.minSelections !== undefined && g.minSelections > 0 ? 'Obbligatorio' : 'Opzionale'}
                            {g.maxSelections === 1 ? ' • Scelta Singola' : ' • Scelta Multipla'}
                          </span>
                        </div>
                        {newItem.optionGroups.includes(g.id) && <X size={12} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Allergeni section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Allergeni
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setNewItem((p) => ({ ...p, allergens: [] }));
                        }}
                        className="text-[9px] font-bold text-muted-foreground hover:text-foreground hover:underline uppercase cursor-pointer"
                      >
                        Pulisci
                      </button>
                      <span className="text-[9px] text-muted-foreground">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewItem((p) => ({ ...p, allergens: [...availableAllergens] }));
                        }}
                        className="text-[9px] font-bold text-primary hover:underline uppercase cursor-pointer"
                      >
                        Tutti
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3 max-h-28 overflow-y-auto pr-1">
                    {availableAllergens.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Nessun allergene inserito</p>
                    )}
                    {availableAllergens.map((a) => {
                      const isActive = newItem.allergens.includes(a);
                      return (
                        <div
                          key={a}
                          onClick={() => toggleAllergen(a)}
                          className={`relative px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer select-none active:scale-95 pr-6 ${isActive
                              ? 'bg-amber-100 border-amber-300 text-amber-800'
                              : 'bg-card border-border text-muted-foreground hover:bg-muted'
                            }`}
                        >
                          {a}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAllergen(a);
                            }}
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center border border-white shadow-sm transition-transform hover:scale-110 active:scale-95"
                            style={{ fontSize: '7px', lineHeight: '1' }}
                            title={`Elimina ${a}`}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 relative">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAllergenEmojiPicker(!showAllergenEmojiPicker);
                        }}
                        className="px-2.5 py-2 bg-input border border-border rounded-lg hover:bg-muted text-base cursor-pointer flex items-center justify-center min-w-[38px] h-[34px]"
                        title="Seleziona Emoji"
                      >
                        {allergenEmoji}
                      </button>
                      {showAllergenEmojiPicker && (
                        <div className="absolute bottom-full left-0 mb-2 p-2 bg-card border border-border rounded-lg shadow-xl z-20 grid grid-cols-6 gap-1 w-48 max-h-40 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setAllergenEmoji('➕');
                              setShowAllergenEmojiPicker(false);
                            }}
                            className="p-1 hover:bg-muted rounded text-[10px] text-muted-foreground"
                          >
                            Nessuna
                          </button>
                          {EMOJI_LIST.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setAllergenEmoji(emoji);
                                setShowAllergenEmojiPicker(false);
                              }}
                              className="p-1 hover:bg-muted rounded text-base cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      value={customAllergen}
                      onChange={(e) => setCustomAllergen(e.target.value)}
                      placeholder="Nuovo allergene (es. Arachidi)"
                      className="flex-1 px-3 py-2 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring min-w-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const txt = customAllergen.trim();
                          if (txt) {
                            const finalVal = allergenEmoji !== '➕' ? `${allergenEmoji} ${txt}` : txt;
                            handleAddAllergen(finalVal);
                            setCustomAllergen('');
                            setAllergenEmoji('➕');
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const txt = customAllergen.trim();
                        if (txt) {
                          const finalVal = allergenEmoji !== '➕' ? `${allergenEmoji} ${txt}` : txt;
                          handleAddAllergen(finalVal);
                          setCustomAllergen('');
                          setAllergenEmoji('➕');
                        }
                      }}
                      className="px-2.5 py-2 bg-primary text-white hover:bg-primary-hover rounded-lg text-[10px] font-bold flex items-center justify-center gap-0.5 cursor-pointer transition-colors"
                    >
                      <Plus size={10} />
                      Aggiungi
                    </button>
                  </div>
                </div>

                {/* Tag Piatto section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Etichette / Tag Piatto (es. Vegano)
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setNewItem((p) => ({ ...p, dishTags: [] }));
                        }}
                        className="text-[9px] font-bold text-muted-foreground hover:text-foreground hover:underline uppercase cursor-pointer"
                      >
                        Pulisci
                      </button>
                      <span className="text-[9px] text-muted-foreground">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          const standardOnly = [
                            'leaf:Vegano',
                            'leaf:Vegetariano',
                            'flame:Piccante',
                            'wheat:Senza Glutine',
                            'sparkles:Novità',
                            'star:Consigliato'
                          ];
                          setNewItem((p) => ({
                            ...p,
                            dishTags: Array.from(new Set([...(p.dishTags || []), ...standardOnly]))
                          }));
                        }}
                        className="text-[9px] font-bold text-primary hover:underline uppercase cursor-pointer"
                      >
                        Standard
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5 p-3.5 bg-muted/20 border border-border rounded-xl mb-3.5 max-h-40 overflow-y-auto">
                    {availableDishTags.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Nessuna etichetta inserita</p>
                    )}
                    {availableDishTags.map((t) => {
                      const isActive = (newItem.dishTags || []).includes(t);
                      const { iconName, label } = parseTag(t);
                      const IconComp = getIconComponent(iconName);
                      
                      return (
                        <div
                          key={t}
                          onClick={() => toggleDishTag(t)}
                          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer select-none active:scale-[0.97] pr-8 ${isActive
                            ? 'bg-primary/10 border-primary/40 text-primary shadow-sm shadow-primary/5'
                            : 'bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                            }`}
                        >
                          {IconComp}
                          <span>{label}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDishTag(t);
                            }}
                            className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center border border-white shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                            style={{ fontSize: '8px', lineHeight: '1' }}
                            title={`Elimina ${label}`}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Visual custom tag creator */}
                  <div className="p-3.5 border border-border/70 bg-muted/10 rounded-2xl space-y-3">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                        1. Scegli Icona
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(ICON_MAP).map((name) => {
                          const Icon = ICON_MAP[name];
                          const isSelected = selectedTagIcon === name;
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => setSelectedTagIcon(name)}
                              title={ICON_LABELS[name]}
                              className={`p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                                isSelected
                                  ? 'bg-primary border-primary text-white shadow-sm'
                                  : 'bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                              }`}
                            >
                              <Icon size={14} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="space-y-1.5">
                        <label htmlFor="custom-tag-name-wizard" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                          2. Inserisci Testo Etichetta
                        </label>
                        <input
                          id="custom-tag-name-wizard"
                          type="text"
                          value={customTag}
                          onChange={(e) => setCustomTag(e.target.value)}
                          placeholder="Es. Biologico, Senza Lattosio"
                          className="w-full px-3.5 py-2 text-xs bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const txt = customTag.trim();
                              if (txt) {
                                const finalVal = `${selectedTagIcon}:${txt}`;
                                handleAddDishTag(finalVal);
                                setCustomTag('');
                              }
                            }
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const txt = customTag.trim();
                          if (txt) {
                            const finalVal = `${selectedTagIcon}:${txt}`;
                            handleAddDishTag(finalVal);
                            setCustomTag('');
                          }
                        }}
                        className="w-full py-2 bg-primary text-white hover:bg-primary-hover rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors h-[34px]"
                      >
                        <Plus size={12} />
                        Crea Etichetta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Regole di Personalizzazione */}
            <div className="border-t border-border/85 pt-4 mt-2 text-left">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Regole di Personalizzazione Piatto
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/20 border border-border rounded-xl">
                {/* customizationEnabled Toggle */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <span className="text-xs font-bold text-foreground block">Consenti modifiche al piatto</span>
                    <span className="text-[10px] text-muted-foreground leading-normal block mt-0.5">
                      Se disattivato, il cliente non potrà aggiungere supplementi o rimuovere ingredienti. Il piatto verrà aggiunto direttamente al carrello.
                    </span>
                  </div>
                  <Toggle
                    checked={newItem.customizationEnabled ?? true}
                    onChange={(val) => setNewItem((p) => ({ ...p, customizationEnabled: val }))}
                  />
                </div>

                {/* notesEnabled Toggle */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <span className="text-xs font-bold text-foreground block">Consenti note per la cucina</span>
                    <span className="text-[10px] text-muted-foreground leading-normal block mt-0.5">
                      Se disattivato, il campo note cucina non verrà mostrato nel dettaglio di questo piatto.
                    </span>
                  </div>
                  <Toggle
                    checked={newItem.notesEnabled ?? true}
                    onChange={(val) => setNewItem((p) => ({ ...p, notesEnabled: val }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                onClick={() => {
                  if (!newItem.name || !newItem.price) {
                    setShowErrors(true);
                    return;
                  }
                  addMenuItem();
                  setShowErrors(false);
                }}
                className="flex-1 bg-primary text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                {newItem.id ? 'Salva Modifiche' : 'Salva Piatto'}
              </button>
              <button
                onClick={() => setShowAddItem(false)}
                className="px-6 py-3 text-sm font-bold text-muted-foreground hover:text-foreground"
              >
                Annulla
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
