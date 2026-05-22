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

type VisibilityType = 'always' | 'hidden' | 'scheduled';

interface OptionChoice {
  id: string;
  name: string;
  price: string;
}

interface OptionGroup {
  id: string;
  name: string;
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
  const [draft, setDraft] = useState<MenuItemDraft>({
    ...item,
    optionGroups: item.optionGroups ? [...item.optionGroups] : [],
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft({
      ...item,
      optionGroups: item.optionGroups ? [...item.optionGroups] : [],
    });
    setIsPromo(!!item.originalPrice);
  }, [item]);

  useEffect(() => {
    if (isSupplementsModalOpen) {
      const groups = draft.optionGroups ? JSON.parse(JSON.stringify(draft.optionGroups)) : [];
      setModalOptionGroups(groups);
      setSelectedGroupId(groups.length > 0 ? groups[0].id : null);
    }
  }, [isSupplementsModalOpen, draft.optionGroups]);

  const toggleAllergen = (a: string) => {
    setDraft((p) => ({
      ...p,
      allergens: p.allergens.includes(a) ? p.allergens.filter((x) => x !== a) : [...p.allergens, a],
    }));
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
      choices: [],
    };
    setModalOptionGroups((prev) => {
      const updated = [...prev, newGroup];
      setSelectedGroupId(newGroup.id);
      return updated;
    });
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

  const allAvailableAllergens = Array.from(
    new Set([...allergensList, ...draft.allergens])
  );

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
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
            placeholder="es. Pizza Margherita"
            className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
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
                className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
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

        {/* Price & Promotion */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Prezzo di Listino (€) *
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Euro
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="number"
                  value={draft.price}
                  onChange={(e) => setDraft((p) => ({ ...p, price: e.target.value }))}
                  placeholder="9.50"
                  min={0}
                  step={0.1}
                  className="w-full pl-8 pr-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none py-2 px-1">
                <input
                  type="checkbox"
                  checked={isPromo}
                  onChange={(e) => {
                    setIsPromo(e.target.checked);
                    if (!e.target.checked) {
                      setDraft((p) => ({ ...p, originalPrice: '' }));
                    }
                  }}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary/20 cursor-pointer"
                />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Promozione
                </span>
              </label>
            </div>
          </div>

          {isPromo && (
            <div className="animate-fadeIn">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Prezzo Scontato (€) *
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
                  min={0}
                  step={0.1}
                  className="w-full pl-8 pr-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>
          )}
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            Visibilità
          </label>
          <div className="relative">
            <select
              value={draft.visibility}
              onChange={(e) => setDraft((p) => ({ ...p, visibility: e.target.value as VisibilityType }))}
              className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
            >
              <option value="always">Sempre visibile</option>
              <option value="hidden">Nascosto</option>
              <option value="scheduled">Orario programmato</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
          </div>
        </div>

        {/* Scheduled visibility parameters */}
        {draft.visibility === 'scheduled' && (
          <div className="sm:col-span-2 bg-muted/20 border border-border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-primary flex-shrink-0" />
              <span className="text-xs text-muted-foreground font-semibold">Orario Programmato:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">da</span>
              <input
                type="time"
                value={draft.visibilitySchedule?.from || ''}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    visibilitySchedule: {
                      ...p.visibilitySchedule,
                      from: e.target.value,
                      to: p.visibilitySchedule?.to || '',
                    },
                  }))
                }
                className="w-[180px] max-w-full px-2.5 py-1.5 text-base bg-input border border-border rounded-lg focus:outline-none"
              />
              <span className="text-xs text-muted-foreground">a</span>
              <input
                type="time"
                value={draft.visibilitySchedule?.to || ''}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    visibilitySchedule: {
                      from: p.visibilitySchedule?.from || '',
                      to: e.target.value,
                    },
                  }))
                }
                className="w-[180px] max-w-full px-2.5 py-1.5 text-base bg-input border border-border rounded-lg focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Image Drag-and-Drop Dropzone */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Immagine del Piatto
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
            className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer select-none min-h-[140px] relative overflow-hidden ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 bg-muted/10 hover:bg-muted/20'
            }`}
          >
            {draft.imageUrl ? (
              <>
                <img
                  src={draft.imageUrl}
                  alt="Anteprima piatto"
                  className="absolute inset-0 w-full h-full object-cover opacity-20"
                />
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-card/90 border border-border flex items-center justify-center text-primary shadow-sm">
                    <Upload size={20} />
                  </div>
                  <p className="text-xs font-bold text-foreground text-center bg-card/85 px-3 py-1.5 rounded-lg border border-border/60 shadow-sm">
                    Trascina o clicca per cambiare immagine
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDraft((p) => ({ ...p, imageUrl: '' }));
                    }}
                    className="mt-1 px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer transition-all"
                  >
                    Rimuovi immagine
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground mb-2 shadow-sm">
                  <Upload size={20} />
                </div>
                <p className="text-xs sm:text-sm font-bold text-foreground">Trascina qui l&apos;immagine del piatto</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Oppure clicca per sfogliare i file (PNG, JPG, WEBP)</p>
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

        {/* Description */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            Descrizione Piatto
          </label>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            placeholder="Descrivi gli ingredienti del piatto..."
            className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
          />
        </div>

        {/* Allergen Input (Pills + Inline custom allergen input) */}
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
                onClick={() => setDraft((p) => ({ ...p, allergens: [...allergensList] }))}
                className="text-[10px] font-bold text-primary hover:underline uppercase cursor-pointer"
              >
                Seleziona Tutti
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 p-3 bg-muted/20 border border-border rounded-xl">
            {allAvailableAllergens.map((a) => {
              const isActive = draft.allergens.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAllergen(a)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer active:scale-95 ${
                    isActive
                      ? 'bg-amber-100 border-amber-300 text-amber-800 shadow-sm shadow-amber-300/10'
                      : 'bg-card border-border text-muted-foreground hover:border-amber-300 hover:text-foreground'
                  }`}
                >
                  {isActive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600 mr-1.5 animate-pulse" />}
                  {a}
                </button>
              );
            })}
          </div>

          {/* Inline input to add a custom allergen */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={customAllergen}
              onChange={(e) => setCustomAllergen(e.target.value)}
              placeholder="Aggiungi allergeni personalizzati (es. Anacardi)"
              className="flex-1 px-3.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const val = customAllergen.trim();
                  if (val) {
                    if (!draft.allergens.includes(val)) {
                      setDraft((p) => ({ ...p, allergens: [...p.allergens, val] }));
                    }
                    setCustomAllergen('');
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                const val = customAllergen.trim();
                if (val) {
                  if (!draft.allergens.includes(val)) {
                    setDraft((p) => ({ ...p, allergens: [...p.allergens, val] }));
                  }
                  setCustomAllergen('');
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
        <div className="sm:col-span-2">
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
                      <span className="text-[10px] font-medium text-muted-foreground bg-card px-1.5 py-0.5 rounded border border-border font-semibold">
                        {group.choices.length} {group.choices.length === 1 ? 'scelta' : 'scelte'}
                      </span>
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
            if (!draft.name || !draft.price) return;
            const finalDraft = {
              ...draft,
              originalPrice: isPromo ? (draft.originalPrice || '') : '',
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

                <div className="flex-1 flex flex-col min-h-[200px]">
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
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-primary/5 border-primary text-primary font-semibold shadow-sm'
                                : 'bg-card border-border hover:border-primary/30 text-foreground'
                            }`}
                          >
                            <span className="text-xs truncate font-medium">{g.name}</span>
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
                  setDraft((p) => ({ ...p, optionGroups: modalOptionGroups }));
                  setIsSupplementsModalOpen(false);
                }}
                className="px-4.5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-[#d43d22] cursor-pointer"
              >
                Salva e Applica
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
