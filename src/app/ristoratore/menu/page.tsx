'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { PauseCircle, Plus, PlayCircle, Zap, Store } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

import MenuEditorTab from '@/components/ristoratore/menu-management/MenuEditorTab';
import { MenuItem, MenuItemDraft } from '@/types';
import { isMockRestaurant } from '@/lib/restaurant-utils';

// Constants
const ALLERGENS_LIST = [
  'Glutine',
  'Latte',
  'Uova',
  'Pesce',
  'Crostacei',
  'Arachidi',
  'Soia',
  'Frutta a guscio',
  'Sedano',
  'Senape',
  'Sesamo',
  'Lupini',
  'Molluschi',
  'Anidride solforosa',
];
const DEFAULT_CATEGORIES = ['Antipasti', 'Primi', 'Pizza', 'Secondi', 'Dolci', 'Bevande'];

const initialMenuItems: MenuItem[] = [
  {
    id: 'mi-001',
    name: 'Pizza Margherita',
    category: 'Pizza',
    price: 9.5,
    description: 'Pomodoro, mozzarella fior di latte, basilico fresco',
    available: true,
    image: 'https://images.unsplash.com/photo-1703784022146-b72677752ce5',
    imageAlt: 'Pizza Margherita',
    allergens: ['Glutine', 'Latte'],
    orders: 284,
    visibility: 'always',
    optionGroups: [],
  },
  {
    id: 'mi-002',
    name: 'Pizza Diavola',
    category: 'Pizza',
    price: 11.0,
    description: 'Pomodoro, mozzarella, salame piccante',
    available: true,
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_11fe408ea-1772095952334.png',
    imageAlt: 'Pizza Diavola',
    allergens: ['Glutine', 'Latte'],
    orders: 198,
    visibility: 'always',
    optionGroups: [],
  },
  {
    id: 'mi-003',
    name: 'Spaghetti Carbonara',
    category: 'Primi',
    price: 13.5,
    description: 'Spaghetti, guanciale, uova, pecorino',
    available: true,
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_146ec8666-1772378183438.png',
    imageAlt: 'Spaghetti Carbonara',
    allergens: ['Glutine', 'Uova', 'Latte'],
    orders: 156,
    visibility: 'always',
    optionGroups: [],
  },
  {
    id: 'mi-004',
    name: 'Risotto ai Funghi',
    category: 'Primi',
    price: 14.0,
    description: 'Riso Carnaroli, funghi porcini, parmigiano',
    available: false,
    image: 'https://images.unsplash.com/photo-1627124679711-80f287a6451f',
    imageAlt: 'Risotto ai Funghi',
    allergens: ['Latte'],
    orders: 89,
    visibility: 'always',
    optionGroups: [],
  },
];

export default function RistoratoreMenuPage() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([...DEFAULT_CATEGORIES]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tutti');
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  const [bulkActionFeedback, setBulkActionFeedback] = useState<string | null>(null);

  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  };

  const restaurantId = user?.restaurantId || 'r-001';
  const slug = slugify(user?.restaurantName || 'Pizzeria Bella Napoli');

  const [items, setItems] = useState<MenuItem[]>(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('igodelivering_auth');
      let rId = 'r-001';
      let rName = 'Pizzeria Bella Napoli';
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          rId = parsedUser.restaurantId || 'r-001';
          rName = parsedUser.restaurantName || 'Pizzeria Bella Napoli';
        } catch {}
      }
      const slg = ((text: string) => {
        return text
          .toString()
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-')
          .replace(/[^\w\-]+/g, '')
          .replace(/\-\-+/g, '-');
      })(rName);
      const stored =
        localStorage.getItem(`iGO_menu_items_${slg}`) ||
        localStorage.getItem(`iGO_menu_items_${rId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch {}
      }
      if (!isMockRestaurant(rId) && !isMockRestaurant(slg)) {
        return [];
      }
    }
    return initialMenuItems;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`iGO_menu_items_${restaurantId}`, JSON.stringify(items));
      localStorage.setItem(`iGO_menu_items_${slug}`, JSON.stringify(items));
    }
  }, [items, restaurantId, slug]);

  const showFeedback = (msg: string) => {
    setBulkActionFeedback(msg);
    setTimeout(() => setBulkActionFeedback(null), 2500);
  };

  const toggleAvailability = (id: string) =>
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, available: !m.available } : m)));
  const removeMenuItem = (id: string) => {
    setItems((prev) => prev.filter((m) => m.id !== id));
    showFeedback('Piatto rimosso');
  };
  const addCategory = (cat: string) => setCategories((p) => (p.includes(cat) ? p : [...p, cat]));
  const toggleCategoryVisibility = (cat: string) =>
    setHiddenCategories((prev) => {
      const n = new Set(prev);
      if (n.has(cat)) n.delete(cat);
      else n.add(cat);
      return n;
    });

  const addMenuItem = (draft: MenuItemDraft) => {
    const isPromoActive = !!draft.originalPrice && parseFloat(draft.originalPrice) > 0;
    const listPrice = parseFloat(draft.price) || 0;
    const promoPrice = isPromoActive ? parseFloat(draft.originalPrice!) : undefined;

    const newItem: MenuItem = {
      id: `mi-${Date.now()}`,
      name: draft.name,
      category: draft.category,
      price: isPromoActive ? promoPrice! : listPrice,
      originalPrice: isPromoActive ? listPrice : undefined,
      description: draft.description,
      available: draft.available,
      image: draft.imageUrl,
      imageAlt: draft.name,
      allergens: draft.allergens,
      orders: 0,
      visibility: draft.visibility,
      visibilitySchedule: draft.visibilitySchedule,
      optionGroups: draft.optionGroups,
    };
    setItems((p) => [...p, newItem]);
    setShowAddItem(false);
    showFeedback(`"${draft.name}" aggiunto`);
  };

  const saveEditItem = (draft: MenuItemDraft) => {
    const isPromoActive = !!draft.originalPrice && parseFloat(draft.originalPrice) > 0;
    const listPrice = parseFloat(draft.price) || 0;
    const promoPrice = isPromoActive ? parseFloat(draft.originalPrice!) : undefined;

    setItems((p) =>
      p.map((m) =>
        m.id === draft.id
          ? {
              ...m,
              name: draft.name,
              category: draft.category,
              price: isPromoActive ? promoPrice! : listPrice,
              originalPrice: isPromoActive ? listPrice : undefined,
              description: draft.description,
              available: draft.available,
              image: draft.imageUrl || m.image,
              allergens: draft.allergens,
              visibility: draft.visibility,
              visibilitySchedule: draft.visibilitySchedule,
              optionGroups: draft.optionGroups,
            }
          : m
      )
    );
    setEditingItemId(null);
    showFeedback(`"${draft.name}" aggiornato`);
  };

  const itemToDraft = (i: MenuItem): MenuItemDraft => {
    const isPromoActive = i.originalPrice !== undefined && i.originalPrice > i.price;
    return {
      id: i.id,
      name: i.name,
      category: i.category,
      price: isPromoActive ? i.originalPrice!.toString() : i.price.toString(),
      originalPrice: isPromoActive ? i.price.toString() : '',
      description: i.description,
      available: i.available,
      imageUrl: i.image,
      allergens: i.allergens,
      visibility: i.visibility,
      visibilitySchedule: i.visibilitySchedule || { from: '', to: '' },
      optionGroups: i.optionGroups || [],
    };
  };

  const emptyDraft = (): MenuItemDraft => ({
    id: '',
    name: '',
    category: 'Pizza',
    price: '',
    originalPrice: '',
    description: '',
    available: true,
    imageUrl: '',
    allergens: [],
    visibility: 'always',
    visibilitySchedule: { from: '', to: '' },
    optionGroups: [],
  });

  const filtered = items.filter((i) => {
    const ms =
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase());
    const mc = activeCategory === 'Tutti' || i.category === activeCategory;
    return ms && mc && !hiddenCategories.has(i.category);
  });

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeSection="nav-menu"
        onSectionChange={() => {}}
        role="ristoratore"
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          role="ristoratore"
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMobileMenuOpen={() => setIsMobileOpen(true)}
          leftContent={
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <Store size={16} className="text-primary flex-shrink-0" />
              <span className="font-semibold text-foreground text-base truncate">
                {user?.restaurantName || 'Pizzeria Bella Napoli'}
              </span>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-screen-xl mx-auto px-6 lg:px-8 py-6 space-y-6">
            {bulkActionFeedback && (
              <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background text-sm font-semibold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2">
                <Zap size={14} />
                {bulkActionFeedback}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Gestione Menu</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {items.filter((i) => i.available).length} {items.filter((i) => i.available).length === 1 ? "disponibile" : "disponibili"} ·{' '}
                  {items.filter((i) => !i.available).length} {items.filter((i) => !i.available).length === 1 ? "sospeso" : "sospesi"}</p>
              </div>
              <button
                onClick={() => setShowAddItem(true)}
                className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-[#d43d22] w-full sm:w-auto"
              >
                <Plus size={14} />
                Aggiungi Piatto
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-4 shadow-card">
                <p className="text-xs text-muted-foreground font-medium">Totale piatti</p>
                <p className="text-2xl font-bold tabular-nums text-foreground mt-1">
                  {items.length}
                </p>
              </div>
              <div className="bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-xl p-4">
                <p className="text-xs text-muted-foreground font-medium">Disponibili</p>
                <p className="text-2xl font-bold tabular-nums text-[var(--success)] mt-1">
                  {items.filter((i) => i.available).length}
                </p>
              </div>
              <div className="bg-[var(--warning-bg)] border border-[var(--warning)]/20 rounded-xl p-4">
                <p className="text-xs text-muted-foreground font-medium">Sospesi</p>
                <p className="text-2xl font-bold tabular-nums text-[var(--warning)] mt-1">
                  {items.filter((i) => !i.available).length}
                </p>
              </div>
            </div>

            <MenuEditorTab
              search={search}
              setSearch={setSearch}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              categories={categories}
              hiddenCategories={hiddenCategories}
              toggleCategoryVisibility={toggleCategoryVisibility}
              filteredItems={filtered}
              toggleAvailability={toggleAvailability}
              removeMenuItem={removeMenuItem}
              pauseAllDishes={() => {
                setItems((p) => p.map((i) => ({ ...i, available: false })));
                showFeedback('Tutti i piatti sospesi');
              }}
              resumeAllDishes={() => {
                setItems((p) => p.map((i) => ({ ...i, available: true })));
                showFeedback('Tutti i piatti riattivati');
              }}
              showAddItem={showAddItem}
              setShowAddItem={setShowAddItem}
              editingItemId={editingItemId}
              setEditingItemId={setEditingItemId}
              addMenuItem={addMenuItem}
              saveEditItem={saveEditItem}
              addCategory={addCategory}
              itemToDraft={itemToDraft}
              emptyDraft={emptyDraft}
              allergensList={ALLERGENS_LIST}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
