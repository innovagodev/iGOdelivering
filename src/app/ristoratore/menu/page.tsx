'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { PauseCircle, Plus, PlayCircle, Zap, Store } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

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

  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchMenuData = async () => {
    if (!restaurantId || restaurantId === 'r-001') return;
    try {
      // 1. Fetch categories
      const { data: dbCats, error: catError } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: true });

      if (catError) throw catError;
      
      const categoryNames = dbCats && dbCats.length > 0 
        ? dbCats.map((c) => c.name) 
        : DEFAULT_CATEGORIES;
      setCategories(categoryNames);

      // 2. Fetch items
      const { data: dbItems, error: itemError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: true });

      if (itemError) throw itemError;

      const mappedItems: MenuItem[] = (dbItems || []).map((i: any) => ({
        id: i.id,
        name: i.name,
        category: i.category_name,
        price: parseFloat(i.price),
        originalPrice: i.original_price ? parseFloat(i.original_price) : undefined,
        description: i.description || '',
        available: !!i.available,
        image: i.image_url || '',
        imageAlt: i.image_alt || i.name,
        allergens: i.allergens || [],
        dishTags: i.dish_tags || [],
        ingredients: i.ingredients || [],
        orders: i.orders_count || 0,
        visibility: i.visibility || 'always',
        visibilitySchedule: i.visibility_from && i.visibility_to ? { from: i.visibility_from.slice(0, 5), to: i.visibility_to.slice(0, 5) } : undefined,
        optionGroups: i.option_groups || [],
        customizationEnabled: i.customization_enabled !== undefined ? !!i.customization_enabled : true,
        notesEnabled: i.notes_enabled !== undefined ? !!i.notes_enabled : true,
      }));

      setItems(mappedItems);
    } catch (e) {
      console.error('Error loading menu data from Supabase:', e);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    fetchMenuData();
  }, [restaurantId]);

  const showFeedback = (msg: string) => {
    setBulkActionFeedback(msg);
    setTimeout(() => setBulkActionFeedback(null), 2500);
  };

  const toggleAvailability = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ available: !item.available })
        .eq('id', id);
      if (error) throw error;
      setItems((prev) => prev.map((m) => (m.id === id ? { ...m, available: !m.available } : m)));
    } catch (e) {
      console.error('Error toggling availability:', e);
    }
  };

  const removeMenuItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setItems((prev) => prev.filter((m) => m.id !== id));
      showFeedback('Piatto rimosso');
    } catch (e) {
      console.error('Error removing menu item:', e);
    }
  };

  const addCategory = async (cat: string) => {
    if (categories.includes(cat)) return;
    try {
      const { error } = await supabase
        .from('menu_categories')
        .insert({
          restaurant_id: restaurantId,
          name: cat,
          sort_order: categories.length
        });
      if (error) throw error;
      setCategories((p) => [...p, cat]);
    } catch (e) {
      console.error('Error adding category:', e);
    }
  };

  const toggleCategoryVisibility = (cat: string) =>
    setHiddenCategories((prev) => {
      const n = new Set(prev);
      if (n.has(cat)) n.delete(cat);
      else n.add(cat);
      return n;
    });

  const addMenuItem = async (draft: MenuItemDraft) => {
    const isPromoActive = !!draft.originalPrice && parseFloat(draft.originalPrice) > 0;
    const listPrice = parseFloat(draft.price) || 0;
    const promoPrice = isPromoActive ? parseFloat(draft.originalPrice!) : undefined;

    try {
      const { data: catData } = await supabase
        .from('menu_categories')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('name', draft.category)
        .maybeSingle();

      const { error } = await supabase
        .from('menu_items')
        .insert({
          restaurant_id: restaurantId,
          category_id: catData?.id || null,
          category_name: draft.category,
          name: draft.name,
          description: draft.description,
          price: isPromoActive ? promoPrice! : listPrice,
          original_price: isPromoActive ? listPrice : null,
          image_url: draft.imageUrl || null,
          image_alt: draft.name,
          allergens: draft.allergens,
          dish_tags: draft.dishTags || [],
          ingredients: draft.ingredients || [],
          available: draft.available,
          visibility: draft.visibility,
          visibility_from: draft.visibilitySchedule?.from || null,
          visibility_to: draft.visibilitySchedule?.to || null,
          option_groups: draft.optionGroups || [],
          customization_enabled: draft.customizationEnabled ?? true,
          notes_enabled: draft.notesEnabled ?? true,
        });

      if (error) throw error;
      setShowAddItem(false);
      showFeedback(`"${draft.name}" aggiunto`);
      await fetchMenuData();
    } catch (e) {
      console.error('Error adding menu item:', e);
      alert('Errore nell\'aggiungere il piatto.');
    }
  };

  const saveEditItem = async (draft: MenuItemDraft) => {
    const isPromoActive = !!draft.originalPrice && parseFloat(draft.originalPrice) > 0;
    const listPrice = parseFloat(draft.price) || 0;
    const promoPrice = isPromoActive ? parseFloat(draft.originalPrice!) : undefined;

    try {
      const { data: catData } = await supabase
        .from('menu_categories')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('name', draft.category)
        .maybeSingle();

      const { error } = await supabase
        .from('menu_items')
        .update({
          category_id: catData?.id || null,
          category_name: draft.category,
          name: draft.name,
          description: draft.description,
          price: isPromoActive ? promoPrice! : listPrice,
          original_price: isPromoActive ? listPrice : null,
          image_url: draft.imageUrl || null,
          allergens: draft.allergens,
          dish_tags: draft.dishTags || [],
          ingredients: draft.ingredients || [],
          available: draft.available,
          visibility: draft.visibility,
          visibility_from: draft.visibilitySchedule?.from || null,
          visibility_to: draft.visibilitySchedule?.to || null,
          option_groups: draft.optionGroups || [],
          customization_enabled: draft.customizationEnabled ?? true,
          notes_enabled: draft.notesEnabled ?? true,
        })
        .eq('id', draft.id);

      if (error) throw error;
      setEditingItemId(null);
      showFeedback(`"${draft.name}" aggiornato`);
      await fetchMenuData();
    } catch (e) {
      console.error('Error editing menu item:', e);
      alert('Errore nel salvare il piatto.');
    }
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
      dishTags: i.dishTags || [],
      ingredients: i.ingredients || [],
      visibility: i.visibility,
      visibilitySchedule: i.visibilitySchedule || { from: '', to: '' },
      optionGroups: i.optionGroups || [],
      customizationEnabled: i.customizationEnabled ?? true,
      notesEnabled: i.notesEnabled ?? true,
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
    dishTags: [],
    ingredients: [],
    visibility: 'always',
    visibilitySchedule: { from: '', to: '' },
    optionGroups: [],
    customizationEnabled: true,
    notesEnabled: true,
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
                className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover w-full sm:w-auto"
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
              pauseAllDishes={async () => {
                try {
                  const { error } = await supabase
                    .from('menu_items')
                    .update({ available: false })
                    .eq('restaurant_id', restaurantId);
                  if (error) throw error;
                  setItems((p) => p.map((i) => ({ ...i, available: false })));
                  showFeedback('Tutti i piatti sospesi');
                } catch (e) {
                  console.error('Error pausing all dishes:', e);
                }
              }}
              resumeAllDishes={async () => {
                try {
                  const { error } = await supabase
                    .from('menu_items')
                    .update({ available: true })
                    .eq('restaurant_id', restaurantId);
                  if (error) throw error;
                  setItems((p) => p.map((i) => ({ ...i, available: true })));
                  showFeedback('Tutti i piatti riattivati');
                } catch (e) {
                  console.error('Error resuming all dishes:', e);
                }
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
