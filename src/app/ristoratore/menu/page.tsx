'use client';
import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Bell, PauseCircle, PlayCircle, Zap, UtensilsCrossed, Settings } from 'lucide-react';

// Components
import MenuEditorTab from '@/components/ristoratore/menu-management/MenuEditorTab';
import ServiceHoursTab from '@/components/ristoratore/menu-management/ServiceHoursTab';

import { MenuItem, MenuItemDraft } from '@/types';

// Types
type MenuTab = 'piatti' | 'orari';

// Constants
const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<MenuTab>('piatti');
  const [items, setItems] = useState<MenuItem[]>(initialMenuItems);
  const [categories, setCategories] = useState<string[]>([...DEFAULT_CATEGORIES]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tutti');
  const [servicePaused, setServicePaused] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  const [bulkActionFeedback, setBulkActionFeedback] = useState<string | null>(null);

  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [serviceHours, setServiceHours] = useState(() => {
    const buildDays = () => {
      const h: any = {};
      DAYS.forEach(
        (d) =>
          (h[d] = {
            enabled: true,
            suspended: false,
            lunch: { from: '11:30', to: '14:30' },
            dinner: { from: '19:00', to: '22:30' },
          })
      );
      h['Domenica'].enabled = false;
      return h;
    };
    return { pickup: buildDays(), delivery: buildDays(), reservation: buildDays() };
  });

  const [serviceSuspended, setServiceSuspended] = useState({
    pickup: false,
    delivery: false,
    reservation: false,
  });

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
    const newItem: MenuItem = {
      id: `mi-${Date.now()}`,
      name: draft.name,
      category: draft.category,
      price: parseFloat(draft.price) || 0,
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
    setItems((p) =>
      p.map((m) =>
        m.id === draft.id
          ? {
              ...m,
              name: draft.name,
              category: draft.category,
              price: parseFloat(draft.price) || 0,
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

  const itemToDraft = (i: MenuItem): MenuItemDraft => ({
    id: i.id,
    name: i.name,
    category: i.category,
    price: i.price.toString(),
    description: i.description,
    available: i.available,
    imageUrl: i.image,
    allergens: i.allergens,
    visibility: i.visibility,
    visibilitySchedule: i.visibilitySchedule || { from: '', to: '' },
    optionGroups: i.optionGroups || [],
  });

  const emptyDraft = (): MenuItemDraft => ({
    id: '',
    name: '',
    category: 'Pizza',
    price: '',
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
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-card border-b border-border flex items-center px-6 gap-4 flex-shrink-0">
          <span className="font-bold text-foreground text-base flex-1">Pizzeria Bella Napoli</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setServicePaused(!servicePaused)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${servicePaused ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-[var(--warning-bg)] text-[var(--warning)]'}`}
            >
              {servicePaused ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
              {servicePaused ? 'Riprendi Servizio' : 'Metti in Pausa'}
            </button>
            <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
              <Bell size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-screen-xl mx-auto px-6 lg:px-8 py-6 space-y-6">
            {servicePaused && (
              <div className="bg-[var(--warning-bg)] border border-[var(--warning)]/30 rounded-xl p-4 flex items-center gap-3">
                <PauseCircle size={20} className="text-[var(--warning)] flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Servizio in pausa</p>
                </div>
                <button
                  onClick={() => setServicePaused(false)}
                  className="bg-[var(--warning)] text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                >
                  Riprendi
                </button>
              </div>
            )}

            {bulkActionFeedback && (
              <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background text-sm font-semibold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2">
                <Zap size={14} />
                {bulkActionFeedback}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Gestione Menu</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {items.filter((i) => i.available).length} disponibili ·{' '}
                  {items.filter((i) => !i.available).length} sospesi
                </p>
              </div>
              <button
                onClick={() => setShowAddItem(true)}
                className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-[#d43d22]"
              >
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

            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl w-fit">
              <button
                onClick={() => setActiveTab('piatti')}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'piatti' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <UtensilsCrossed size={14} />
                Piatti & Menu
              </button>
              <button
                onClick={() => setActiveTab('orari')}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'orari' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Settings size={14} />
                Orari & Servizi
              </button>
            </div>

            {activeTab === 'piatti' ? (
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
            ) : (
              <ServiceHoursTab
                serviceHours={serviceHours}
                serviceSuspended={serviceSuspended}
                toggleServiceSuspension={(s) =>
                  setServiceSuspended((p) => {
                    const n = { ...p, [s]: !p[s] };
                    showFeedback(`Servizio ${s} ${n[s] ? 'sospeso' : 'riattivato'}`);
                    return n;
                  })
                }
                toggleServiceDay={(s, d) =>
                  setServiceHours((p: any) => ({
                    ...p,
                    [s]: { ...p[s], [d]: { ...p[s][d], enabled: !p[s][d].enabled } },
                  }))
                }
                updateServiceHour={(s, d, svc, f, v) =>
                  setServiceHours((p: any) => ({
                    ...p,
                    [s]: { ...p[s], [d]: { ...p[s][d], [svc]: { ...p[s][d][svc], [f]: v } } },
                  }))
                }
                handleSaveHours={() => {
                  setSaved(true);
                  showFeedback('Orari salvati');
                  setTimeout(() => setSaved(false), 2500);
                }}
                saved={saved}
                days={DAYS}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
