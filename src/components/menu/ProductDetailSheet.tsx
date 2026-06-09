import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Check,
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
  Pizza,
} from 'lucide-react';
import AppImage from '@/components/ui/AppImage';

export interface OptionChoice {
  id: string;
  name: string;
  price: string | number;
}

export interface OptionGroup {
  id: string;
  name: string;
  minSelections: number;
  maxSelections: number | null;
  choices: OptionChoice[];
}

export interface MenuItemType {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  description: string;
  image: string;
  imageAlt: string;
  popular?: boolean;
  veg?: boolean;
  spicy?: boolean;
  allergens: string[];
  dishTags?: string[];
  ingredients?: string[];
  optionGroups?: OptionGroup[];
  customizationEnabled?: boolean;
  notesEnabled?: boolean;
}

export interface CartItem extends MenuItemType {
  qty: number;
  note?: string;
  cartId?: string;
  addedIngredients?: { name: string; price: number }[];
  removedIngredients?: string[];
  selectedOptions?: any[];
}

interface ProductDetailSheetProps {
  item: MenuItemType | null;
  cartItem?: CartItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    qty: number,
    addedIngredients: { name: string; price: number }[],
    removedIngredients: string[],
    note: string
  ) => void;
  disabled?: boolean;
}

const getCleanTagLabel = (tag: string) => {
  if (tag.includes(':')) {
    return tag.split(':').slice(1).join(':').trim();
  }
  // Strip emojis
  return tag.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
};

const getTagStyle = (tag: string) => {
  let iconName = '';
  if (tag.includes(':')) {
    iconName = tag.split(':')[0].trim().toLowerCase();
  } else {
    const t = tag.toLowerCase();
    if (t.includes('vegan') || t.includes('vegetar') || tag.includes('🌱') || tag.includes('🥗')) {
      iconName = 'leaf';
    } else if (
      t.includes('piccant') ||
      t.includes('diavola') ||
      t.includes('spicy') ||
      tag.includes('🌶️') ||
      tag.includes('🔥')
    ) {
      iconName = 'flame';
    } else if (t.includes('gluten') || t.includes('glutine') || tag.includes('🌾')) {
      iconName = 'wheat';
    } else if (
      t.includes('novit') ||
      t.includes('nuov') ||
      t.includes('new') ||
      tag.includes('🆕')
    ) {
      iconName = 'sparkles';
    } else if (
      t.includes('consigliat') ||
      t.includes('special') ||
      tag.includes('⭐') ||
      tag.includes('👑')
    ) {
      iconName = 'star';
    } else if (t.includes('lattosio') || tag.includes('🥛')) {
      iconName = 'milk';
    }
  }

  if (iconName === 'leaf') {
    return 'text-emerald-600 dark:text-emerald-400';
  }
  if (iconName === 'flame') {
    return 'text-rose-600 dark:text-rose-400';
  }
  if (iconName === 'wheat') {
    return 'text-amber-600 dark:text-amber-400';
  }
  if (iconName === 'sparkles') {
    return 'text-blue-600 dark:text-blue-400';
  }
  if (iconName === 'star') {
    return 'text-amber-600 dark:text-amber-400';
  }
  return 'text-slate-500 dark:text-slate-450';
};

const getTagIcon = (tag: string) => {
  let iconName: string | null = null;
  if (tag.includes(':')) {
    iconName = tag.split(':')[0].trim().toLowerCase();
  } else {
    const t = tag.toLowerCase();
    if (t.includes('vegan') || t.includes('vegetar') || tag.includes('🌱') || tag.includes('🥗')) {
      iconName = 'leaf';
    } else if (
      t.includes('piccant') ||
      t.includes('diavola') ||
      t.includes('spicy') ||
      tag.includes('🌶️') ||
      tag.includes('🔥')
    ) {
      iconName = 'flame';
    } else if (t.includes('gluten') || t.includes('glutine') || tag.includes('🌾')) {
      iconName = 'wheat';
    } else if (
      t.includes('novit') ||
      t.includes('nuov') ||
      t.includes('new') ||
      tag.includes('🆕')
    ) {
      iconName = 'sparkles';
    } else if (
      t.includes('consigliat') ||
      t.includes('special') ||
      tag.includes('⭐') ||
      tag.includes('👑')
    ) {
      iconName = 'star';
    } else if (t.includes('lattosio') || tag.includes('🥛')) {
      iconName = 'milk';
    }
  }

  switch (iconName) {
    case 'leaf':
      return <Leaf size={12} className="shrink-0" strokeWidth={2.5} />;
    case 'flame':
      return <Flame size={12} className="shrink-0" strokeWidth={2.5} />;
    case 'wheat':
      return <Wheat size={12} className="shrink-0" strokeWidth={2.5} />;
    case 'sparkles':
      return <Sparkles size={12} className="shrink-0" strokeWidth={2.5} />;
    case 'star':
      return <Star size={12} className="shrink-0" strokeWidth={2.5} />;
    case 'milk':
      return <Milk size={12} className="shrink-0" strokeWidth={2.5} />;
    case 'heart':
      return <Heart size={12} className="shrink-0" strokeWidth={2.5} />;
    case 'fish':
      return <Fish size={12} className="shrink-0" strokeWidth={2.5} />;
    case 'apple':
      return <Apple size={12} className="shrink-0" strokeWidth={2.5} />;
    case 'coffee':
      return <Coffee size={12} className="shrink-0" strokeWidth={2.5} />;
    case 'wine':
      return <Wine size={12} className="shrink-0" strokeWidth={2.5} />;
    case 'pizza':
      return <Pizza size={12} className="shrink-0" strokeWidth={2.5} />;
    default:
      return null;
  }
};

export default function ProductDetailSheet({
  item,
  cartItem,
  isOpen,
  onClose,
  onConfirm,
  disabled = false,
}: ProductDetailSheetProps) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState<{ name: string; price: number }[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setExpandedGroupId(null);
      if (cartItem) {
        setQty(cartItem.qty);
        setAdded(cartItem.addedIngredients || []);
        setRemoved(cartItem.removedIngredients || []);
        setNote(cartItem.note || '');
      } else {
        setQty(1);
        setAdded([]);
        setRemoved([]);
        setNote('');
      }
    }
  }, [isOpen, item, cartItem]);

  if (!isOpen || !item) return null;

  const toggleRemove = (rem: string) => {
    setRemoved((prev) => (prev.includes(rem) ? prev.filter((r) => r !== rem) : [...prev, rem]));
  };

  const toggleGroupOption = (group: OptionGroup, choice: OptionChoice) => {
    const priceVal =
      typeof choice.price === 'string' ? parseFloat(choice.price) || 0 : choice.price;
    const isSingle = group.maxSelections === 1;

    if (isSingle) {
      const otherChoiceNames = group.choices.map((c) => c.name);
      setAdded((prev) => {
        const filtered = prev.filter((e) => !otherChoiceNames.includes(e.name));
        const alreadySelected = prev.some((e) => e.name === choice.name);
        if (alreadySelected) {
          // If required selection (minSelections > 0), do not allow deselecting
          if (group.minSelections > 0) {
            return prev;
          }
          return filtered;
        } else {
          return [...filtered, { name: choice.name, price: priceVal }];
        }
      });
    } else {
      setAdded((prev) => {
        const isChecked = prev.some((e) => e.name === choice.name);
        if (isChecked) {
          return prev.filter((e) => e.name !== choice.name);
        } else {
          // If maxSelections is set, make sure we do not exceed it
          const otherChoiceNames = group.choices.map((c) => c.name);
          const currentGroupSelectionsCount = prev.filter((e) =>
            otherChoiceNames.includes(e.name)
          ).length;
          if (group.maxSelections !== null && currentGroupSelectionsCount >= group.maxSelections) {
            return prev; // Block selection
          }
          return [...prev, { name: choice.name, price: priceVal }];
        }
      });
    }
  };

  const handleSelectGroupOption = (group: OptionGroup, choiceName: string) => {
    const otherChoiceNames = group.choices.map((c) => c.name);
    const choice = group.choices.find((c) => c.name === choiceName);

    setAdded((prev) => {
      const filtered = prev.filter((e) => !otherChoiceNames.includes(e.name));
      if (!choice) return filtered;
      const priceVal =
        typeof choice.price === 'string' ? parseFloat(choice.price) || 0 : choice.price;
      return [...filtered, { name: choice.name, price: priceVal }];
    });
  };

  const unitPrice = item.price + added.reduce((sum, e) => sum + e.price, 0);
  const totalPrice = unitPrice * qty;

  const handleConfirm = () => {
    onConfirm(qty, added, removed, note);
  };

  // Validation
  const getValidationError = () => {
    if (item.customizationEnabled === false) return null;
    if (!item.optionGroups) return null;
    for (const group of item.optionGroups) {
      const min = group.minSelections ?? 0;
      if (min > 0) {
        const groupChoiceNames = group.choices.map((c) => c.name);
        const selectedCount = added.filter((e) => groupChoiceNames.includes(e.name)).length;
        if (selectedCount < min) {
          return `Seleziona ${group.name} per continuare`;
        }
      }
    }
    return null;
  };

  const validationError = getValidationError();
  const isConfirmDisabled = disabled || !!validationError;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-h-[92vh] sm:max-h-none sm:h-full sm:w-[460px] bg-card rounded-t-3xl sm:rounded-t-none sm:rounded-l-3xl border-t sm:border-t-0 sm:border-l border-border shadow-2xl flex flex-col z-10 animate-slide-in overflow-hidden">
        {/* Mobile Swipe indicator */}
        <div className="w-12 h-1 bg-muted rounded-full mx-auto my-3 flex-shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 pt-2 sm:pt-6 border-b border-border/40 flex-shrink-0">
          <div>
            <h3 className="font-extrabold text-foreground text-base sm:text-lg leading-tight truncate">
              {cartItem ? 'Modifica piatto' : 'Personalizza piatto'}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
              Seleziona le opzioni desiderate
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-muted/65 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150 active:scale-90"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          data-lenis-prevent
          className="flex-1 overflow-y-auto px-5 py-4 space-y-6 scrollbar-hide"
        >
          {/* Cover image */}
          <div className="relative h-48 w-full rounded-2xl overflow-hidden shadow-xs">
            <AppImage src={item.image} alt={item.imageAlt} fill className="object-cover" />
          </div>

          {/* Details */}
          <div className="space-y-2">
            <h4 className="text-xl font-extrabold text-foreground">{item.name}</h4>
            {item.ingredients && item.ingredients.length > 0 && (
              <p className="text-xs text-muted-foreground/90 font-medium leading-relaxed">
                <span className="font-bold text-foreground/80">Ingredienti:</span>{' '}
                {item.ingredients.join(', ')}
              </p>
            )}
            {item.dishTags && item.dishTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-1 mt-0.5 animate-in fade-in duration-200">
                {item.dishTags.map((tag) => {
                  const icon = getTagIcon(tag);
                  const label = getCleanTagLabel(tag);
                  return (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-1 text-[10px] font-bold ${getTagStyle(tag)}`}
                    >
                      {icon}
                      <span>{label}</span>
                    </span>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>

            {/* Allergens */}
            {item.allergens && item.allergens.length > 0 && (
              <div className="pt-1 flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mr-1">
                  Allergeni:
                </span>
                {item.allergens.map((a) => (
                  <span
                    key={a}
                    className="text-[9px] bg-amber-500/10 text-amber-700 border border-amber-500/20 rounded-full px-2 py-0.5 font-semibold"
                  >
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Removes / Exclusions (Ingredients driven) */}
          {item.customizationEnabled !== false &&
            item.ingredients &&
            item.ingredients.length > 0 && (
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Rimuovi Ingredienti (Opzionale)
                </h5>
                <div className="divide-y divide-border/40 border border-border/40 rounded-2xl bg-card overflow-hidden">
                  {item.ingredients.map((rem) => {
                    const isRemoved = removed.includes(rem);
                    return (
                      <div
                        key={`remove-${rem}`}
                        onClick={() => toggleRemove(rem)}
                        className="flex items-center justify-between p-3.5 hover:bg-muted/20 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
                              isRemoved
                                ? 'bg-red-500 border-red-500 text-white'
                                : 'border-border-strong bg-muted/30'
                            }`}
                          >
                            {isRemoved && <Check size={10} className="stroke-[4]" />}
                          </div>
                          <span
                            className={`text-xs font-medium ${isRemoved ? 'text-red-500 line-through font-semibold' : 'text-foreground'}`}
                          >
                            Senza {rem}
                          </span>
                        </div>
                        {isRemoved && (
                          <span className="text-[10px] font-bold text-red-500 uppercase">
                            Rimosso
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Dynamic Option Groups */}
          {item.customizationEnabled !== false &&
            item.optionGroups &&
            item.optionGroups.length > 0 &&
            (() => {
              const mandatoryGroups = item.optionGroups.filter((g) => (g.minSelections ?? 0) > 0);
              const optionalGroups = item.optionGroups
                .filter((g) => (g.minSelections ?? 0) === 0)
                .sort((a, b) => {
                  const isASingle =
                    a.id === 'supplementi-singoli' ||
                    a.name === 'Supplementi' ||
                    a.name === 'Supplementi Singoli';
                  const isBSingle =
                    b.id === 'supplementi-singoli' ||
                    b.name === 'Supplementi' ||
                    b.name === 'Supplementi Singoli';
                  if (isASingle && !isBSingle) return 1;
                  if (!isASingle && isBSingle) return -1;
                  return 0;
                });

              return (
                <div className="space-y-6">
                  {/* Mandatory Groups (Dropdown select list) */}
                  {mandatoryGroups.length > 0 && (
                    <div className="space-y-4">
                      {mandatoryGroups.map((group) => {
                        const isSingle = group.maxSelections === 1;
                        const min = group.minSelections ?? 0;
                        const max = group.maxSelections;

                        // Helper to count how many are selected in this group
                        const groupChoiceNames = group.choices.map((c) => c.name);
                        const selectedInGroup = added.filter((e) =>
                          groupChoiceNames.includes(e.name)
                        );
                        const selectedCount = selectedInGroup.length;
                        const isSatisfied =
                          selectedCount >= min && (max === null || selectedCount <= max);

                        return (
                          <div key={group.id} className="space-y-2.5">
                            <h5 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                {group.name}
                                <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.2 font-black animate-pulse">
                                  Obbligatorio
                                </span>
                              </span>
                              <span
                                className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${isSatisfied ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border/40'}`}
                              >
                                {isSingle
                                  ? `Scegli 1`
                                  : max
                                    ? `Scegli da ${min} a ${max} (${selectedCount}/${max})`
                                    : `Scegli almeno ${min} (Selezionati: ${selectedCount})`}
                              </span>
                            </h5>

                            {isSingle ? (
                              <div className="relative">
                                <select
                                  value={selectedInGroup[0]?.name || ''}
                                  onChange={(e) => handleSelectGroupOption(group, e.target.value)}
                                  className="w-full px-4 py-3.5 text-xs bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer font-semibold text-foreground appearance-none pr-10"
                                >
                                  <option value="">Seleziona un&apos;opzione...</option>
                                  {group.choices.map((choice) => {
                                    const priceVal =
                                      typeof choice.price === 'string'
                                        ? parseFloat(choice.price) || 0
                                        : choice.price;
                                    return (
                                      <option key={choice.id} value={choice.name}>
                                        {choice.name}{' '}
                                        {priceVal > 0 ? `(+€${priceVal.toFixed(2)})` : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                  <ChevronDown size={16} />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="relative">
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      const choice = group.choices.find(
                                        (c) => c.name === e.target.value
                                      );
                                      if (choice) toggleGroupOption(group, choice);
                                    }}
                                    className="w-full px-4 py-3.5 text-xs bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer font-semibold text-foreground appearance-none pr-10"
                                  >
                                    <option value="">Aggiungi un&apos;opzione...</option>
                                    {group.choices
                                      .filter(
                                        (choice) => !added.some((e) => e.name === choice.name)
                                      )
                                      .map((choice) => {
                                        const priceVal =
                                          typeof choice.price === 'string'
                                            ? parseFloat(choice.price) || 0
                                            : choice.price;
                                        return (
                                          <option key={choice.id} value={choice.name}>
                                            {choice.name}{' '}
                                            {priceVal > 0 ? `(+€${priceVal.toFixed(2)})` : ''}
                                          </option>
                                        );
                                      })}
                                  </select>
                                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                    <ChevronDown size={16} />
                                  </div>
                                </div>
                                {selectedInGroup.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {selectedInGroup.map((choice) => {
                                      const matchChoice = group.choices.find(
                                        (c) => c.name === choice.name
                                      );
                                      return (
                                        <span
                                          key={choice.name}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 border border-primary/20 text-primary"
                                        >
                                          {choice.name}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (matchChoice)
                                                toggleGroupOption(group, matchChoice);
                                            }}
                                            className="text-primary hover:text-foreground transition-colors"
                                          >
                                            <X size={12} />
                                          </button>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Optional Groups (Accordion) */}
                  {optionalGroups.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Altre Aggiunte & Personalizzazioni
                      </h5>
                      <div className="space-y-2">
                        {optionalGroups.map((group) => {
                          const isExpanded = expandedGroupId === group.id;
                          const isSingle = group.maxSelections === 1;
                          const max = group.maxSelections;

                          const groupChoiceNames = group.choices.map((c) => c.name);
                          const selectedInGroup = added.filter((e) =>
                            groupChoiceNames.includes(e.name)
                          );
                          const selectedCount = selectedInGroup.length;

                          return (
                            <div
                              key={group.id}
                              className="border border-border/60 rounded-2xl overflow-hidden bg-card transition-all duration-200"
                            >
                              <button
                                type="button"
                                onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-muted/10 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                                    {group.id === 'supplementi-singoli' ||
                                    group.name === 'Supplementi' ||
                                    group.name === 'Supplementi Singoli'
                                      ? 'Altro'
                                      : group.name}
                                  </span>
                                  {selectedCount > 0 && (
                                    <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full border border-primary/20">
                                      {selectedCount}{' '}
                                      {selectedCount === 1 ? 'selezionato' : 'selezionati'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <span className="text-[10px] font-medium">
                                    {isSingle ? '' : max ? `Max ${max}` : ''}
                                  </span>
                                  <ChevronDown
                                    size={16}
                                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-primary' : ''}`}
                                  />
                                </div>
                              </button>

                              {isExpanded && (
                                <div className="px-4 pb-4 pt-1 border-t border-border/40 bg-muted/5 animate-in slide-in-from-top-1 duration-150">
                                  {isSingle ? (
                                    <div className="relative mt-2">
                                      <select
                                        value={selectedInGroup[0]?.name || ''}
                                        onChange={(e) =>
                                          handleSelectGroupOption(group, e.target.value)
                                        }
                                        className="w-full px-4 py-3.5 text-xs bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer font-semibold text-foreground appearance-none pr-10"
                                      >
                                        <option value="">Nessuna selezione</option>
                                        {group.choices.map((choice) => {
                                          const priceVal =
                                            typeof choice.price === 'string'
                                              ? parseFloat(choice.price) || 0
                                              : choice.price;
                                          return (
                                            <option key={choice.id} value={choice.name}>
                                              {choice.name}{' '}
                                              {priceVal > 0 ? `(+€${priceVal.toFixed(2)})` : ''}
                                            </option>
                                          );
                                        })}
                                      </select>
                                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                        <ChevronDown size={16} />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="divide-y divide-border/25 mt-1">
                                      {group.choices.map((choice) => {
                                        const priceVal =
                                          typeof choice.price === 'string'
                                            ? parseFloat(choice.price) || 0
                                            : choice.price;
                                        const isChecked = added.some((e) => e.name === choice.name);
                                        return (
                                          <div
                                            key={choice.id}
                                            onClick={() => toggleGroupOption(group, choice)}
                                            className="flex items-center justify-between py-3 px-1 hover:bg-muted/10 transition-colors cursor-pointer"
                                          >
                                            <div className="flex items-center gap-3">
                                              <div
                                                className={`w-4.5 h-4.5 border flex items-center justify-center transition-all rounded-md flex-shrink-0 ${
                                                  isChecked
                                                    ? 'bg-primary border-primary text-white shadow-xs'
                                                    : 'border-border-strong bg-muted/20'
                                                }`}
                                              >
                                                {isChecked && (
                                                  <Check size={11} className="stroke-[3.5]" />
                                                )}
                                              </div>
                                              <span className="text-xs font-medium text-foreground">
                                                {choice.name}
                                              </span>
                                            </div>
                                            {priceVal > 0 && (
                                              <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                                                + € {priceVal.toFixed(2)}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          {/* Notes Input */}
          {item.notesEnabled !== false && (
            <div className="space-y-2.5">
              <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Note per la cucina
              </h5>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Es. Ben cotto, salsa a parte, allergia alle arachidi..."
                className="w-full px-3.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring h-20 resize-none leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 pt-4 pb-6 sm:pb-4 border-t border-border bg-card flex flex-col gap-2.5 flex-shrink-0">
          {validationError && (
            <p className="text-[11px] font-semibold text-primary animate-pulse text-center">
              {validationError}
            </p>
          )}
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-muted rounded-xl p-1 shadow-sm border border-border">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg bg-card hover:bg-border flex items-center justify-center transition-colors shadow-sm active:scale-90"
              >
                <Minus size={14} className="text-foreground" strokeWidth={2.5} />
              </button>
              <span className="w-6 text-center text-xs font-black tabular-nums text-foreground">
                {qty}
              </span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="w-8 h-8 rounded-lg bg-primary text-white hover:bg-primary-hover flex items-center justify-center transition-colors shadow-sm active:scale-90"
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>

            <button
              id="add-to-cart-confirm-btn"
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-xl transition-all duration-150 active:scale-[0.98] shadow-md shadow-primary/10 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>
                {disabled
                  ? 'Locale Chiuso'
                  : validationError
                    ? validationError
                    : cartItem
                      ? 'Aggiorna Piatto'
                      : 'Aggiungi al carrello'}
              </span>
              {!validationError && <span className="w-1.5 h-1.5 rounded-full bg-white/40" />}
              {!validationError && <span className="tabular-nums">€ {totalPrice.toFixed(2)}</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
