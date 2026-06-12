'use client';
import React, { useState, useRef, useEffect } from 'react';
import RestaurantSidebar from '@/components/RestaurantSidebar';
import {
  Bell, PauseCircle, PlayCircle, AlertTriangle, Search, Zap, Eye, EyeOff,
  ChevronDown, ChevronUp, Plus, Trash2, Euro, Upload, Pencil, X, Check,
  Clock, UtensilsCrossed, Save, Settings,
} from 'lucide-react';
import Toggle from '@/components/ui/Toggle';
import Badge from '@/components/ui/Badge';
import AppImage from '@/components/ui/AppImage';

// ─── Types ───────────────────────────────────────────────────────────────────

type VisibilityType = 'always' | 'hidden' | 'scheduled';
type MenuTab = 'piatti' | 'orari';

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

interface RistoratoreMenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  available: boolean;
  image: string;
  imageAlt: string;
  allergens: string[];
  orders: number;
  visibility: VisibilityType;
  visibilitySchedule?: { from: string; to: string };
  optionGroups: OptionGroup[];
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

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const ALLERGENS_LIST = ['Glutine', 'Latte', 'Uova', 'Pesce', 'Crostacei', 'Arachidi', 'Soia', 'Frutta a guscio', 'Sedano', 'Senape', 'Sesamo', 'Lupini', 'Molluschi', 'Anidride solforosa'];
const DEFAULT_CATEGORIES = ['Antipasti', 'Primi', 'Pizza', 'Secondi', 'Dolci', 'Bevande'];
const CATEGORIES_FILTER = ['Tutti', ...DEFAULT_CATEGORIES];

const initialMenuItems: RistoratoreMenuItem[] = [
  { id: 'mi-001', name: 'Pizza Margherita', category: 'Pizza', price: 9.50, description: 'Pomodoro, mozzarella fior di latte, basilico fresco', available: true, image: 'https://images.unsplash.com/photo-1703784022146-b72677752ce5', imageAlt: 'Pizza Margherita con pomodoro e mozzarella', allergens: ['Glutine', 'Latte'], orders: 284, visibility: 'always', optionGroups: [] },
  { id: 'mi-002', name: 'Pizza Diavola', category: 'Pizza', price: 11.00, description: 'Pomodoro, mozzarella, salame piccante, peperoncino', available: true, image: 'https://img.rocket.new/generatedImages/rocket_gen_img_11fe408ea-1772095952334.png', imageAlt: 'Pizza Diavola con salame piccante', allergens: ['Glutine', 'Latte'], orders: 198, visibility: 'always', optionGroups: [] },
  { id: 'mi-003', name: 'Spaghetti Carbonara', category: 'Primi', price: 13.50, description: 'Spaghetti, guanciale, uova, pecorino, pepe nero', available: true, image: 'https://img.rocket.new/generatedImages/rocket_gen_img_146ec8666-1772378183438.png', imageAlt: 'Spaghetti alla carbonara con guanciale croccante', allergens: ['Glutine', 'Uova', 'Latte'], orders: 156, visibility: 'always', optionGroups: [] },
  { id: 'mi-004', name: 'Risotto ai Funghi', category: 'Primi', price: 14.00, description: 'Riso Carnaroli, funghi porcini, parmigiano, burro', available: false, image: 'https://images.unsplash.com/photo-1627124679711-80f287a6451f', imageAlt: 'Risotto cremoso ai funghi porcini', allergens: ['Latte'], orders: 89, visibility: 'always', optionGroups: [] },
  { id: 'mi-005', name: 'Tagliata di Manzo', category: 'Secondi', price: 22.00, description: 'Manzo irlandese, rucola, scaglie di grana, pomodorini', available: true, image: 'https://img.rocket.new/generatedImages/rocket_gen_img_175d64f09-1773173914886.png', imageAlt: 'Tagliata di manzo con rucola e grana', allergens: ['Latte'], orders: 112, visibility: 'always', optionGroups: [] },
  { id: 'mi-006', name: 'Tiramisù', category: 'Dolci', price: 6.50, description: 'Savoiardi, mascarpone, caffè espresso, cacao', available: true, image: 'https://img.rocket.new/generatedImages/rocket_gen_img_1d7fa7325-1772072802998.png', imageAlt: 'Tiramisù classico con mascarpone e cacao', allergens: ['Uova', 'Latte', 'Glutine'], orders: 201, visibility: 'always', optionGroups: [] },
  { id: 'mi-007', name: 'Antipasto Misto', category: 'Antipasti', price: 12.00, description: 'Salumi selezionati, formaggi, olive, bruschette', available: true, image: 'https://images.unsplash.com/photo-1615221546448-e940c9f8f665', imageAlt: 'Tagliere di antipasto misto con salumi e formaggi', allergens: ['Glutine', 'Latte'], orders: 143, visibility: 'always', optionGroups: [] },
  { id: 'mi-008', name: 'Acqua Naturale 75cl', category: 'Bevande', price: 2.50, description: 'Acqua minerale naturale in bottiglia di vetro', available: true, image: 'https://img.rocket.new/generatedImages/rocket_gen_img_15d8ee313-1772492791462.png', imageAlt: 'Bottiglia di acqua minerale naturale da 75cl', allergens: [], orders: 312, visibility: 'always', optionGroups: [] },
];

const defaultServiceDays = () => {
  const h: Record<string, { enabled: boolean; lunch: { from: string; to: string }; dinner: { from: string; to: string } }> = {};
  DAYS.forEach((d) => {
    h[d] = { enabled: true, lunch: { from: '11:30', to: '14:30' }, dinner: { from: '19:00', to: '22:30' } };
  });
  h['Domenica'].enabled = false;
  return h;
};

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

// ─── ItemForm component ───────────────────────────────────────────────────────

function ItemForm({
  item,
  categories,
  onSave,
  onCancel,
  title,
  saveLabel,
  onAddCategory,
}: {
  item: MenuItemDraft;
  categories: string[];
  onSave: (item: MenuItemDraft) => void;
  onCancel: () => void;
  title: string;
  saveLabel: string;
  onAddCategory: (cat: string) => void;
}) {
  const [draft, setDraft] = useState<MenuItemDraft>({ ...item, optionGroups: item.optionGroups ? [...item.optionGroups] : [] });
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
      optionGroups: [...p.optionGroups, { id: `og-${Date.now()}`, name: newGroupName.trim(), choices: [] }],
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
          ? { ...g, choices: [...g.choices, { id: `ch-${Date.now()}`, name, price: newChoicePrice[gid] || '0' }] }
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
            className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Categoria</label>
          {showNewCategory ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                placeholder="Nuova categoria"
                className="flex-1 px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button onClick={handleAddCategory} className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-[#d43d22]">
                <Check size={13} />
              </button>
              <button onClick={() => setShowNewCategory(false)} className="px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-muted">
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={draft.category}
                  onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                >
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
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
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Prezzo (€) *</label>
          <div className="relative">
            <Euro size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="number"
              value={draft.price}
              onChange={(e) => setDraft((p) => ({ ...p, price: e.target.value }))}
              placeholder="9.50"
              min={0}
              step={0.5}
              className="w-full pl-7 pr-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        {/* Image */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Immagine</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Upload size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="url"
                value={draft.imageUrl}
                onChange={(e) => setDraft((p) => ({ ...p, imageUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full pl-7 pr-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted border border-border whitespace-nowrap"
            >
              File
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
          </div>
        </div>
        {/* Description */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Descrizione</label>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
        {/* Allergens */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-2">Allergeni</label>
          <div className="flex flex-wrap gap-2">
            {ALLERGENS_LIST.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleAllergen(a)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  draft.allergens.includes(a)
                    ? 'bg-amber-100 text-amber-700 border border-amber-300' :'bg-muted text-muted-foreground border border-border hover:border-amber-300'
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
            {([
              { value: 'always', label: 'Sempre visibile', icon: <Eye size={13} /> },
              { value: 'hidden', label: 'Nascosto', icon: <EyeOff size={13} /> },
              { value: 'scheduled', label: 'Orario programmato', icon: <Clock size={13} /> },
            ] as { value: VisibilityType; label: string; icon: React.ReactNode }[]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDraft((p) => ({ ...p, visibility: opt.value }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  draft.visibility === opt.value
                    ? 'bg-primary text-white border-primary' :'bg-muted text-muted-foreground border-border hover:border-primary'
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
                  setDraft((p) => ({ ...p, visibilitySchedule: { ...p.visibilitySchedule, from: e.target.value, to: p.visibilitySchedule?.to || '' } }))
                }
                className="px-2 py-1.5 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground">a</span>
              <input
                type="time"
                value={draft.visibilitySchedule?.to || ''}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, visibilitySchedule: { from: p.visibilitySchedule?.from || '', to: e.target.value } }))
                }
                className="px-2 py-1.5 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        </div>
        {/* Option Groups */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-2">Opzioni e componenti aggiuntivi</label>
          <div className="space-y-3">
            {draft.optionGroups.map((group) => (
              <div key={group.id} className="border border-border rounded-xl p-3 space-y-2 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{group.name}</span>
                  <button onClick={() => removeOptionGroup(group.id)} className="p-1 rounded hover:bg-[var(--danger-bg)] text-muted-foreground hover:text-[var(--danger)]">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="space-y-1">
                  {group.choices.map((choice) => (
                    <div key={choice.id} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 text-foreground">{choice.name}</span>
                      <span className="text-muted-foreground">+€{parseFloat(choice.price || '0').toFixed(2)}</span>
                      <button onClick={() => removeChoice(group.id, choice.id)} className="p-0.5 rounded hover:text-[var(--danger)]">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newChoiceName[group.id] || ''}
                    onChange={(e) => setNewChoiceName((p) => ({ ...p, [group.id]: e.target.value }))}
                    placeholder="Nome scelta"
                    className="flex-1 px-2 py-1.5 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <div className="relative w-20">
                    <Euro size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      value={newChoicePrice[group.id] || ''}
                      onChange={(e) => setNewChoicePrice((p) => ({ ...p, [group.id]: e.target.value }))}
                      placeholder="0.00"
                      min={0}
                      step={0.5}
                      className="w-full pl-5 pr-2 py-1.5 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
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
                className="flex-1 px-3 py-2 text-xs bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
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
          onClick={() => { if (!draft.name || !draft.price) return; onSave(draft); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#d43d22] transition-all"
        >
          <Check size={14} />
          {saveLabel}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
          Annulla
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RistoratoreMenuPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<MenuTab>('piatti');
  const [items, setItems] = useState<RistoratoreMenuItem[]>(initialMenuItems);
  const [categories, setCategories] = useState<string[]>([...DEFAULT_CATEGORIES]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tutti');
  const [servicePaused, setServicePaused] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  const [showServiceSuspendConfirm, setShowServiceSuspendConfirm] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [bulkActionFeedback, setBulkActionFeedback] = useState<string | null>(null);

  // Quick service suspension (Azioni Rapide)
  const [quickServiceSuspended, setQuickServiceSuspended] = useState<{
    all: boolean;
    takeaway: boolean;
    delivery: boolean;
    reservation: boolean;
  }>({ all: false, takeaway: false, delivery: false, reservation: false });

  const toggleQuickService = (key: 'all' | 'takeaway' | 'delivery' | 'reservation') => {
    setQuickServiceSuspended((prev) => {
      if (key === 'all') {
        const next = !prev.all;
        const updated = { all: next, takeaway: next, delivery: next, reservation: next };
        showFeedback(next ? 'Tutti i servizi sospesi (chiusura totale)' : 'Tutti i servizi riattivati');
        return updated;
      }
      const next = { ...prev, [key]: !prev[key] };
      // If any individual is toggled off, also turn off "all"
      if (prev[key]) next.all = false;
      // If all three individual are on, turn on "all" too
      if (next.takeaway && next.delivery && next.reservation) next.all = true;
      const labels: Record<string, string> = { takeaway: 'Asporto', delivery: 'Consegna', reservation: 'Prenotazione Tavoli' };
      showFeedback(next[key] ? `${labels[key]} sospeso` : `${labels[key]} riattivato`);
      return next;
    });
  };

  // Dish add/edit
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Service hours state
  const [serviceHours, setServiceHours] = useState<{
    pickup: Record<string, { enabled: boolean; suspended: boolean; lunch: { from: string; to: string }; dinner: { from: string; to: string } }>;
    delivery: Record<string, { enabled: boolean; suspended: boolean; lunch: { from: string; to: string }; dinner: { from: string; to: string } }>;
    reservation: Record<string, { enabled: boolean; suspended: boolean; lunch: { from: string; to: string }; dinner: { from: string; to: string } }>;
  }>(() => {
    const buildDays = () => {
      const h: Record<string, { enabled: boolean; suspended: boolean; lunch: { from: string; to: string }; dinner: { from: string; to: string } }> = {};
      DAYS.forEach((d) => {
        h[d] = { enabled: true, suspended: false, lunch: { from: '11:30', to: '14:30' }, dinner: { from: '19:00', to: '22:30' } };
      });
      h['Domenica'].enabled = false;
      return h;
    };
    return { pickup: buildDays(), delivery: buildDays(), reservation: buildDays() };
  });

  // Per-service global suspension
  const [serviceSuspended, setServiceSuspended] = useState<{ pickup: boolean; delivery: boolean; reservation: boolean }>({
    pickup: false, delivery: false, reservation: false,
  });

  const showFeedback = (msg: string) => {
    setBulkActionFeedback(msg);
    setTimeout(() => setBulkActionFeedback(null), 2500);
  };

  const toggleAvailability = (id: string) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, available: !item.available } : item));
  };

  const pauseAllDishes = () => {
    setItems((prev) => prev.map((item) => ({ ...item, available: false })));
    showFeedback('Tutti i piatti sono stati sospesi');
  };

  const resumeAllDishes = () => {
    setItems((prev) => prev.map((item) => ({ ...item, available: true })));
    showFeedback('Tutti i piatti sono stati riattivati');
  };

  const toggleCategoryVisibility = (category: string) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
        showFeedback(`Categoria "${category}" resa visibile`);
      } else {
        next.add(category);
        showFeedback(`Categoria "${category}" nascosta`);
      }
      return next;
    });
  };

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'Tutti' || item.category === activeCategory;
    const matchHidden = !hiddenCategories.has(item.category);
    return matchSearch && matchCat && matchHidden;
  });

  const availableCount = items.filter((i) => i.available).length;
  const suspendedCount = items.filter((i) => !i.available).length;

  const handlePauseToggle = () => {
    if (!servicePaused) {
      setShowPauseConfirm(true);
    } else {
      setServicePaused(false);
    }
  };

  const confirmPause = () => {
    setServicePaused(true);
    setShowPauseConfirm(false);
    setPauseReason('');
  };

  const confirmServiceSuspend = () => {
    setServicePaused(true);
    setShowServiceSuspendConfirm(false);
    setSuspendReason('');
    showFeedback('Servizio sospeso con successo');
  };

  // Dish management
  const addMenuItem = (draft: MenuItemDraft) => {
    const newItem: RistoratoreMenuItem = {
      id: `mi-${Date.now()}`,
      name: draft.name,
      category: draft.category,
      price: parseFloat(draft.price) || 0,
      description: draft.description,
      available: draft.available,
      image: draft.imageUrl,
      imageAlt: `Immagine di ${draft.name}`,
      allergens: draft.allergens,
      orders: 0,
      visibility: draft.visibility,
      visibilitySchedule: draft.visibilitySchedule,
      optionGroups: draft.optionGroups,
    };
    setItems((prev) => [...prev, newItem]);
    setShowAddItem(false);
    showFeedback(`"${draft.name}" aggiunto al menu`);
  };

  const saveEditItem = (draft: MenuItemDraft) => {
    setItems((prev) =>
      prev.map((m) =>
        m.id === draft.id
          ? {
              ...m,
              name: draft.name,
              category: draft.category,
              price: parseFloat(draft.price) || 0,
              description: draft.description,
              available: draft.available,
              image: draft.imageUrl || m.image,
              imageAlt: `Immagine di ${draft.name}`,
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

  const removeMenuItem = (id: string) => {
    setItems((prev) => prev.filter((m) => m.id !== id));
    showFeedback('Piatto rimosso dal menu');
  };

  const addCategory = (cat: string) => {
    setCategories((prev) => (prev.includes(cat) ? prev : [...prev, cat]));
  };

  // Service hours helpers
  const toggleServiceDay = (svc: 'pickup' | 'delivery' | 'reservation', day: string) => {
    setServiceHours((prev) => ({
      ...prev,
      [svc]: { ...prev[svc], [day]: { ...prev[svc][day], enabled: !prev[svc][day].enabled } },
    }));
  };

  const updateServiceHour = (svc: 'pickup' | 'delivery' | 'reservation', day: string, service: 'lunch' | 'dinner', field: 'from' | 'to', value: string) => {
    setServiceHours((prev) => ({
      ...prev,
      [svc]: {
        ...prev[svc],
        [day]: {
          ...prev[svc][day],
          [service]: { ...prev[svc][day][service], [field]: value },
        },
      },
    }));
  };

  const toggleServiceSuspension = (svc: 'pickup' | 'delivery' | 'reservation') => {
    setServiceSuspended((prev) => {
      const next = { ...prev, [svc]: !prev[svc] };
      showFeedback(next[svc] ? `Servizio ${svcLabel(svc)} sospeso` : `Servizio ${svcLabel(svc)} riattivato`);
      return next;
    });
  };

  const svcLabel = (svc: string) => {
    if (svc === 'pickup') return 'Ritiro';
    if (svc === 'delivery') return 'Consegna';
    return 'Prenotazione';
  };

  const handleSaveHours = () => {
    setSaved(true);
    showFeedback('Orari salvati con successo');
    setTimeout(() => setSaved(false), 2500);
  };

  const itemToDraft = (item: RistoratoreMenuItem): MenuItemDraft => ({
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.price.toString(),
    description: item.description,
    available: item.available,
    imageUrl: item.image,
    allergens: item.allergens,
    visibility: item.visibility || 'always',
    visibilitySchedule: item.visibilitySchedule || { from: '', to: '' },
    optionGroups: item.optionGroups || [],
  });

  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...categories])];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <RestaurantSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        activeSection="nav-menu"
        onSectionChange={() => {}}
        role="ristoratore"
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-card border-b border-border flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <span className="font-bold text-foreground text-base">Pizzeria Bella Napoli</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePauseToggle}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                servicePaused
                  ? 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]/30 hover:bg-green-100'
                  : 'bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]/30 hover:bg-amber-100'
              }`}
            >
              {servicePaused ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
              {servicePaused ? 'Riprendi Servizio' : 'Metti in Pausa'}
            </button>
            <button className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <Bell size={18} />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">G</div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-foreground leading-none">Giuseppe Esposito</p>
                <p className="text-xs text-muted-foreground mt-0.5">Ristoratore</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-screen-xl mx-auto px-6 lg:px-8 py-6 space-y-6">

            {/* Service paused banner */}
            {servicePaused && (
              <div className="bg-[var(--warning-bg)] border border-[var(--warning)]/30 rounded-xl p-4 flex items-center gap-3">
                <PauseCircle size={20} className="text-[var(--warning)] flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Servizio in pausa</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Il ristorante non accetta nuovi ordini. {pauseReason && `Motivo: ${pauseReason}`}
                  </p>
                </div>
                <button
                  onClick={() => setServicePaused(false)}
                  className="flex items-center gap-1.5 bg-[var(--warning)] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-600 transition-colors"
                >
                  <PlayCircle size={13} />
                  Riprendi
                </button>
              </div>
            )}

            {/* Bulk action feedback toast */}
            {bulkActionFeedback && (
              <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background text-sm font-semibold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2">
                <Zap size={14} />
                {bulkActionFeedback}
              </div>
            )}

            {/* Page header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Gestione Menu</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {availableCount} disponibili · {suspendedCount} sospesi
                  {hiddenCategories.size > 0 && ` · ${hiddenCategories.size} categorie nascoste`}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-4 shadow-card">
                <p className="text-xs text-muted-foreground font-medium">Totale piatti</p>
                <p className="text-2xl font-bold tabular-nums text-foreground mt-1">{items.length}</p>
              </div>
              <div className="bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-xl p-4">
                <p className="text-xs text-muted-foreground font-medium">Disponibili</p>
                <p className="text-2xl font-bold tabular-nums text-[var(--success)] mt-1">{availableCount}</p>
              </div>
              <div className="bg-[var(--warning-bg)] border border-[var(--warning)]/20 rounded-xl p-4">
                <p className="text-xs text-muted-foreground font-medium">Sospesi</p>
                <p className="text-2xl font-bold tabular-nums text-[var(--warning)] mt-1">{suspendedCount}</p>
              </div>
            </div>

            {/* ── TABS ── */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl w-fit">
              {([
                { id: 'piatti' as MenuTab, label: 'Piatti & Menu', icon: <UtensilsCrossed size={14} /> },
                { id: 'orari' as MenuTab, label: 'Orari & Servizi', icon: <Settings size={14} /> },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === tab.id ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* TAB: PIATTI */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'piatti' && (
              <>
                {/* ── BULK ACTIONS PANEL ── */}
                <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
                  <button
                    onClick={() => setBulkOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Zap size={16} className="text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-foreground">Azioni Rapide</p>
                        <p className="text-xs text-muted-foreground">Gestisci piatti, categorie e servizio in un click</p>
                      </div>
                    </div>
                    {bulkOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </button>

                  {bulkOpen && (
                    <div className="border-t border-border px-5 py-5 space-y-5">
                      {/* Row 1: Dish bulk toggles */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Disponibilità Piatti</p>
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={pauseAllDishes}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors active:scale-95"
                          >
                            <PauseCircle size={15} />
                            Sospendi tutti i piatti
                          </button>
                          <button
                            onClick={resumeAllDishes}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]/30 hover:bg-green-100 transition-colors active:scale-95"
                          >
                            <PlayCircle size={15} />
                            Riattiva tutti i piatti
                          </button>
                        </div>
                      </div>

                      {/* Row 2: Category visibility */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Visibilità Categorie</p>
                        <div className="flex flex-wrap gap-2">
                          {allCategories.map((cat) => {
                            const isHidden = hiddenCategories.has(cat);
                            return (
                              <button
                                key={`bulk-cat-${cat}`}
                                onClick={() => toggleCategoryVisibility(cat)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors active:scale-95 ${
                                  isHidden
                                    ? 'bg-muted text-muted-foreground border-border line-through opacity-60 hover:opacity-80'
                                    : 'bg-card text-foreground border-border hover:bg-muted'
                                }`}
                              >
                                {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                                {cat}
                              </button>
                            );
                          })}
                        </div>
                        {hiddenCategories.size > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {hiddenCategories.size} {hiddenCategories.size === 1 ? 'categoria nascosta' : 'categorie nascoste'} — i piatti non sono visibili ai clienti
                          </p>
                        )}
                      </div>

                      {/* Row 3: Service suspension */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sospensione Servizio</p>
                        <div className="space-y-2">
                          {([
                            { key: 'all' as const, label: 'Tutti', description: 'Chiusura totale (es. ferie)', icon: '🔒' },
                            { key: 'takeaway' as const, label: 'Asporto', description: 'Sospendi solo il ritiro', icon: '🛍️' },
                            { key: 'delivery' as const, label: 'Consegna', description: 'Sospendi solo la consegna', icon: '🛵' },
                            { key: 'reservation' as const, label: 'Prenotazione Tavoli', description: 'Sospendi solo le prenotazioni', icon: '🪑' },
                          ]).map((svc) => (
                            <div
                              key={svc.key}
                              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                                quickServiceSuspended[svc.key]
                                  ? 'bg-[var(--warning-bg)] border-[var(--warning)]/30'
                                  : 'bg-card border-border'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-base">{svc.icon}</span>
                                <div>
                                  <p className={`text-sm font-semibold ${quickServiceSuspended[svc.key] ? 'text-[var(--warning)]' : 'text-foreground'}`}>
                                    {svc.label}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{svc.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <span className={`text-xs font-medium ${quickServiceSuspended[svc.key] ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
                                  {quickServiceSuspended[svc.key] ? 'Sospeso' : 'Attivo'}
                                </span>
                                <Toggle
                                  checked={!quickServiceSuspended[svc.key]}
                                  onChange={() => toggleQuickService(svc.key)}
                                  size="sm"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Menu management */}
                <div className="bg-card rounded-xl border border-border shadow-card">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-5 py-4 border-b border-border">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Piatti del Menu</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Aggiungi, modifica o sospendi i piatti</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Cerca piatto..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="pl-8 pr-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring w-44 placeholder:text-muted-foreground"
                        />
                      </div>
                      <button
                        onClick={() => { setShowAddItem(true); setEditingItemId(null); }}
                        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#d43d22] transition-all active:scale-95 whitespace-nowrap"
                      >
                        <Plus size={15} />
                        Aggiungi Piatto
                      </button>
                    </div>
                  </div>

                  {/* Category filter */}
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-border overflow-x-auto scrollbar-hide">
                    {[...CATEGORIES_FILTER, ...categories.filter((c) => !DEFAULT_CATEGORIES.includes(c))].map((cat) => (
                      <button
                        key={`cat-filter-${cat}`}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                          activeCategory === cat ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-border'
                        }`}
                      >
                        {cat}
                        {cat !== 'Tutti' && hiddenCategories.has(cat) && <EyeOff size={10} className="inline ml-1 opacity-60" />}
                      </button>
                    ))}
                  </div>

                  {/* Add item form */}
                  {showAddItem && (
                    <div className="p-4 border-b border-border">
                      <ItemForm
                        item={emptyDraft()}
                        categories={allCategories}
                        onSave={addMenuItem}
                        onCancel={() => setShowAddItem(false)}
                        title="Nuovo Piatto"
                        saveLabel="Aggiungi al menu"
                        onAddCategory={addCategory}
                      />
                    </div>
                  )}

                  <div className="divide-y divide-border">
                    {filtered.length === 0 && (
                      <div className="py-16 text-center text-sm text-muted-foreground">
                        <UtensilsCrossed size={32} className="mx-auto text-muted-foreground mb-3" />
                        Nessun piatto trovato
                      </div>
                    )}
                    {filtered.map((item) =>
                      editingItemId === item.id ? (
                        <div key={item.id} className="p-4">
                          <ItemForm
                            item={itemToDraft(item)}
                            categories={allCategories}
                            onSave={saveEditItem}
                            onCancel={() => setEditingItemId(null)}
                            title={`Modifica: ${item.name}`}
                            saveLabel="Salva modifiche"
                            onAddCategory={addCategory}
                          />
                        </div>
                      ) : (
                        <div
                          key={item.id}
                          className={`flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors ${!item.available ? 'opacity-60' : ''}`}
                        >
                          <AppImage
                            src={item.image}
                            alt={item.imageAlt}
                            width={56}
                            height={56}
                            className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-border"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className="font-semibold text-sm text-foreground">{item.name}</span>
                              <Badge variant="neutral" className="text-[10px]">{item.category}</Badge>
                              {!item.available && (
                                <Badge variant="warning" className="text-[10px]">
                                  <AlertTriangle size={9} className="mr-0.5" />
                                  Sospeso
                                </Badge>
                              )}
                              {item.visibility === 'hidden' && (
                                <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <EyeOff size={9} />Nascosto
                                </span>
                              )}
                              {item.visibility === 'scheduled' && (
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Clock size={9} />Programmato
                                </span>
                              )}
                              {item.optionGroups && item.optionGroups.length > 0 && (
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  {item.optionGroups.length} opz.
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mb-1">{item.description}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.allergens.map((a) => (
                                <span key={`${item.id}-al-${a}`} className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">{a}</span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right">
                              <p className="font-bold tabular-nums text-foreground">€ {item.price.toFixed(2)}</p>
                              <p className="text-[10px] text-muted-foreground">{item.orders} ordini</p>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <Toggle checked={item.available} onChange={() => toggleAvailability(item.id)} size="sm" />
                              <span className="text-[10px] text-muted-foreground">{item.available ? 'Attivo' : 'Sospeso'}</span>
                            </div>
                            <button
                              onClick={() => { setEditingItemId(item.id); setShowAddItem(false); }}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                              title="Modifica piatto"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => removeMenuItem(item.id)}
                              className="p-1.5 rounded-lg hover:bg-[var(--danger-bg)] text-muted-foreground hover:text-[var(--danger)] transition-colors"
                              title="Elimina piatto"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* TAB: ORARI & SERVIZI */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'orari' && (
              <div className="space-y-6">
                {/* Save button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveHours}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                      saved
                        ? 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]/30'
                        : 'bg-primary text-white hover:bg-[#d43d22]'
                    }`}
                  >
                    {saved ? <Check size={15} /> : <Save size={15} />}
                    {saved ? 'Salvato!' : 'Salva orari'}
                  </button>
                </div>

                {/* Per-service sections */}
                {([
                  { key: 'pickup' as const, label: 'Ritiro', icon: '🛍️' },
                  { key: 'delivery' as const, label: 'Consegna', icon: '🛵' },
                  { key: 'reservation' as const, label: 'Prenotazione Tavolo', icon: '🪑' },
                ]).map((svc) => (
                  <div key={svc.key} className="space-y-3">
                    {/* Service header with suspension toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{svc.icon}</span>
                        <h3 className="text-sm font-semibold text-foreground">Orari {svc.label}</h3>
                        {serviceSuspended[svc.key] && (
                          <span className="text-xs bg-[var(--warning-bg)] text-[var(--warning)] px-2 py-0.5 rounded-full font-medium">
                            Sospeso
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => toggleServiceSuspension(svc.key)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                          serviceSuspended[svc.key]
                            ? 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]/30 hover:bg-green-100'
                            : 'bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]/30 hover:bg-amber-100'
                        }`}
                      >
                        {serviceSuspended[svc.key] ? <PlayCircle size={13} /> : <PauseCircle size={13} />}
                        {serviceSuspended[svc.key] ? `Riattiva ${svc.label}` : `Sospendi ${svc.label}`}
                      </button>
                    </div>

                    {serviceSuspended[svc.key] && (
                      <div className="bg-[var(--warning-bg)] border border-[var(--warning)]/30 rounded-xl px-4 py-3 flex items-center gap-2">
                        <PauseCircle size={15} className="text-[var(--warning)] flex-shrink-0" />
                        <p className="text-xs text-foreground font-medium">
                          Il servizio <strong>{svc.label}</strong> è attualmente sospeso e non è disponibile per i clienti.
                        </p>
                      </div>
                    )}

                    <div className={`bg-card border border-border rounded-xl overflow-hidden ${serviceSuspended[svc.key] ? 'opacity-50 pointer-events-none' : ''}`}>
                      {DAYS.map((day, idx) => (
                        <div key={day} className={`px-5 py-4 ${idx < DAYS.length - 1 ? 'border-b border-border' : ''}`}>
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="w-28 flex items-center gap-3 flex-shrink-0">
                              <Toggle
                                checked={serviceHours[svc.key][day].enabled}
                                onChange={() => toggleServiceDay(svc.key, day)}
                                size="sm"
                              />
                              <span className={`text-sm font-semibold ${serviceHours[svc.key][day].enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {day}
                              </span>
                            </div>
                            {serviceHours[svc.key][day].enabled ? (
                              <div className="flex flex-wrap items-center gap-4 flex-1">
                                {(['lunch', 'dinner'] as const).map((service) => (
                                  <div key={service} className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground font-medium w-12">
                                      {service === 'lunch' ? 'Pranzo' : 'Cena'}
                                    </span>
                                    <input
                                      type="time"
                                      value={serviceHours[svc.key][day][service].from}
                                      onChange={(e) => updateServiceHour(svc.key, day, service, 'from', e.target.value)}
                                      className="px-2 py-1.5 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <span className="text-xs text-muted-foreground">–</span>
                                    <input
                                      type="time"
                                      value={serviceHours[svc.key][day][service].to}
                                      onChange={(e) => updateServiceHour(svc.key, day, service, 'to', e.target.value)}
                                      className="px-2 py-1.5 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">Non disponibile</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Pause confirm modal (topbar button) */}
      {showPauseConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-modal max-w-md w-full p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--warning-bg)] flex items-center justify-center flex-shrink-0">
                <PauseCircle size={20} className="text-[var(--warning)]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Metti in pausa il servizio?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Il ristorante non accetterà nuovi ordini finché non riprendi il servizio.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Motivo (opzionale)</label>
              <input
                type="text"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="es. Cucina in manutenzione, personale ridotto..."
                className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={confirmPause}
                className="flex-1 flex items-center justify-center gap-2 bg-[var(--warning)] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-600 transition-all"
              >
                <PauseCircle size={15} />
                Conferma pausa
              </button>
              <button
                onClick={() => setShowPauseConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors border border-border"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service suspend confirm modal (bulk actions) */}
      {showServiceSuspendConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-modal max-w-md w-full p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--warning-bg)] flex items-center justify-center flex-shrink-0">
                <PauseCircle size={20} className="text-[var(--warning)]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Sospendi il servizio?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Il ristorante non accetterà nuovi ordini finché non riprendi il servizio.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Motivo (opzionale)</label>
              <input
                type="text"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="es. Cucina chiusa, evento privato..."
                className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={confirmServiceSuspend}
                className="flex-1 flex items-center justify-center gap-2 bg-[var(--warning)] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-600 transition-all"
              >
                <PauseCircle size={15} />
                Conferma sospensione
              </button>
              <button
                onClick={() => setShowServiceSuspendConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors border border-border"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}