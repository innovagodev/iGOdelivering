'use client';
import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Check,
  X,
  Plus,
  Euro,
  Upload,
  Clock,
  Trash2,
} from 'lucide-react';

import { DISH_TAGS_LIST } from '@/lib/constants';

// Modelli predefiniti rimossi per creazione da zero

type VisibilityType = 'always' | 'hidden' | 'scheduled';

interface OptionChoice {
  id: string;
  name: string;
  price: string;
}

interface OptionGroup {
  id: string;
  name: string;
  minSelections: number;
  maxSelections: number | null;
  choices: OptionChoice[];
}

interface MenuItemDraft {
  id: string;
  name: string;
  category: string;
  price: string;
  originalPrice?: string;
  description: string;
  available: boolean;
  imageUrl: string;
  allergens: string[];
  dishTags?: string[];
  ingredients?: string[];
  visibility: VisibilityType;
  visibilitySchedule?: { from: string; to: string };
  optionGroups: OptionGroup[];
}

interface ItemFormProps {
  item: MenuItemDraft;
  categories: string[];
  onSave: (item: MenuItemDraft) => void;
  onCancel: () => void;
  title: string;
  saveLabel: string;
  onAddCategory: (cat: string) => void;
  allergensList: string[];
}

export default function ItemForm({
  item,
  categories,
  onSave,
  onCancel,
  title,
  saveLabel,
  onAddCategory,
  allergensList,
}: ItemFormProps) {
  const [supplementiSingoli, setSupplementiSingoli] = useState<OptionChoice[]>(() => {
    const group = item.optionGroups?.find((g) => g.name === 'Supplementi' || g.name === 'Supplementi Singoli' || g.id === 'supplementi-singoli');
    return group ? [...group.choices] : [];
  });
  const [newSuppName, setNewSuppName] = useState('');
  const [newSuppPrice, setNewSuppPrice] = useState('');

  const [draft, setDraft] = useState<MenuItemDraft>({
    ...item,
    optionGroups: item.optionGroups
      ? item.optionGroups
        .filter((g) => g.name !== 'Supplementi' && g.name !== 'Supplementi Singoli' && g.id !== 'supplementi-singoli')
        .map((g) => ({
          ...g,
          minSelections: g.minSelections ?? 0,
          maxSelections: g.maxSelections !== undefined ? g.maxSelections : null,
        }))
      : [],
    visibility: 'always',
    dishTags: item.dishTags ? [...item.dishTags] : [],
    ingredients: item.ingredients ? [...item.ingredients] : [],
  });
  const [isPromo, setIsPromo] = useState(!!item.originalPrice);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newChoiceName, setNewChoiceName] = useState<Record<string, string>>({});
  const [newChoicePrice, setNewChoicePrice] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isSupplementsModalOpen, setIsSupplementsModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [modalOptionGroups, setModalOptionGroups] = useState<OptionGroup[]>([]);
  const [customAllergen, setCustomAllergen] = useState('');
  const [availableAllergens, setAvailableAllergens] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [availableDishTags, setAvailableDishTags] = useState<string[]>([]);
  const [newIngredientInput, setNewIngredientInput] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [sessionGroups, setSessionGroups] = useState<OptionGroup[]>([]);
  const [activeGroupIds, setActiveGroupIds] = useState<string[]>([]);

  // Emoji Picker States
  const [allergenEmoji, setAllergenEmoji] = useState('➕');
  const [showAllergenEmojiPicker, setShowAllergenEmojiPicker] = useState(false);
  const [tagEmoji, setTagEmoji] = useState('➕');
  const [showTagEmojiPicker, setShowTagEmojiPicker] = useState(false);

  const EMOJI_LIST = [
    '🌱', '🥗', '🌶️', '🔥', '🆕', '⭐', '👑',
    '🍕', '🍔', '🍣', '🥩', '🐟', '🥛', '🥚',
    '🥜', '🌾', '🍪', '🍇', '🍋', '🥤', '🍷',
    '❄️', '🧪'
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const group = item.optionGroups?.find((g) => g.name === 'Supplementi' || g.name === 'Supplementi Singoli' || g.id === 'supplementi-singoli');
    setSupplementiSingoli(group ? [...group.choices] : []);

    const loadedGroups = item.optionGroups
      ? item.optionGroups
        .filter((g) => g.name !== 'Supplementi' && g.name !== 'Supplementi Singoli' && g.id !== 'supplementi-singoli')
        .map((g) => ({
          ...g,
          minSelections: g.minSelections ?? 0,
          maxSelections: g.maxSelections !== undefined ? g.maxSelections : null,
        }))
      : [];

    setDraft({
      ...item,
      optionGroups: loadedGroups,
      visibility: 'always',
      dishTags: item.dishTags ? [...item.dishTags] : [],
      ingredients: item.ingredients ? [...item.ingredients] : [],
    });
    setIsPromo(!!item.originalPrice);

    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('iGO_session_option_groups');
      let loadedSession: OptionGroup[] = [];
      if (stored) {
        try {
          loadedSession = JSON.parse(stored);
        } catch (e) {}
      }
      const mergedMap = new Map<string, OptionGroup>();
      loadedSession.forEach((g) => mergedMap.set(g.id, g));
      loadedGroups.forEach((g) => mergedMap.set(g.id, g));

      const merged = Array.from(mergedMap.values());
      setSessionGroups(merged);
      sessionStorage.setItem('iGO_session_option_groups', JSON.stringify(merged));
    }
  }, [item]);

  useEffect(() => {
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
      const initialSet = new Set([...list, ...(item.allergens || [])]);
      const merged = Array.from(initialSet).filter(Boolean);
      setAvailableAllergens(merged);
    }
  }, [item.allergens]);

  useEffect(() => {
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
      const initialSet = new Set([...list, ...(item.dishTags || [])]);
      const merged = Array.from(initialSet).filter(Boolean);
      setAvailableDishTags(merged);
    }
  }, [item.dishTags]);

  useEffect(() => {
    if (isSupplementsModalOpen) {
      const itemGroups = draft.optionGroups
        ? draft.optionGroups.map((g) => ({
          ...g,
          minSelections: g.minSelections ?? 0,
          maxSelections: g.maxSelections !== undefined ? g.maxSelections : null,
          choices: g.choices ? [...g.choices] : [],
        }))
        : [];
      
      let sessionGroupsLoaded: OptionGroup[] = [];
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('iGO_session_option_groups');
        if (stored) {
          try {
            sessionGroupsLoaded = JSON.parse(stored);
          } catch (e) {}
        }
      }

      const mergedMap = new Map<string, OptionGroup>();
      sessionGroupsLoaded.forEach((g) => mergedMap.set(g.id, g));
      itemGroups.forEach((g) => mergedMap.set(g.id, g));

      const allGroups = Array.from(mergedMap.values());
      setModalOptionGroups(allGroups);
      setSelectedGroupId(allGroups.length > 0 ? allGroups[0].id : null);
      setActiveGroupIds(itemGroups.map((g) => g.id));
    }
  }, [isSupplementsModalOpen, draft.optionGroups]);

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
    if (!draft.allergens.includes(trimmed)) {
      setDraft((p) => ({ ...p, allergens: [...p.allergens, trimmed] }));
    }
  };

  const handleDeleteAllergen = (a: string) => {
    setAvailableAllergens((prev) => {
      const next = prev.filter((x) => x !== a);
      saveAllergensToLocalStorage(next);
      return next;
    });
    setDraft((p) => ({ ...p, allergens: p.allergens.filter((x) => x !== a) }));
  };

  const toggleAllergen = (a: string) => {
    setDraft((p) => ({
      ...p,
      allergens: p.allergens.includes(a) ? p.allergens.filter((x) => x !== a) : [...p.allergens, a],
    }));
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
    const currentTags = draft.dishTags || [];
    if (!currentTags.includes(trimmed)) {
      setDraft((p) => ({ ...p, dishTags: [...(p.dishTags || []), trimmed] }));
    }
  };

  const handleDeleteDishTag = (a: string) => {
    setAvailableDishTags((prev) => {
      const next = prev.filter((x: string) => x !== a);
      saveDishTagsToLocalStorage(next);
      return next;
    });
    setDraft((p) => ({ ...p, dishTags: (p.dishTags || []).filter((x: string) => x !== a) }));
  };

  const toggleDishTag = (a: string) => {
    const currentTags = draft.dishTags || [];
    setDraft((p) => ({
      ...p,
      dishTags: currentTags.includes(a) ? currentTags.filter((x: string) => x !== a) : [...currentTags, a],
    }));
  };

  const handleAddIngredient = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    const currentIngredients = draft.ingredients || [];
    if (!currentIngredients.includes(trimmed)) {
      setDraft((p) => ({ ...p, ingredients: [...currentIngredients, trimmed] }));
    }
  };

  const handleRemoveIngredient = (ing: string) => {
    const currentIngredients = draft.ingredients || [];
    setDraft((p) => ({ ...p, ingredients: currentIngredients.filter((x) => x !== ing) }));
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setDraft((p) => ({ ...p, imageUrl: url }));
  };

  const handleAddCategory = () => {
    const cat = newCategoryInput.trim();
    if (!cat) return;
    onAddCategory(cat);
    setDraft((p) => ({ ...p, category: cat }));
    setNewCategoryInput('');
    setShowNewCategory(false);
  };

  const handleAddGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    const newGroup: OptionGroup = {
      id: `og-${Date.now()}`,
      name: name,
      minSelections: 0,
      maxSelections: null,
      choices: [],
    };
    setModalOptionGroups((prev) => {
      const updated = [...prev, newGroup];
      setSelectedGroupId(newGroup.id);
      return updated;
    });
    setActiveGroupIds((prev) => [...prev, newGroup.id]);
    setNewGroupName('');
  };

  const handleDeleteGroup = (id: string) => {
    setModalOptionGroups((prev) => {
      const updated = prev.filter((g) => g.id !== id);
      if (selectedGroupId === id) {
        setSelectedGroupId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
    setActiveGroupIds((prev) => prev.filter((x) => x !== id));
  };

  const handleAddChoice = (gid: string) => {
    const name = (newChoiceName[gid] || '').trim();
    if (!name) return;
    const priceVal = newChoicePrice[gid] || '0';
    const newChoice: OptionChoice = {
      id: `ch-${Date.now()}`,
      name,
      price: priceVal,
    };
    setModalOptionGroups((prev) =>
      prev.map((g) =>
        g.id === gid
          ? {
            ...g,
            choices: [...g.choices, newChoice],
          }
          : g
      )
    );
    setNewChoiceName((prev) => ({ ...prev, [gid]: '' }));
    setNewChoicePrice((prev) => ({ ...prev, [gid]: '' }));
  };

  const handleDeleteChoice = (gid: string, cid: string) => {
    setModalOptionGroups((prev) =>
      prev.map((g) =>
        g.id === gid
          ? {
            ...g,
            choices: g.choices.filter((c) => c.id !== cid),
          }
          : g
      )
    );
  };

  // availableAllergens is managed state-side

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
      <p className="text-base font-bold text-foreground">{title}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Name */}
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            Nome Piatto *
          </label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => {
              setDraft((p) => ({ ...p, name: e.target.value }));
              if (e.target.value.trim()) setShowErrors(false);
            }}
            placeholder="es. Pizza Margherita"
            className={`w-full px-3.5 py-2.5 text-base bg-input border rounded-xl focus:outline-none focus:ring-2 transition-all ${
              showErrors && !draft.name.trim()
                ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
                : 'border-border focus:ring-primary/20 focus:border-primary'
            }`}
          />
          {showErrors && !draft.name.trim() && (
            <p className="text-red-500 text-[10px] font-semibold mt-1">Il nome del piatto è obbligatorio</p>
          )}
        </div>

        {/* Category Selector */}
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            Categoria
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={draft.category}
                onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setShowNewCategory(true)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted border border-border transition-colors cursor-pointer flex items-center justify-center"
              title="Aggiungi categoria"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Price, Promotion & Image unified row layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end sm:col-span-2">

          {/* COLONNA SINISTRA: Prezzo di Listino (largo quanto Nome Piatto) */}
          <div className="w-full">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Prezzo di Listino (€) *
            </label>
            <div className="relative">
              <Euro
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="number"
                value={draft.price}
                onChange={(e) => {
                  setDraft((p) => ({ ...p, price: e.target.value }));
                  if (e.target.value.trim()) setShowErrors(false);
                }}
                placeholder="9.50"
                className={`w-full pl-9 pr-3 py-2.5 text-base bg-input border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  showErrors && !draft.price.trim()
                    ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
                    : 'border-border focus:ring-primary/20 focus:border-primary'
                }`}
              />
            </div>
            {showErrors && !draft.price.trim() && (
              <p className="text-red-500 text-[10px] font-semibold mt-1">Il prezzo di listino è obbligatorio</p>
            )}
          </div>

          {/* COLONNA DESTRA: Promozione Check + Prezzo Scontato + Caricamento Immagine */}
          <div className="flex flex-col sm:flex-row gap-3.5 items-end w-full">

            {/* Checkbox Promozione (styled premium as a toggle button) */}
            <div className="w-full sm:w-auto flex-shrink-0">
              <span className="block text-xs font-bold text-transparent select-none mb-1.5 hidden sm:block">
                Promo
              </span>
              <label
                className={`flex items-center justify-center gap-2 px-3.5 h-[46px] border rounded-xl cursor-pointer select-none transition-all w-full sm:w-auto ${isPromo
                  ? 'border-primary/40 bg-primary/5 text-primary'
                  : 'border-border bg-input text-muted-foreground hover:bg-muted/45'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={isPromo}
                  onChange={(e) => {
                    setIsPromo(e.target.checked);
                    if (!e.target.checked) setDraft((p) => ({ ...p, originalPrice: '' }));
                  }}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary/20 cursor-pointer"
                />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Promo
                </span>
              </label>
            </div>

            {/* Prezzo Scontato (se attivo) */}
            {isPromo && (
              <div className="w-full sm:w-36 flex-shrink-0 animate-in fade-in slide-in-from-left-2 duration-200">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Scontato (€) *
                </label>
                <div className="relative">
                  <Euro
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="number"
                    value={draft.originalPrice || ''}
                    onChange={(e) => setDraft((p) => ({ ...p, originalPrice: e.target.value }))}
                    placeholder="7.50"
                    className="w-full pl-9 pr-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
            )}

            {/* Immagine del Piatto (stessa altezza h-[46px], allineata tutto a destra) */}
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Immagine Piatto
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith('image/')) {
                    const url = URL.createObjectURL(file);
                    setDraft((p) => ({ ...p, imageUrl: url }));
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-xl h-[46px] px-3 flex items-center justify-center gap-2 transition-all cursor-pointer select-none relative overflow-hidden ${isDragging
                  ? 'border-primary bg-primary/5'
                  : draft.imageUrl
                    ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'
                    : 'border-border hover:border-primary/50 bg-input hover:bg-muted/40'
                  }`}
              >
                {draft.imageUrl ? (
                  <div className="flex items-center justify-between w-full h-full gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={draft.imageUrl}
                        alt="Preview"
                        className="w-7 h-7 rounded-lg object-cover border border-emerald-500/20 flex-shrink-0"
                      />
                      <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                        Foto caricata
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDraft((p) => ({ ...p, imageUrl: '' }));
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0"
                      title="Rimuovi immagine"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                    <Plus size={14} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-xs font-semibold whitespace-nowrap">Carica Foto</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFile}
                />
              </div>
            </div>

          </div>
        </div>

        {/* Description */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            Descrizione Piatto
          </label>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            placeholder="Descrivi il piatto"
            className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
          />
        </div>

        {/* Ingredients Section */}
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Ingredienti del Piatto
            </label>
            {(draft.ingredients || []).length > 0 && (
              <button
                type="button"
                onClick={() => setDraft((p) => ({ ...p, ingredients: [] }))}
                className="text-[10px] font-bold text-muted-foreground hover:text-foreground hover:underline uppercase cursor-pointer"
              >
                Pulisci tutto
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5 p-3 bg-muted/20 border border-border rounded-xl">
            {(!draft.ingredients || draft.ingredients.length === 0) && (
              <p className="text-xs text-muted-foreground italic">Nessun ingrediente inserito (verranno mostrati solo se aggiunti)</p>
            )}
            {(draft.ingredients || []).map((ing) => (
              <div
                key={ing}
                className="relative px-3.5 py-1.5 rounded-lg text-xs font-semibold border bg-card border-border text-foreground select-none pr-7 flex items-center"
              >
                {ing}
                <button
                  type="button"
                  onClick={() => handleRemoveIngredient(ing)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center border border-white shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer animate-in zoom-in-50 duration-75"
                  style={{ fontSize: '8px', lineHeight: '1' }}
                  title={`Elimina ${ing}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={newIngredientInput}
              onChange={(e) => setNewIngredientInput(e.target.value)}
              placeholder="Aggiungi ingrediente (es. Pomodoro, Mozzarella...)"
              className="flex-1 px-3.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
              className="px-3.5 py-2 bg-primary text-white hover:bg-[#d43d22] rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <Plus size={14} />
              Aggiungi
            </button>
          </div>
        </div>

        {/* Allergen Input (Pills + Inline custom allergen input with Emoji) */}
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Allergeni
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraft((p) => ({ ...p, allergens: [] }))}
                className="text-[10px] font-bold text-muted-foreground hover:text-foreground hover:underline uppercase cursor-pointer"
              >
                Pulisci
              </button>
              <span className="text-[10px] text-muted-foreground">|</span>
              <button
                type="button"
                onClick={() => setDraft((p) => ({ ...p, allergens: [...availableAllergens] }))}
                className="text-[10px] font-bold text-primary hover:underline uppercase cursor-pointer"
              >
                Seleziona Tutti
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 p-3 bg-muted/20 border border-border rounded-xl">
            {availableAllergens.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Nessun allergene inserito</p>
            )}
            {availableAllergens.map((a) => {
              const isActive = draft.allergens.includes(a);
              return (
                <div
                  key={a}
                  onClick={() => toggleAllergen(a)}
                  className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer select-none active:scale-[0.97] pr-7 ${isActive
                    ? 'bg-amber-100 border-amber-300 text-amber-800 shadow-sm shadow-amber-300/10'
                    : 'bg-card border-border text-muted-foreground hover:border-amber-300 hover:text-foreground'
                    }`}
                >
                  {isActive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600 mr-1.5 animate-pulse" />}
                  {a}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAllergen(a);
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center border border-white shadow-md transition-transform hover:scale-110 active:scale-95"
                    style={{ fontSize: '8px', lineHeight: '1' }}
                    title={`Elimina ${a}`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* Inline input with Emoji Selector to add a custom allergen */}
          <div className="mt-3 flex gap-2 relative">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowAllergenEmojiPicker(!showAllergenEmojiPicker);
                  setShowTagEmojiPicker(false);
                }}
                className="px-3.5 py-2.5 bg-input border border-border rounded-xl hover:bg-muted text-base cursor-pointer flex items-center justify-center min-w-[46px]"
                title="Seleziona Icona/Emoji"
              >
                {allergenEmoji}
              </button>
              {showAllergenEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-2 p-2 bg-card border border-border rounded-xl shadow-xl z-20 grid grid-cols-6 gap-1 w-48 max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setAllergenEmoji('➕');
                      setShowAllergenEmojiPicker(false);
                    }}
                    className="p-1 hover:bg-muted rounded text-xs text-muted-foreground"
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
                      className="p-1 hover:bg-muted rounded text-lg cursor-pointer"
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
              placeholder="Aggiungi nuovo allergene (es. Arachidi)"
              className="flex-1 px-3.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
              className="px-3.5 py-2 bg-primary text-white hover:bg-[#d43d22] rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <Plus size={14} />
              Aggiungi
            </button>
          </div>
        </div>

        {/* Dish Tags Input (Pills + Inline custom tag input with Emoji) */}
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Etichette / Tag Piatto (es. Vegano, Piccante)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraft((p) => ({ ...p, dishTags: [] }))}
                className="text-[10px] font-bold text-muted-foreground hover:text-foreground hover:underline uppercase cursor-pointer"
              >
                Pulisci
              </button>
              <span className="text-[10px] text-muted-foreground">|</span>
              <button
                type="button"
                onClick={() => setDraft((p) => ({ ...p, dishTags: [...availableDishTags] }))}
                className="text-[10px] font-bold text-primary hover:underline uppercase cursor-pointer"
              >
                Seleziona Tutti
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 p-3 bg-muted/20 border border-border rounded-xl">
            {availableDishTags.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Nessuna etichetta inserita</p>
            )}
            {availableDishTags.map((t) => {
              const isActive = (draft.dishTags || []).includes(t);
              return (
                <div
                  key={t}
                  onClick={() => toggleDishTag(t)}
                  className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer select-none active:scale-[0.97] pr-7 ${isActive
                    ? 'bg-primary/10 border-primary/40 text-primary shadow-sm shadow-primary/5'
                    : 'bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                    }`}
                >
                  {isActive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-1.5 animate-pulse" />}
                  {t}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDishTag(t);
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center border border-white shadow-md transition-transform hover:scale-110 active:scale-95"
                    style={{ fontSize: '8px', lineHeight: '1' }}
                    title={`Elimina ${t}`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* Inline input with Emoji Selector to add a custom tag */}
          <div className="mt-3 flex gap-2 relative">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowTagEmojiPicker(!showTagEmojiPicker);
                  setShowAllergenEmojiPicker(false);
                }}
                className="px-3.5 py-2.5 bg-input border border-border rounded-xl hover:bg-muted text-base cursor-pointer flex items-center justify-center min-w-[46px]"
                title="Seleziona Icona/Emoji"
              >
                {tagEmoji}
              </button>
              {showTagEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-2 p-2 bg-card border border-border rounded-xl shadow-xl z-20 grid grid-cols-6 gap-1 w-48 max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setTagEmoji('➕');
                      setShowTagEmojiPicker(false);
                    }}
                    className="p-1 hover:bg-muted rounded text-xs text-muted-foreground"
                  >
                    Nessuna
                  </button>
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setTagEmoji(emoji);
                        setShowTagEmojiPicker(false);
                      }}
                      className="p-1 hover:bg-muted rounded text-lg cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder="Aggiungi etichetta (es. Vegano)"
              className="flex-1 px-3.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const txt = customTag.trim();
                  if (txt) {
                    const finalVal = tagEmoji !== '➕' ? `${tagEmoji} ${txt}` : txt;
                    handleAddDishTag(finalVal);
                    setCustomTag('');
                    setTagEmoji('➕');
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                const txt = customTag.trim();
                if (txt) {
                  const finalVal = tagEmoji !== '➕' ? `${tagEmoji} ${txt}` : txt;
                  handleAddDishTag(finalVal);
                  setCustomTag('');
                  setTagEmoji('➕');
                }
              }}
              className="px-3.5 py-2 bg-primary text-white hover:bg-[#d43d22] rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <Plus size={14} />
              Aggiungi
            </button>
          </div>
        </div>

        {/* Supplementi Singoli Section */}
        <div className="sm:col-span-2 border-t border-border/60 pt-4 mt-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Supplementi del Piatto
              </label>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Aggiungi ingredienti extra, oppure importa da un gruppo.
              </p>
            </div>
            {/* Import from groups dropdown selector */}
            {sessionGroups.filter((g) => g.id !== 'supplementi-singoli' && g.name !== 'Supplementi' && g.name !== 'Supplementi Singoli').length > 0 && (
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Inserisci da Gruppo:</label>
                <select
                  onChange={(e) => {
                    const targetId = e.target.value;
                    if (!targetId) return;

                    const localGroup = sessionGroups.find((g) => g.id === targetId);
                    if (localGroup) {
                      setDraft((prev) => {
                        const exists = prev.optionGroups.some((g) => g.id === localGroup.id || g.name.toLowerCase() === localGroup.name.toLowerCase());
                        if (exists) return prev;
                        return {
                          ...prev,
                          optionGroups: [...prev.optionGroups, localGroup],
                        };
                      });
                    }
                    e.target.value = ''; // Reset select
                  }}
                  className="px-2.5 py-1 text-xs bg-input border border-border rounded-lg focus:outline-none cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>Scegli</option>
                  {sessionGroups
                    .filter((g) => g.id !== 'supplementi-singoli' && g.name !== 'Supplementi' && g.name !== 'Supplementi Singoli')
                    .map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 p-3 bg-muted/20 border border-border rounded-xl mb-3">
            {supplementiSingoli.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Nessun supplemento configurato. Aggiungilo qui sotto.</p>
            )}
            {supplementiSingoli.map((choice) => (
              <div
                key={choice.id}
                className="relative px-3.5 py-1.5 rounded-lg text-xs font-semibold border bg-card border-border text-foreground pr-7"
              >
                <span>{choice.name}</span>
                <span className="text-primary font-bold ml-1.5">(+€{parseFloat(choice.price || '0').toFixed(2)})</span>
                <button
                  type="button"
                  onClick={() => setSupplementiSingoli((prev) => prev.filter((c) => c.id !== choice.id))}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center border border-white shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                  style={{ fontSize: '8px', lineHeight: '1' }}
                  title={`Elimina ${choice.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Add custom single supplement input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newSuppName}
              onChange={(e) => setNewSuppName(e.target.value)}
              placeholder="Aggiungi supplemento (es. Ketchup, Extra Cotto...)"
              className="flex-1 px-3.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (newSuppName.trim()) {
                    const price = parseFloat(newSuppPrice) >= 0 ? parseFloat(newSuppPrice).toFixed(2) : '0.00';
                    setSupplementiSingoli((prev) => [
                      ...prev,
                      { id: `choice-${Date.now()}`, name: newSuppName.trim(), price },
                    ]);
                    setNewSuppName('');
                    setNewSuppPrice('');
                  }
                }
              }}
            />
            <div className="relative w-28 flex-shrink-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">+€</span>
              <input
                type="number"
                value={newSuppPrice}
                onChange={(e) => setNewSuppPrice(e.target.value)}
                placeholder="0.00"
                min={0}
                step={0.1}
                className="w-full pl-8 pr-2.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (newSuppName.trim()) {
                  const price = parseFloat(newSuppPrice) >= 0 ? parseFloat(newSuppPrice).toFixed(2) : '0.00';
                  setSupplementiSingoli((prev) => [
                    ...prev,
                    { id: `choice-${Date.now()}`, name: newSuppName.trim(), price },
                  ]);
                  setNewSuppName('');
                  setNewSuppPrice('');
                }
              }}
              className="px-3.5 py-2 bg-primary text-white hover:bg-[#d43d22] rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <Plus size={14} />
              Aggiungi
            </button>
          </div>
        </div>

        {/* Supplements Section */}
        <div className="sm:col-span-2 border-t border-border/60 pt-4 mt-2">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Varianti & Opzioni Aggiuntive
            </label>
            <button
              type="button"
              onClick={() => setIsSupplementsModalOpen(true)}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 transition-all"
            >
              <Plus size={12} />
              Gestisci Opzioni Veloci
            </button>
          </div>

          {draft.optionGroups.length === 0 ? (
            <div className="bg-muted/10 border border-border border-dashed rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground">Nessuna variante o ingrediente extra configurato.</p>
              <button
                type="button"
                onClick={() => setIsSupplementsModalOpen(true)}
                className="text-[11px] text-primary font-bold hover:underline mt-1 cursor-pointer"
              >
                Aggiungi il primo gruppo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {draft.optionGroups.map((group) => (
                <div key={group.id} className="bg-muted/20 border border-border/85 rounded-xl p-3 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center justify-between border-b border-border/60 pb-1.5 mb-1.5">
                      <span>{group.name}</span>
                      <div className="flex gap-1.5 items-center">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-bold">
                          {group.minSelections > 0 ? 'Obblig.' : 'Opz.'}
                          {group.maxSelections === 1 ? ' (Singola)' : group.maxSelections ? ` (Max ${group.maxSelections})` : ''}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground bg-card px-1.5 py-0.5 rounded border border-border font-semibold">
                          {group.choices.length} {group.choices.length === 1 ? 'scelta' : 'scelte'}
                        </span>
                      </div>
                    </h4>
                    {group.choices.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {group.choices.slice(0, 5).map((choice) => (
                          <span key={choice.id} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-card border border-border/60 text-[10px] font-semibold text-muted-foreground">
                            {choice.name} (+€{parseFloat(choice.price || '0').toFixed(2)})
                          </span>
                        ))}
                        {group.choices.length > 5 && (
                          <span className="text-[9px] text-muted-foreground font-bold pl-1 mt-1">
                            +{group.choices.length - 5} altre
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">Nessuna scelta inserita</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <button
          onClick={() => {
            if (!draft.name || !draft.price) {
              setShowErrors(true);
              return;
            }
            const finalOptionGroups = [...draft.optionGroups];
            if (supplementiSingoli.length > 0) {
              finalOptionGroups.push({
                id: 'supplementi-singoli',
                name: 'Supplementi',
                minSelections: 0,
                maxSelections: null,
                choices: supplementiSingoli,
              });
            }
            const finalDraft = {
              ...draft,
              originalPrice: isPromo ? (draft.originalPrice || '') : '',
              optionGroups: finalOptionGroups,
            };
            onSave(finalDraft);
          }}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#d43d22] transition-all cursor-pointer shadow-md shadow-primary/10"
        >
          <Check size={16} />
          {saveLabel}
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          Annulla
        </button>
      </div>

      {/* Category Creation Modal popup */}
      {showNewCategory && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-5 animate-fade-in relative text-left">
            <button
              onClick={() => {
                setShowNewCategory(false);
                setNewCategoryInput('');
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg cursor-pointer"
            >
              <X size={15} />
            </button>
            <h3 className="text-sm font-bold text-foreground mb-3">Nuova Categoria</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                placeholder="Nuova categoria (es. Sfizi, Dolci...)"
                className="w-full px-3 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const cat = newCategoryInput.trim();
                    if (cat) {
                      onAddCategory(cat);
                      setDraft((p) => ({ ...p, category: cat }));
                      setNewCategoryInput('');
                      setShowNewCategory(false);
                    }
                  }
                }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCategory(false);
                    setNewCategoryInput('');
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-[#d43d22] cursor-pointer"
                >
                  Aggiungi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Supplements Modal dialog */}
      {isSupplementsModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-fade-in relative text-left">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/10">
              <div>
                <h3 className="text-base font-bold text-foreground">Gestione Varianti & Opzioni</h3>
                <p className="text-xs text-muted-foreground">Configura opzioni a scelta per il piatto (es. ingredienti extra, formato)</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSupplementsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Area (Split Grid) */}
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-5 gap-6 min-h-0">
              {/* Left Column: Groups List & Add Group (Span 2) */}
              <div className="md:col-span-2 border-r border-border md:pr-5 flex flex-col space-y-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Aggiungi Gruppo Opzioni
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="es. Salse, Aggiunte..."
                      className="flex-1 px-3 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddGroup();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddGroup}
                      className="px-3.5 py-1.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-[#d43d22] transition-colors cursor-pointer"
                    >
                      Crea
                    </button>
                  </div>
                </div>

                {/* Modelli rimossi per creazione da zero */}

                <div className="flex-1 flex flex-col min-h-[200px] border-t border-border/60 pt-3">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Gruppi Creati
                  </label>
                  {modalOptionGroups.length === 0 ? (
                    <div className="flex-1 bg-muted/10 border border-border border-dashed rounded-xl p-4 flex items-center justify-center text-center">
                      <p className="text-xs text-muted-foreground">Nessun gruppo. Creane uno sopra per iniziare.</p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[350px]">
                      {modalOptionGroups.map((g) => {
                        const isSelected = selectedGroupId === g.id;
                        return (
                          <div
                            key={g.id}
                            onClick={() => setSelectedGroupId(g.id)}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${isSelected
                              ? 'bg-primary/5 border-primary text-primary font-semibold shadow-sm'
                              : 'bg-card border-border hover:border-primary/30 text-foreground'
                              }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={activeGroupIds.includes(g.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const checked = e.target.checked;
                                  setActiveGroupIds((prev) =>
                                    checked ? [...prev, g.id] : prev.filter((id) => id !== g.id)
                                  );
                                }}
                                className="w-4 h-4 text-primary border-border rounded focus:ring-primary/20 cursor-pointer flex-shrink-0"
                              />
                              <span className="text-xs truncate font-medium">{g.name}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                                {g.choices.length}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteGroup(g.id);
                                }}
                                className="text-muted-foreground hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                title="Elimina gruppo"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Active Group Details (Span 3) */}
              <div className="md:col-span-3 flex flex-col space-y-4">
                {(() => {
                  const activeGroup = modalOptionGroups.find((g) => g.id === selectedGroupId);
                  if (!activeGroup) {
                    return (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/10 border border-border border-dashed rounded-xl min-h-[300px]">
                        <p className="text-sm font-semibold text-muted-foreground">Seleziona o crea un gruppo</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Potrai gestire le opzioni e i relativi prezzi qui.</p>
                      </div>
                    );
                  }

                  const gid = activeGroup.id;
                  return (
                    <div className="flex-1 flex flex-col min-h-0 space-y-4">
                      {/* Rename Group & Title */}
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Nome Gruppo Opzioni
                        </label>
                        <input
                          type="text"
                          value={activeGroup.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setModalOptionGroups((prev) =>
                              prev.map((g) => (g.id === gid ? { ...g, name: val } : g))
                            );
                          }}
                          className="w-full px-3.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold"
                        />
                      </div>

                      {/* Regole di Selezione & Vincoli */}
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
                                setModalOptionGroups((prev) =>
                                  prev.map((g) => (g.id === gid ? { ...g, maxSelections: 1, minSelections: Math.min(1, g.minSelections) } : g))
                                );
                              }}
                              className={`flex flex-col text-left p-3 border rounded-xl transition-all cursor-pointer ${activeGroup.maxSelections === 1
                                ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20'
                                : 'bg-card border-border hover:border-border-strong hover:bg-muted/10'
                                }`}
                            >
                              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${activeGroup.maxSelections === 1 ? 'border-primary' : 'border-muted-foreground'}`}>
                                  {activeGroup.maxSelections === 1 && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
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
                                setModalOptionGroups((prev) =>
                                  prev.map((g) => (g.id === gid ? { ...g, maxSelections: null } : g))
                                );
                              }}
                              className={`flex flex-col text-left p-3 border rounded-xl transition-all cursor-pointer ${activeGroup.maxSelections !== 1
                                ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20'
                                : 'bg-card border-border hover:border-border-strong hover:bg-muted/10'
                                }`}
                            >
                              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${activeGroup.maxSelections !== 1 ? 'border-primary bg-primary/10' : 'border-muted-foreground'}`}>
                                  {activeGroup.maxSelections !== 1 && <span className="w-1.5 h-1.5 bg-primary rounded-[2px]" />}
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
                                setModalOptionGroups((prev) =>
                                  prev.map((g) => (g.id === gid ? { ...g, minSelections: 0 } : g))
                                );
                              }}
                              className={`flex flex-col text-left p-3 border rounded-xl transition-all cursor-pointer ${activeGroup.minSelections === 0
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
                                setModalOptionGroups((prev) =>
                                  prev.map((g) => (g.id === gid ? { ...g, minSelections: 1 } : g))
                                );
                              }}
                              className={`flex flex-col text-left p-3 border rounded-xl transition-all cursor-pointer ${activeGroup.minSelections > 0
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
                            {activeGroup.minSelections > 0
                              ? activeGroup.maxSelections === 1
                                ? '🔴 Selezione Obbligatoria (1 sola scelta)'
                                : '🔴 Selezione Obbligatoria (Scelte multiple)'
                              : activeGroup.maxSelections === 1
                                ? '⚪ Selezione Facoltativa (Max 1 scelta)'
                                : '⚪ Selezione Facoltativa (Scelte multiple libere)'}
                          </span>
                        </div>
                      </div>

                      {/* Add Choice */}
                      <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm">
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Aggiungi Nuova Scelta / Ingrediente
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={newChoiceName[gid] || ''}
                            onChange={(e) =>
                              setNewChoiceName((p) => ({ ...p, [gid]: e.target.value }))
                            }
                            placeholder="es. Ketchup, Doppio Formaggio..."
                            className="flex-1 px-3 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddChoice(gid);
                              }
                            }}
                          />
                          <div className="relative w-full sm:w-28 flex-shrink-0">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">+€</span>
                            <input
                              type="number"
                              value={newChoicePrice[gid] || ''}
                              onChange={(e) =>
                                setNewChoicePrice((p) => ({ ...p, [gid]: e.target.value }))
                              }
                              placeholder="0.00"
                              min={0}
                              step={0.1}
                              className="w-full pl-8 pr-2.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddChoice(gid)}
                            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-[#d43d22] transition-colors cursor-pointer flex-shrink-0"
                          >
                            Aggiungi
                          </button>
                        </div>
                      </div>

                      {/* Choices List */}
                      <div className="flex-1 flex flex-col min-h-0 space-y-2">
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Scelte in {activeGroup.name}
                        </label>
                        {activeGroup.choices.length === 0 ? (
                          <div className="flex-1 bg-muted/10 border border-border border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center">
                            <p className="text-xs text-muted-foreground font-semibold">Nessuna scelta creata in questo gruppo.</p>
                            <p className="text-[10px] text-muted-foreground/75 mt-0.5">Usa il form sopra per aggiungere opzioni.</p>
                          </div>
                        ) : (
                          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[220px]">
                            {activeGroup.choices.map((choice) => (
                              <div
                                key={choice.id}
                                className="flex items-center gap-3 bg-muted/10 hover:bg-muted/20 p-2 rounded-xl border border-border"
                              >
                                <input
                                  type="text"
                                  value={choice.name}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setModalOptionGroups((p) =>
                                      p.map((g) =>
                                        g.id === gid
                                          ? {
                                            ...g,
                                            choices: g.choices.map((c) => (c.id === choice.id ? { ...c, name: val } : c)),
                                          }
                                          : g
                                      )
                                    );
                                  }}
                                  className="flex-1 px-3 py-1.5 text-base bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                />

                                <div className="relative w-24 flex-shrink-0">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">+€</span>
                                  <input
                                    type="number"
                                    value={choice.price}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setModalOptionGroups((p) =>
                                        p.map((g) =>
                                          g.id === gid
                                            ? {
                                              ...g,
                                              choices: g.choices.map((c) => (c.id === choice.id ? { ...c, price: val } : c)),
                                            }
                                            : g
                                        )
                                      );
                                    }}
                                    step={0.1}
                                    className="w-full pl-7 pr-2 py-1.5 text-base bg-input border border-border rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteChoice(gid, choice.id)}
                                  className="text-muted-foreground hover:text-red-500 p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0 cursor-pointer"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-muted/10 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsSupplementsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  const activeGroups = modalOptionGroups.filter((g) => activeGroupIds.includes(g.id));
                  setDraft((p) => ({ ...p, optionGroups: activeGroups }));
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('iGO_session_option_groups', JSON.stringify(modalOptionGroups));
                  }
                  setSessionGroups(modalOptionGroups);
                  setIsSupplementsModalOpen(false);
                }}
                className="w-[120px] px-4.5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-[#d43d22] cursor-pointer"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
