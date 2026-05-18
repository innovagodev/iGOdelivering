'use client';
import React from 'react';
import { Search, Zap, Eye, EyeOff, Plus, Trash2, Pencil, AlertTriangle } from 'lucide-react';
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
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
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
        {['Tutti', ...categories].map((cat) => (
          <div key={cat} className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap border ${
                activeCategory === cat
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {cat}
            </button>
            {cat !== 'Tutti' && (
              <button
                onClick={() => toggleCategoryVisibility(cat)}
                className={`p-2 rounded-xl border border-border transition-colors ${hiddenCategories.has(cat) ? 'bg-orange-100 text-primary' : 'bg-card text-muted-foreground hover:bg-muted'}`}
                title={hiddenCategories.has(cat) ? 'Rendi visibile' : 'Nascondi categoria'}
              >
                {hiddenCategories.has(cat) ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Item Form */}
      {showAddItem && (
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
      )}

      {/* Items List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="bg-card border border-border border-dashed rounded-2xl p-12 text-center">
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
              ) : (
                <div
                  className={`bg-card border border-border rounded-2xl overflow-hidden flex flex-col sm:flex-row gap-4 p-4 transition-all hover:shadow-md ${!item.available ? 'opacity-75 grayscale-[0.5]' : ''}`}
                >
                  <div className="relative w-full sm:w-28 h-28 flex-shrink-0">
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
                          {item.category}
                        </p>
                        <h3 className="text-base font-bold text-foreground truncate">
                          {item.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {item.description}
                        </p>
                      </div>
                      <p className="text-base font-bold text-foreground">
                        €{item.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      <div className="flex items-center gap-2">
                        <Toggle
                          checked={item.available}
                          onChange={() => toggleAvailability(item.id)}
                          size="sm"
                        />
                        <span className="text-xs font-semibold text-muted-foreground">
                          {item.available ? 'Disponibile' : 'Sospeso'}
                        </span>
                      </div>
                      <div className="h-4 w-px bg-border mx-1" />
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingItemId(item.id)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => removeMenuItem(item.id)}
                          className="p-2 rounded-lg hover:bg-[var(--danger-bg)] text-muted-foreground hover:text-[var(--danger)] transition-colors"
                        >
                          <Trash2 size={14} />
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
    </div>
  );
}
