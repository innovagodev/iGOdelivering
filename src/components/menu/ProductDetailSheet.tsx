import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Check, Star } from 'lucide-react';
import AppImage from '@/components/ui/AppImage';
import Badge from '@/components/ui/Badge';
export interface OptionChoice {
  id: string;
  name: string;
  price: string | number;
}

export interface OptionGroup {
  id: string;
  name: string;
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
  optionGroups?: OptionGroup[];
}

export interface CartItem extends MenuItemType {
  qty: number;
  note?: string;
  cartId?: string;
  addedIngredients?: { name: string; price: number }[];
  removedIngredients?: string[];
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

const getCustomizationOptions = (category: string) => {
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
  const [cookingStyle, setCookingStyle] = useState<
    'classico' | 'ben-cotto' | 'calzone' | 'schiacciata'
  >('classico');

  useEffect(() => {
    if (isOpen && item) {
      if (cartItem) {
        setQty(cartItem.qty);
        // filter out cooking styles
        const baseAdded = (cartItem.addedIngredients || []).filter(
          (e) => !e.name.startsWith('Stile:') && !e.name.startsWith('Cottura:')
        );
        setAdded(baseAdded);
        setRemoved(cartItem.removedIngredients || []);
        setNote(cartItem.note || '');

        const styleItem = (cartItem.addedIngredients || []).find(
          (e) => e.name.startsWith('Stile:') || e.name.startsWith('Cottura:')
        );
        if (styleItem) {
          if (styleItem.name.includes('Schiacciata')) setCookingStyle('schiacciata');
          else if (styleItem.name.includes('Calzone')) setCookingStyle('calzone');
          else if (styleItem.name.includes('Ben Cotto')) setCookingStyle('ben-cotto');
        } else {
          setCookingStyle('classico');
        }
      } else {
        setQty(1);
        setAdded([]);
        setRemoved([]);
        setNote('');
        setCookingStyle('classico');
      }
    }
  }, [isOpen, item, cartItem]);

  if (!isOpen || !item) return null;

  const hasCustomOptions = !!(item.optionGroups && item.optionGroups.length > 0);
  const { extras, removes } = hasCustomOptions ? { extras: [], removes: [] } : getCustomizationOptions(item.category);

  const toggleExtra = (ext: { name: string; price: number }) => {
    setAdded((prev) =>
      prev.some((e) => e.name === ext.name)
        ? prev.filter((e) => e.name !== ext.name)
        : [...prev, ext]
    );
  };

  const toggleRemove = (rem: string) => {
    setRemoved((prev) => (prev.includes(rem) ? prev.filter((r) => r !== rem) : [...prev, rem]));
  };

  const isGroupSingleSelect = (groupName: string) => {
    const normalized = groupName.toLowerCase();
    return (
      normalized.includes('scegli') ||
      normalized.includes('tipo') ||
      normalized.includes('formato') ||
      normalized.includes('impasto') ||
      normalized.includes('cottura') ||
      normalized.includes('gusto') ||
      normalized.includes('base') ||
      normalized.includes('stile') ||
      normalized.includes('dimensione') ||
      normalized.includes('taglia')
    );
  };

  const toggleGroupOption = (group: OptionGroup, choice: OptionChoice) => {
    const priceVal = typeof choice.price === 'string' ? parseFloat(choice.price) || 0 : choice.price;
    const isSingle = isGroupSingleSelect(group.name);
    
    if (isSingle) {
      const otherChoiceNames = group.choices.map((c) => c.name);
      setAdded((prev) => {
        const filtered = prev.filter((e) => !otherChoiceNames.includes(e.name));
        const alreadySelected = prev.some((e) => e.name === choice.name);
        if (alreadySelected) {
          return filtered;
        } else {
          return [...filtered, { name: choice.name, price: priceVal }];
        }
      });
    } else {
      toggleExtra({ name: choice.name, price: priceVal });
    }
  };

  const handleQuickTag = (tag: string) => {
    setNote((prev) => {
      if (prev.includes(tag)) return prev;
      return prev ? `${prev}, ${tag}` : tag;
    });
  };

  const stylePrice = cookingStyle === 'schiacciata' ? 1.5 : 0.0;
  const unitPrice = item.price + added.reduce((sum, e) => sum + e.price, 0) + stylePrice;
  const totalPrice = unitPrice * qty;

  const handleConfirm = () => {
    const finalAdded = [...added];
    if (cookingStyle === 'schiacciata') {
      finalAdded.push({ name: 'Stile: A Schiacciata', price: 1.5 });
    } else if (cookingStyle === 'calzone') {
      finalAdded.push({ name: 'Stile: A Calzone', price: 0.0 });
    } else if (cookingStyle === 'ben-cotto') {
      finalAdded.push({ name: 'Cottura: Ben Cotto', price: 0.0 });
    }
    onConfirm(qty, finalAdded, removed, note);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end">
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
        <div data-lenis-prevent className="flex-1 overflow-y-auto px-5 py-4 space-y-6 scrollbar-hide">
          {/* Cover image */}
          <div className="relative h-48 w-full rounded-2xl overflow-hidden shadow-xs">
            <AppImage src={item.image} alt={item.imageAlt} fill className="object-cover" />

          </div>

          {/* Details */}
          <div className="space-y-2">
            <h4 className="text-xl font-extrabold text-foreground">{item.name}</h4>
            {item.dishTags && item.dishTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1 mt-0.5 animate-in fade-in duration-200">
                {item.dishTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center text-[10px] font-extrabold bg-primary/5 text-primary border border-primary/10 rounded px-2 py-0.5 shadow-sm"
                  >
                    {tag}
                  </span>
                ))}
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

          {/* Pizza Specific Styles */}
          {item.category.toLowerCase() === 'pizza' && (
            <div className="space-y-3 bg-muted/20 border border-border/30 rounded-2xl p-4">
              <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Stile & Cottura
              </h5>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'classico', label: 'Classica', price: 0.0 },
                  { id: 'ben-cotto', label: 'Ben Cotta', price: 0.0 },
                  { id: 'calzone', label: 'A Calzone', price: 0.0 },
                  { id: 'schiacciata', label: 'Schiacciata (+€1.50)', price: 1.5 },
                ].map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setCookingStyle(style.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                      cookingStyle === style.id
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border/60 bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{style.label}</span>
                    {cookingStyle === style.id && <Check size={12} className="stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Extras / Additionals */}
          {extras.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Aggiungi Ingredienti (Opzionale)
              </h5>
              <div className="divide-y divide-border/40 border border-border/40 rounded-2xl bg-card overflow-hidden">
                {extras.map((ext) => {
                  const isChecked = added.some((e) => e.name === ext.name);
                  return (
                    <div
                      key={`extra-${ext.name}`}
                      onClick={() => toggleExtra(ext)}
                      className="flex items-center justify-between p-3.5 hover:bg-muted/20 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                            isChecked
                              ? 'bg-primary border-primary text-white'
                              : 'border-border-strong bg-muted/30'
                          }`}
                        >
                          {isChecked && <Check size={10} className="stroke-[4]" />}
                        </div>
                        <span className="text-xs font-medium text-foreground">{ext.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                        + € {ext.price.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Removes / Exclusions */}
          {removes.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Rimuovi Ingredienti (Opzionale)
              </h5>
              <div className="divide-y divide-border/40 border border-border/40 rounded-2xl bg-card overflow-hidden">
                {removes.map((rem) => {
                  const isRemoved = removed.includes(rem);
                  return (
                    <div
                      key={`remove-${rem}`}
                      onClick={() => toggleRemove(rem)}
                      className="flex items-center justify-between p-3.5 hover:bg-muted/20 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                            isRemoved
                              ? 'bg-red-500 border-red-500 text-white'
                              : 'border-border-strong bg-muted/30'
                          }`}
                        >
                          {isRemoved && <Check size={10} className="stroke-[4]" />}
                        </div>
                        <span
                          className={`text-xs font-medium ${isRemoved ? 'text-red-500 line-through' : 'text-foreground'}`}
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
          {item.optionGroups && item.optionGroups.length > 0 && (
            <div className="space-y-4">
              {item.optionGroups.map((group) => {
                const isSingle = isGroupSingleSelect(group.name);
                return (
                  <div key={group.id} className="space-y-2.5">
                    <h5 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                      <span>{group.name}</span>
                      <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/40">
                        {isSingle ? 'Scelta Singola' : 'Scelte Multiple'}
                      </span>
                    </h5>
                    <div className="divide-y divide-border/40 border border-border/40 rounded-2xl bg-card overflow-hidden">
                      {group.choices.map((choice) => {
                        const priceVal = typeof choice.price === 'string' ? parseFloat(choice.price) || 0 : choice.price;
                        const isChecked = added.some((e) => e.name === choice.name);
                        return (
                          <div
                            key={choice.id}
                            onClick={() => toggleGroupOption(group, choice)}
                            className="flex items-center justify-between p-3.5 hover:bg-muted/20 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-4.5 h-4.5 border flex items-center justify-center transition-all ${
                                  isSingle ? 'rounded-full' : 'rounded-md'
                                } ${
                                  isChecked
                                    ? 'bg-primary border-primary text-white shadow-xs'
                                    : 'border-border-strong bg-muted/20'
                                }`}
                              >
                                {isChecked && <Check size={11} className="stroke-[3.5]" />}
                              </div>
                              <span className="text-xs font-medium text-foreground">{choice.name}</span>
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
                  </div>
                );
              })}
            </div>
          )}

          {/* Notes Input */}
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
            {/* Quick tags */}
            <div className="flex flex-wrap gap-1.5">
              {['Molto piccante', 'Senza sale', 'Ben cotto', 'Salsa a parte'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleQuickTag(tag)}
                  className="text-[9px] bg-muted hover:bg-border text-muted-foreground hover:text-foreground font-semibold px-2 py-1 rounded-lg transition-colors border border-border/40"
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-border bg-card flex items-center gap-4 flex-shrink-0">
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
              className="w-8 h-8 rounded-lg bg-primary text-white hover:bg-[#d43d22] flex items-center justify-center transition-colors shadow-sm active:scale-90"
            >
              <Plus size={14} strokeWidth={2.5} />
            </button>
          </div>

          <button
            id="add-to-cart-confirm-btn"
            onClick={handleConfirm}
            disabled={disabled}
            className="flex-1 py-3 bg-primary hover:bg-[#d43d22] text-white text-xs font-extrabold rounded-xl transition-all duration-150 active:scale-[0.98] shadow-md shadow-primary/10 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{disabled ? 'Locale Chiuso' : cartItem ? 'Aggiorna Piatto' : 'Aggiungi al carrello'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
            <span className="tabular-nums">€ {totalPrice.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
