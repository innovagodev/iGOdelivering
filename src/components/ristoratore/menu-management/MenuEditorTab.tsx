'use client';
import React from 'react';
import { Search, Zap, Eye, EyeOff, Plus, Trash2, Pencil, AlertTriangle, X } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import AppImage from '@/components/ui/AppImage';
import Toggle from '@/components/ui/Toggle';
import ItemForm from './ItemForm';
import { MenuItem, MenuItemDraft } from '@/types';

interface MenuEditorTabProps {
  search: string;
  setSearch: (s: string) => void;
  activeCategory: string;
  setActiveCategory: (c: string) => void;
  categories: string[];
  hiddenCategories: Set<string>;
  toggleCategoryVisibility: (cat: string) => void;
  filteredItems: MenuItem[];
  toggleAvailability: (id: string) => void;
  removeMenuItem: (id: string) => void;
  pauseAllDishes: () => void;
  resumeAllDishes: () => void;
  showAddItem: boolean;
  setShowAddItem: (show: boolean) => void;
  editingItemId: string | null;
  setEditingItemId: (id: string | null) => void;
  addMenuItem: (draft: MenuItemDraft) => void;
  saveEditItem: (draft: MenuItemDraft) => void;
  addCategory: (cat: string) => void;
  itemToDraft: (item: MenuItem) => MenuItemDraft;
  emptyDraft: () => MenuItemDraft;
  allergensList: string[];
}

export default function MenuEditorTab({
  search,
  setSearch,
  activeCategory,
  setActiveCategory,
  categories,
  hiddenCategories,
  toggleCategoryVisibility,
  filteredItems,
  toggleAvailability,
  removeMenuItem,
  pauseAllDishes,
  resumeAllDishes,
  showAddItem,
  setShowAddItem,
  editingItemId,
  setEditingItemId,
  addMenuItem,
  saveEditItem,
  addCategory,
  itemToDraft,
  emptyDraft,
  allergensList,
}: MenuEditorTabProps) {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);
  const [newCatVal, setNewCatVal] = React.useState('');

  return (
    <div className="space-y-6">
      {/* Search & Actions */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca piatto o categoria..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={pauseAllDishes}
            className="flex items-center gap-2 px-4 py-2.5 bg-muted text-muted-foreground hover:text-[var(--warning)] hover:bg-[var(--warning-bg)] rounded-xl text-sm font-semibold transition-all"
          >
            <Zap size={14} /> Sospendi Tutto
          </button>
          <button
            onClick={resumeAllDishes}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white hover:bg-[#d43d22] rounded-xl text-sm font-semibold transition-all"
          >
            <Plus size={14} /> Riattiva Tutto
          </button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['Tutti', ...categories].map((cat) => {
          const isHidden = hiddenCategories.has(cat);
          const isActive = activeCategory === cat;
          return (
            <div
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all whitespace-nowrap cursor-pointer select-none ${
                isActive
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50'
              } ${isHidden ? 'opacity-50' : ''}`}
            >
              <span>{cat}</span>
              {cat !== 'Tutti' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategoryVisibility(cat);
                  }}
                  className={`p-0.5 rounded transition-colors cursor-pointer ${
                    isActive
                      ? 'text-white/80 hover:bg-white/20 hover:text-white'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  title={isHidden ? 'Rendi visibile' : 'Nascondi categoria'}
                >
                  {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              )}
            </div>
          );
        })}
        {/* Quick Add Category Button */}
        <button
          onClick={() => setIsCategoryModalOpen(true)}
          className="flex items-center justify-center p-2 rounded-xl border border-dashed border-primary text-primary hover:bg-primary/5 transition-all flex-shrink-0 h-9 w-9 cursor-pointer"
          title="Aggiungi Categoria"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Add Item Form */}
      {showAddItem && (
        <div className="bg-card border border-border rounded-2xl p-2">
          <ItemForm
            item={emptyDraft()}
            categories={categories}
            onSave={addMenuItem}
            onCancel={() => setShowAddItem(false)}
            title="Aggiungi nuovo piatto"
            saveLabel="Aggiungi al Menu"
            onAddCategory={addCategory}
            allergensList={allergensList}
          />
        </div>
      )}

      {/* Items List */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-1 xl:col-span-2 bg-card border border-border border-dashed rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
              <Search size={24} />
            </div>
            <p className="text-lg font-bold text-foreground">Nessun piatto trovato</p>
            <p className="text-sm text-muted-foreground mt-1">
              Prova a cambiare i filtri o la ricerca
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <React.Fragment key={item.id}>
              {editingItemId === item.id ? (
                <div className="col-span-1 xl:col-span-2 bg-card border border-border rounded-2xl p-2 animate-fade-in">
                  <ItemForm
                    item={itemToDraft(item)}
                    categories={categories}
                    onSave={saveEditItem}
                    onCancel={() => setEditingItemId(null)}
                    title="Modifica piatto"
                    saveLabel="Salva Modifiche"
                    onAddCategory={addCategory}
                    allergensList={allergensList}
                  />
                </div>
              ) : (
                <div
                  className={`bg-card border border-border rounded-2xl overflow-hidden flex gap-4 p-4 transition-all hover:shadow-md ${
                    !item.available ? 'opacity-75 grayscale-[0.5]' : ''
                  }`}
                >
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
                    <AppImage
                      src={item.image}
                      alt={item.imageAlt}
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <div className="absolute top-1.5 right-1.5 flex flex-col gap-1">
                      {item.visibility === 'hidden' && (
                        <Badge variant="warning" size="xs" icon={<EyeOff size={10} />}>
                          Nascosto
                        </Badge>
                      )}
                      {!item.available && (
                        <Badge variant="danger" size="xs" icon={<AlertTriangle size={10} />}>
                          Esaurito
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">
                            {item.category}
                          </p>
                          <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                            {item.name}
                          </h3>
                        </div>
                        <p className="text-sm sm:text-base font-extrabold text-foreground whitespace-nowrap">
                          € {item.price.toFixed(2)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-1.5">
                        <Toggle
                          checked={item.available}
                          onChange={() => toggleAvailability(item.id)}
                          size="sm"
                        />
                        <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground select-none">
                          {item.available ? 'Disponibile' : 'Sospeso'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingItemId(item.id)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Modifica"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => removeMenuItem(item.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"
                          title="Rimuovi"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))
        )}
      </div>

      {/* Sleek Minimal Category Creation Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-5 animate-fade-in relative text-left">
            <button
              onClick={() => {
                setIsCategoryModalOpen(false);
                setNewCatVal('');
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg cursor-pointer"
            >
              <X size={15} />
            </button>
            <h3 className="text-sm font-bold text-foreground mb-3">Nuova Categoria</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newCatVal}
                onChange={(e) => setNewCatVal(e.target.value)}
                placeholder="Es. Antipasti, Primi, Pizza..."
                className="w-full px-3 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const cat = newCatVal.trim();
                    if (cat) {
                      addCategory(cat);
                      setIsCategoryModalOpen(false);
                      setNewCatVal('');
                    }
                  }
                }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setNewCatVal('');
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cat = newCatVal.trim();
                    if (cat) {
                      addCategory(cat);
                      setIsCategoryModalOpen(false);
                      setNewCatVal('');
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-[#d43d22] cursor-pointer"
                >
                  Aggiungi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
