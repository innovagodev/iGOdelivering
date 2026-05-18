'use client';
import React, { useState, useRef } from 'react';
import {
  ChevronDown,
  Check,
  X,
  Plus,
  Euro,
  Upload,
  Eye,
  EyeOff,
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
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newChoiceName, setNewChoiceName] = useState<Record<string, string>>({});
  const [newChoicePrice, setNewChoicePrice] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const addOptionGroup = () => {
    if (!newGroupName.trim()) return;
    setDraft((p) => ({
      ...p,
      optionGroups: [
        ...p.optionGroups,
        { id: `og-${Date.now()}`, name: newGroupName.trim(), choices: [] },
      ],
    }));
    setNewGroupName('');
  };

  const removeOptionGroup = (gid: string) => {
    setDraft((p) => ({ ...p, optionGroups: p.optionGroups.filter((g) => g.id !== gid) }));
  };

  const addChoice = (gid: string) => {
    const name = newChoiceName[gid]?.trim();
    if (!name) return;
    setDraft((p) => ({
      ...p,
      optionGroups: p.optionGroups.map((g) =>
        g.id === gid
          ? {
              ...g,
              choices: [
                ...g.choices,
                { id: `ch-${Date.now()}`, name, price: newChoicePrice[gid] || '0' },
              ],
            }
          : g
      ),
    }));
    setNewChoiceName((p) => ({ ...p, [gid]: '' }));
    setNewChoicePrice((p) => ({ ...p, [gid]: '' }));
  };

  const removeChoice = (gid: string, cid: string) => {
    setDraft((p) => ({
      ...p,
      optionGroups: p.optionGroups.map((g) =>
        g.id === gid ? { ...g, choices: g.choices.filter((c) => c.id !== cid) } : g
      ),
    }));
  };

  const handleAddCategory = () => {
    const cat = newCategoryInput.trim();
    if (!cat) return;
    onAddCategory(cat);
    setDraft((p) => ({ ...p, category: cat }));
    setNewCategoryInput('');
    setShowNewCategory(false);
  };

  return (
    <div className="bg-card border-2 border-primary/30 rounded-xl p-5 space-y-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nome *</label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
            placeholder="es. Pizza Margherita"
            className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Categoria
          </label>
          {showNewCategory ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                placeholder="Nuova categoria"
                className="flex-1 px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleAddCategory}
                className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-[#d43d22]"
              >
                <Check size={13} />
              </button>
              <button
                onClick={() => setShowNewCategory(false)}
                className="px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-muted"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={draft.category}
                  onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
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
                onClick={() => setShowNewCategory(true)}
                className="px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted border border-border"
                title="Aggiungi categoria"
              >
                <Plus size={13} />
              </button>
            </div>
          )}
        </div>
        {/* Price */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Prezzo (€) *
          </label>
          <div className="relative">
            <Euro
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="number"
              value={draft.price}
              onChange={(e) => setDraft((p) => ({ ...p, price: e.target.value }))}
              placeholder="9.50"
              min={0}
              step={0.5}
              className="w-full pl-7 pr-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        {/* Image */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Immagine</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Upload
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="url"
                value={draft.imageUrl}
                onChange={(e) => setDraft((p) => ({ ...p, imageUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full pl-7 pr-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted border border-border whitespace-nowrap"
            >
              File
            </button>
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
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Descrizione
          </label>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
        {/* Allergens */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-2">Allergeni</label>
          <div className="flex flex-wrap gap-2">
            {allergensList.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleAllergen(a)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  draft.allergens.includes(a)
                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                    : 'bg-muted text-muted-foreground border border-border hover:border-amber-300'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        {/* Visibility */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-2">Visibilità</label>
          <div className="flex gap-2 flex-wrap">
            {(
              [
                { value: 'always', label: 'Sempre visibile', icon: <Eye size={13} /> },
                { value: 'hidden', label: 'Nascosto', icon: <EyeOff size={13} /> },
                { value: 'scheduled', label: 'Orario programmato', icon: <Clock size={13} /> },
              ] as { value: VisibilityType; label: string; icon: React.ReactNode }[]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDraft((p) => ({ ...p, visibility: opt.value }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  draft.visibility === opt.value
                    ? 'bg-primary text-white border-primary'
                    : 'bg-muted text-muted-foreground border-border hover:border-primary'
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
          {draft.visibility === 'scheduled' && (
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-muted-foreground">Da</span>
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
                className="px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring min-w-0 appearance-none w-[110px]"
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
                className="px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring min-w-0 appearance-none w-[110px]"
              />
            </div>
          )}
        </div>
        {/* Option Groups */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-2">
            Opzioni e componenti aggiuntivi
          </label>
          <div className="space-y-3">
            {draft.optionGroups.map((group) => (
              <div
                key={group.id}
                className="border border-border rounded-xl p-3 space-y-2 bg-muted/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{group.name}</span>
                  <button
                    onClick={() => removeOptionGroup(group.id)}
                    className="p-1 rounded hover:bg-[var(--danger-bg)] text-muted-foreground hover:text-[var(--danger)]"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="space-y-1">
                  {group.choices.map((choice) => (
                    <div key={choice.id} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 text-foreground">{choice.name}</span>
                      <span className="text-muted-foreground">
                        +€{parseFloat(choice.price || '0').toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeChoice(group.id, choice.id)}
                        className="p-0.5 rounded hover:text-[var(--danger)]"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newChoiceName[group.id] || ''}
                    onChange={(e) =>
                      setNewChoiceName((p) => ({ ...p, [group.id]: e.target.value }))
                    }
                    placeholder="Nome scelta"
                    className="flex-1 px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <div className="relative w-20">
                    <Euro
                      size={10}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type="number"
                      value={newChoicePrice[group.id] || ''}
                      onChange={(e) =>
                        setNewChoicePrice((p) => ({ ...p, [group.id]: e.target.value }))
                      }
                      placeholder="0.00"
                      min={0}
                      step={0.5}
                      className="w-full pl-5 pr-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <button
                    onClick={() => addChoice(group.id)}
                    className="px-2 py-1.5 bg-primary text-white rounded-lg text-xs hover:bg-[#d43d22]"
                  >
                    <Plus size={11} />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Nome gruppo (es. Dimensione, Salsa...)"
                className="flex-1 px-3 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={addOptionGroup}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted border border-dashed border-border hover:border-primary hover:text-primary transition-colors"
              >
                <Plus size={12} />
                Gruppo
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => {
            if (!draft.name || !draft.price) return;
            onSave(draft);
          }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#d43d22] transition-all"
        >
          <Check size={14} />
          {saveLabel}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Annulla
        </button>
      </div>
    </div>
  );
}
