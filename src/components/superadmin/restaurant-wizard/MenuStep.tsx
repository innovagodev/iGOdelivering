'use client';
import React from 'react';
import { Plus, Trash2, Edit2, Upload, X, Euro, Eye, EyeOff, ChevronDown } from 'lucide-react';
import Toggle from '@/components/ui/Toggle';

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
  addWizardOptionGroup: () => void;
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
                className="text-muted-foreground hover:text-[var(--danger)] transition-colors opacity-0 group-hover:opacity-100"
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
              className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none"
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
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none"
            />
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Opzioni
              </p>
              {newGroupChoices.map((choice) => (
                <div key={choice.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={choice.name}
                    onChange={(e) => updateChoice(choice.id, 'name', e.target.value)}
                    placeholder="Nome opzione"
                    className="flex-1 px-3 py-1.5 text-xs bg-input border border-border rounded-lg"
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
                      className="w-full pl-6 pr-2 py-1.5 text-xs bg-input border border-border rounded-lg"
                    />
                  </div>
                  <button
                    onClick={() => removeChoice(choice.id)}
                    className="p-1.5 text-muted-foreground hover:text-[var(--danger)]"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button
                onClick={addChoice}
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
              >
                <Plus size={12} />
                Aggiungi Opzione
              </button>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={addWizardOptionGroup}
                className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold"
              >
                Salva Gruppo
              </button>
              <button
                onClick={() => setShowAddGroup(false)}
                className="text-xs font-semibold text-muted-foreground"
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
            onClick={() => setShowAddItem(true)}
            className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-[#d43d22] transition-colors"
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
                  <button
                    onClick={() => removeMenuItem(item.id)}
                    className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-[var(--danger)] transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                <p className="text-sm font-bold text-foreground mt-1">
                  €{parseFloat(item.price || '0').toFixed(2)}
                </p>
                {item.visibility.mode !== 'always' && (
                  <span className="inline-flex items-center gap-1 text-[9px] bg-orange-100 text-primary px-1.5 py-0.5 rounded mt-1 font-bold">
                    VISIBILITÀ LIMITATA
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add Piatto Form */}
        {showAddItem && (
          <div className="bg-muted/40 border-2 border-dashed border-border rounded-2xl p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Nome Piatto *
                  </label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                    placeholder="es. Margherita"
                    className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Categoria *
                    </label>
                    <select
                      value={newItem.category}
                      onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none"
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
                    <div className="relative">
                      <Euro
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <input
                        type="number"
                        value={newItem.price}
                        onChange={(e) => setNewItem((p) => ({ ...p, price: e.target.value }))}
                        placeholder="7.50"
                        step="0.5"
                        className="w-full pl-8 pr-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Descrizione
                  </label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Pomodoro, mozzarella, basilico..."
                    rows={2}
                    className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
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

            {/* Opzioni & Allergeni Panels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Gruppi Opzioni Applicabili
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
                      onClick={() => toggleItemOptionGroup(g.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors ${newItem.optionGroups.includes(g.id) ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}
                    >
                      <span className="text-xs font-semibold">{g.name}</span>
                      {newItem.optionGroups.includes(g.id) && <X size={12} />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Allergeni
                </p>
                <div className="flex flex-wrap gap-2">
                  {allergensList.map((a) => (
                    <button
                      key={a}
                      onClick={() => toggleAllergen(a)}
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${newItem.allergens.includes(a) ? 'bg-[var(--danger-bg)] border-[var(--danger)] text-[var(--danger)]' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Visibility Panel */}
            <div className="pt-4 border-t border-border">
              <button
                onClick={() => setShowVisibilityPanel(!showVisibilityPanel)}
                className="flex items-center gap-2 text-xs font-bold text-foreground hover:text-primary transition-colors"
              >
                {showVisibilityPanel ? (
                  <ChevronDown size={14} className="rotate-180" />
                ) : (
                  <ChevronDown size={14} />
                )}
                VISIBILITÀ E DISPONIBILITÀ AVANZATA
              </button>
              {showVisibilityPanel && (
                <div className="mt-4 p-4 bg-card border border-border rounded-xl space-y-5 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                        Modalità
                      </p>
                      <div className="space-y-2">
                        {[
                          { id: 'always', label: 'Sempre visibile' },
                          { id: 'time_range', label: 'In determinate fasce orarie' },
                          { id: 'date_range', label: 'In un periodo specifico' },
                          { id: 'hidden', label: 'Nascosto (Bozza)' },
                        ].map((m) => (
                          <button
                            key={m.id}
                            onClick={() =>
                              setNewItem((p) => ({
                                ...p,
                                visibility: { ...p.visibility, mode: m.id as any },
                              }))
                            }
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${newItem.visibility.mode === m.id ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'}`}
                          >
                            {m.label}
                            {newItem.visibility.mode === m.id && <Eye size={12} />}
                          </button>
                        ))}
                      </div>
                    </div>
                    {newItem.visibility.mode === 'time_range' && (
                      <div className="space-y-4">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                          Seleziona Giorni e Orari
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {days.map((d) => (
                            <button
                              key={d}
                              onClick={() => toggleVisibilityDay(d)}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${newItem.visibility.days.includes(d) ? 'bg-primary text-white border-primary' : 'bg-muted border-border text-muted-foreground'}`}
                            >
                              {d.substring(0, 3)}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                              Dalle
                            </label>
                            <input
                              type="time"
                              value={newItem.visibility.timeFrom}
                              onChange={(e) =>
                                setNewItem((p) => ({
                                  ...p,
                                  visibility: { ...p.visibility, timeFrom: e.target.value },
                                }))
                              }
                              className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring min-w-0 w-[110px] appearance-none"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                              Alle
                            </label>
                            <input
                              type="time"
                              value={newItem.visibility.timeTo}
                              onChange={(e) =>
                                setNewItem((p) => ({
                                  ...p,
                                  visibility: { ...p.visibility, timeTo: e.target.value },
                                }))
                              }
                              className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring min-w-0 w-[110px] appearance-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                onClick={addMenuItem}
                className="flex-1 bg-primary text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-[#d43d22] hover:scale-[1.02] active:scale-95 transition-all"
              >
                Salva Piatto
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
