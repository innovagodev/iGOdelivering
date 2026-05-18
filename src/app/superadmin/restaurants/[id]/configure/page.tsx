'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import {
  ArrowLeft,
  Bell,
  Store,
  MapPin,
  Clock,
  UtensilsCrossed,
  Check,
  Save,
  Globe,
  Phone,
  Mail,
  FileText,
  ChevronDown,
  Plus,
  Trash2,
  Euro,
  Upload,
  Users,
  Pencil,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import Toggle from '@/components/ui/Toggle';
import AppImage from '@/components/ui/AppImage';

type ConfigTab = 'info' | 'delivery' | 'hours' | 'menu';
type VisibilityType = 'always' | 'hidden' | 'scheduled';

const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const DEFAULT_CATEGORIES = [
  'Antipasti',
  'Primi',
  'Secondi',
  'Pizza',
  'Contorni',
  'Dolci',
  'Bevande',
];
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
const RESTAURANT_CATEGORIES = [
  'Pizzeria',
  'Trattoria',
  'Ristorante',
  'Osteria',
  'Sushi',
  'Cinese',
  'Messicano',
  'Indiano',
  'Burger',
  'Kebab',
  'Poke',
  'Altro',
];

const mockRestaurants = [
  {
    id: 'r-001',
    name: 'Pizzeria Bella Napoli',
    category: 'Pizzeria',
    description: 'Autentica pizzeria napoletana nel cuore di Napoli.',
    phone: '+39 081 123 4567',
    email: 'giuseppe@bellanapoli.it',
    website: 'https://www.bellanapoli.it',
    address: 'Via Toledo 45',
    city: 'Napoli',
    province: 'NA',
    cap: '80132',
    vatNumber: 'IT12345678901',
    status: 'published',
  },
  {
    id: 'r-002',
    name: 'Trattoria da Mario',
    category: 'Trattoria',
    description: 'Cucina tradizionale romana.',
    phone: '+39 06 987 6543',
    email: 'mario@trattoriamario.it',
    website: 'https://www.trattoriamario.it',
    address: 'Corso Umberto I 12',
    city: 'Roma',
    province: 'RM',
    cap: '00100',
    vatNumber: 'IT98765432101',
    status: 'published',
  },
  {
    id: 'r-003',
    name: 'Sushi Zen',
    category: 'Giapponese',
    description: 'Sushi autentico giapponese.',
    phone: '+39 02 555 7890',
    email: 'kenji@sushizen.it',
    website: 'https://www.sushizen.it',
    address: 'Via Montenapoleone 8',
    city: 'Milano',
    province: 'MI',
    cap: '20121',
    vatNumber: 'IT11223344556',
    status: 'draft',
  },
  {
    id: 'r-004',
    name: 'Osteria del Porto',
    category: 'Osteria',
    description: 'Pesce fresco e cucina marinara.',
    phone: '+39 081 456 7890',
    email: 'lucia@osteriaporto.it',
    website: 'https://www.osteriaporto.it',
    address: 'Lungomare Caracciolo 22',
    city: 'Napoli',
    province: 'NA',
    cap: '80122',
    vatNumber: 'IT66778899001',
    status: 'suspended',
  },
];

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

const tabs: { id: ConfigTab; label: string; icon: React.ReactNode }[] = [
  { id: 'info', label: 'Informazioni', icon: <Store size={15} /> },
  { id: 'delivery', label: 'Consegna', icon: <MapPin size={15} /> },
  { id: 'hours', label: 'Orari', icon: <Clock size={15} /> },
  { id: 'menu', label: 'Menu', icon: <UtensilsCrossed size={15} /> },
];

const emptyItem = (): MenuItemDraft => ({
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
                className="px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring min-w-0 w-[110px] appearance-none"
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
                className="px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring min-w-0 w-[110px] appearance-none"
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

export default function RestaurantConfigurePage() {
  const params = useParams();
  const restaurantId = params?.id as string;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<ConfigTab>('info');
  const [saved, setSaved] = useState(false);

  // Initialize from mockRestaurants (SSR-safe), then hydrate from localStorage in useEffect
  const initialRestaurant =
    mockRestaurants.find((r) => r.id === restaurantId) || mockRestaurants[0];

  const [restaurantName, setRestaurantName] = useState(initialRestaurant?.name || 'Ristorante');
  const [restaurantStatus, setRestaurantStatus] = useState(
    (initialRestaurant as { status?: string })?.status || 'draft'
  );

  const [info, setInfo] = useState({
    name: initialRestaurant?.name || '',
    category: initialRestaurant?.category || 'Pizzeria',
    description: (initialRestaurant as { description?: string })?.description || '',
    phone: (initialRestaurant as { phone?: string })?.phone || '',
    email: (initialRestaurant as { email?: string })?.email || '',
    website: (initialRestaurant as { website?: string })?.website || '',
    address: (initialRestaurant as { address?: string })?.address || '',
    city: (initialRestaurant as { city?: string })?.city || '',
    province: (initialRestaurant as { province?: string })?.province || '',
    cap: (initialRestaurant as { cap?: string })?.cap || '',
    vatNumber: (initialRestaurant as { vatNumber?: string })?.vatNumber || '',
  });

  // After mount, check localStorage for a more up-to-date record
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('gloriaorder_restaurants') || '[]') as Array<{
        id: string;
        name: string;
        category?: string;
        status?: string;
        description?: string;
        phone?: string;
        email?: string;
        website?: string;
        address?: string;
        city?: string;
        province?: string;
        cap?: string;
        vatNumber?: string;
        hours?: Record<
          string,
          {
            open: boolean;
            lunch: { from: string; to: string };
            dinner: { from: string; to: string };
          }
        >;
        serviceHours?: Record<string, Record<string, unknown>>;
        zones?: {
          id: string;
          name: string;
          radius: number;
          minOrder: number;
          deliveryFee: number;
          freeDeliveryThreshold: number;
          enabled: boolean;
        }[];
        [key: string]: unknown;
      }>;
      const found = stored.find((r) => r.id === restaurantId);
      if (found) {
        setRestaurantName(found.name || 'Ristorante');
        setRestaurantStatus(found.status || 'draft');
        setInfo({
          name: found.name || '',
          category: found.category || 'Pizzeria',
          description: found.description || '',
          phone: found.phone || '',
          email: found.email || '',
          website: found.website || '',
          address: found.address || '',
          city: found.city || '',
          province: found.province || '',
          cap: found.cap || '',
          vatNumber: found.vatNumber || '',
        });
        if (found.hours)
          setHours(
            found.hours as Record<
              string,
              {
                open: boolean;
                lunch: { from: string; to: string };
                dinner: { from: string; to: string };
              }
            >
          );
        if (found.serviceHours) {
          // Migrate old flat format {enabled, from, to} to new {enabled, lunch, dinner} format
          const migrateServiceDays = (days: Record<string, unknown>) => {
            const result: Record<
              string,
              {
                enabled: boolean;
                lunch: { from: string; to: string };
                dinner: { from: string; to: string };
              }
            > = {};
            DAYS.forEach((d) => {
              const raw = days[d] as Record<string, unknown> | undefined;
              if (!raw) {
                result[d] = {
                  enabled: true,
                  lunch: { from: '11:30', to: '14:30' },
                  dinner: { from: '19:00', to: '22:30' },
                };
              } else if (raw.lunch && raw.dinner) {
                // Already new format
                result[d] = raw as {
                  enabled: boolean;
                  lunch: { from: string; to: string };
                  dinner: { from: string; to: string };
                };
              } else {
                // Old flat format: migrate from/to into both lunch and dinner
                const from = (raw.from as string) || '11:30';
                const to = (raw.to as string) || '22:30';
                result[d] = {
                  enabled: (raw.enabled as boolean) ?? true,
                  lunch: { from, to: '14:30' },
                  dinner: { from: '19:00', to },
                };
              }
            });
            return result;
          };
          const sh = found.serviceHours as Record<string, Record<string, unknown>>;
          setServiceHours({
            pickup: migrateServiceDays(sh.pickup || {}),
            delivery: migrateServiceDays(sh.delivery || {}),
            reservation: migrateServiceDays(sh.reservation || {}),
          });
        }
        if (found.zones)
          setZones(
            found.zones as {
              id: string;
              name: string;
              radius: number;
              minOrder: number;
              deliveryFee: number;
              freeDeliveryThreshold: number;
              enabled: boolean;
            }[]
          );
        if (found.menuItems && Array.isArray(found.menuItems)) {
          setMenuItems(found.menuItems as MenuItemDraft[]);
        }
        if (found.menuCategories && Array.isArray(found.menuCategories)) {
          setCategories(found.menuCategories as string[]);
        }
      }
    } catch {}
  }, [restaurantId]);

  const statusLabel: Record<string, string> = {
    published: 'Pubblicato',
    draft: 'Bozza',
    suspended: 'Sospeso',
  };

  const [zones, setZones] = useState([
    {
      id: 'z-1',
      name: 'Zona Centro',
      radius: 3,
      minOrder: 15,
      deliveryFee: 2.5,
      freeDeliveryThreshold: 35,
      enabled: true,
    },
    {
      id: 'z-2',
      name: 'Zona Periferica',
      radius: 7,
      minOrder: 25,
      deliveryFee: 4.0,
      freeDeliveryThreshold: 50,
      enabled: true,
    },
  ]);

  const defaultHours = () => {
    const h: Record<
      string,
      { open: boolean; lunch: { from: string; to: string }; dinner: { from: string; to: string } }
    > = {};
    DAYS.forEach((d) => {
      h[d] = {
        open: true,
        lunch: { from: '12:00', to: '14:30' },
        dinner: { from: '19:00', to: '22:30' },
      };
    });
    h['Domenica'].open = false;
    return h;
  };

  const defaultServiceHours = () => {
    const h: Record<
      string,
      {
        enabled: boolean;
        lunch: { from: string; to: string };
        dinner: { from: string; to: string };
      }
    > = {};
    DAYS.forEach((d) => {
      h[d] = {
        enabled: true,
        lunch: { from: '11:30', to: '14:30' },
        dinner: { from: '19:00', to: '22:30' },
      };
    });
    h['Domenica'].enabled = false;
    return h;
  };

  const [hours, setHours] = useState(defaultHours());
  const [serviceHours, setServiceHours] = useState<{
    pickup: Record<
      string,
      {
        enabled: boolean;
        lunch: { from: string; to: string };
        dinner: { from: string; to: string };
      }
    >;
    delivery: Record<
      string,
      {
        enabled: boolean;
        lunch: { from: string; to: string };
        dinner: { from: string; to: string };
      }
    >;
    reservation: Record<
      string,
      {
        enabled: boolean;
        lunch: { from: string; to: string };
        dinner: { from: string; to: string };
      }
    >;
  }>({
    pickup: defaultServiceHours(),
    delivery: defaultServiceHours(),
    reservation: defaultServiceHours(),
  });
  const [categories, setCategories] = useState<string[]>([...DEFAULT_CATEGORIES]);

  const [menuItems, setMenuItems] = useState<MenuItemDraft[]>([]);

  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const addZone = () => {
    setZones((prev) => [
      ...prev,
      {
        id: `z-${Date.now()}`,
        name: 'Nuova Zona',
        radius: 5,
        minOrder: 20,
        deliveryFee: 3,
        freeDeliveryThreshold: 40,
        enabled: true,
      },
    ]);
  };
  const removeZone = (id: string) => setZones((prev) => prev.filter((z) => z.id !== id));
  const updateZone = (id: string, field: string, value: string | number | boolean) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, [field]: value } : z)));
  };
  const toggleDay = (day: string) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], open: !prev[day].open } }));
  };
  const updateHour = (
    day: string,
    service: 'lunch' | 'dinner',
    field: 'from' | 'to',
    value: string
  ) => {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [service]: { ...prev[day][service], [field]: value } },
    }));
  };

  const toggleServiceDay = (svc: 'pickup' | 'delivery' | 'reservation', day: string) => {
    setServiceHours((prev) => ({
      ...prev,
      [svc]: { ...prev[svc], [day]: { ...prev[svc][day], enabled: !prev[svc][day].enabled } },
    }));
  };
  const updateServiceHour = (
    svc: 'pickup' | 'delivery' | 'reservation',
    day: string,
    service: 'lunch' | 'dinner',
    field: 'from' | 'to',
    value: string
  ) => {
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

  const addMenuItem = (item: MenuItemDraft) => {
    setMenuItems((prev) => [...prev, { ...item, id: `mi-${Date.now()}` }]);
    setShowAddItem(false);
  };

  const saveEditItem = (updated: MenuItemDraft) => {
    setMenuItems((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    setEditingItemId(null);
  };

  const removeMenuItem = (id: string) => setMenuItems((prev) => prev.filter((m) => m.id !== id));
  const toggleItemAvailability = (id: string) => {
    setMenuItems((prev) => prev.map((m) => (m.id === id ? { ...m, available: !m.available } : m)));
  };

  const handleSave = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('gloriaorder_restaurants') || '[]') as Array<
        Record<string, unknown>
      >;
      const idx = stored.findIndex((r) => r.id === restaurantId);
      const updated = {
        ...(idx >= 0 ? stored[idx] : {}),
        id: restaurantId,
        ...info,
        status: restaurantStatus,
        hours,
        serviceHours,
        zones,
        menuItems,
        menuCategories: categories,
      };
      if (idx >= 0) {
        stored[idx] = updated;
      } else {
        stored.push(updated);
      }
      localStorage.setItem('gloriaorder_restaurants', JSON.stringify(stored));
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const addCategory = (cat: string) => {
    setCategories((prev) => (prev.includes(cat) ? prev : [...prev, cat]));
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        activeSection="nav-ristoranti"
        onSectionChange={() => {}}
        role="superadmin"
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-card border-b border-border flex items-center px-6 gap-4 flex-shrink-0">
          <Link
            href="/superadmin/restaurants"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
          >
            <ArrowLeft size={16} />
            Ristoranti
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-semibold text-foreground">{restaurantName}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm text-muted-foreground">Configura</span>
          <div className="flex-1" />
          <Link
            href={`/superadmin/restaurants/${restaurantId}/access`}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border"
          >
            <Users size={15} />
            Accessi
          </Link>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
              saved
                ? 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]/30'
                : 'bg-primary text-white hover:bg-[#d43d22]'
            }`}
          >
            {saved ? <Check size={15} /> : <Save size={15} />}
            {saved ? 'Salvato!' : 'Salva modifiche'}
          </button>
          <button className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Bell size={18} />
          </button>
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
              A
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Configura Ristorante</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {restaurantName} · {statusLabel[restaurantStatus] || restaurantStatus}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-card text-foreground shadow-card'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab: Info */}
            {activeTab === 'info' && (
              <div className="bg-card border border-border rounded-xl p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Nome Ristorante
                    </label>
                    <div className="relative">
                      <Store
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <input
                        type="text"
                        value={info.name}
                        onChange={(e) => setInfo((p) => ({ ...p, name: e.target.value }))}
                        className="w-full pl-9 pr-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Categoria
                    </label>
                    <div className="relative">
                      <select
                        value={info.category}
                        onChange={(e) => setInfo((p) => ({ ...p, category: e.target.value }))}
                        className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                      >
                        {RESTAURANT_CATEGORIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      P. IVA
                    </label>
                    <div className="relative">
                      <FileText
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <input
                        type="text"
                        value={info.vatNumber}
                        onChange={(e) => setInfo((p) => ({ ...p, vatNumber: e.target.value }))}
                        className="w-full pl-9 pr-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Descrizione
                    </label>
                    <textarea
                      value={info.description}
                      onChange={(e) => setInfo((p) => ({ ...p, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>
                </div>
                <div className="border-t border-border pt-5">
                  <p className="text-sm font-semibold text-foreground mb-4">Indirizzo</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                        Via / Piazza
                      </label>
                      <div className="relative">
                        <MapPin
                          size={15}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                          type="text"
                          value={info.address}
                          onChange={(e) => setInfo((p) => ({ ...p, address: e.target.value }))}
                          className="w-full pl-9 pr-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                        Città
                      </label>
                      <input
                        type="text"
                        value={info.city}
                        onChange={(e) => setInfo((p) => ({ ...p, city: e.target.value }))}
                        className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                          Provincia
                        </label>
                        <input
                          type="text"
                          value={info.province}
                          onChange={(e) => setInfo((p) => ({ ...p, province: e.target.value }))}
                          maxLength={2}
                          className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                          CAP
                        </label>
                        <input
                          type="text"
                          value={info.cap}
                          onChange={(e) => setInfo((p) => ({ ...p, cap: e.target.value }))}
                          maxLength={5}
                          className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border pt-5">
                  <p className="text-sm font-semibold text-foreground mb-4">Contatti</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                        Telefono
                      </label>
                      <div className="relative">
                        <Phone
                          size={15}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                          type="tel"
                          value={info.phone}
                          onChange={(e) => setInfo((p) => ({ ...p, phone: e.target.value }))}
                          className="w-full pl-9 pr-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                        Email
                      </label>
                      <div className="relative">
                        <Mail
                          size={15}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                          type="email"
                          value={info.email}
                          onChange={(e) => setInfo((p) => ({ ...p, email: e.target.value }))}
                          className="w-full pl-9 pr-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                        Sito web
                      </label>
                      <div className="relative">
                        <Globe
                          size={15}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                          type="url"
                          value={info.website}
                          onChange={(e) => setInfo((p) => ({ ...p, website: e.target.value }))}
                          className="w-full pl-9 pr-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Delivery */}
            {activeTab === 'delivery' && (
              <div className="space-y-4">
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    className="bg-card border border-border rounded-xl p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Toggle
                          checked={zone.enabled}
                          onChange={() => updateZone(zone.id, 'enabled', !zone.enabled)}
                          size="sm"
                        />
                        <input
                          type="text"
                          value={zone.name}
                          onChange={(e) => updateZone(zone.id, 'name', e.target.value)}
                          className="font-semibold text-sm text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5"
                        />
                      </div>
                      <button
                        onClick={() => removeZone(zone.id)}
                        className="p-1.5 rounded-lg hover:bg-[var(--danger-bg)] text-muted-foreground hover:text-[var(--danger)] transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: 'Raggio (km)', field: 'radius', value: zone.radius },
                        { label: 'Ordine min. (€)', field: 'minOrder', value: zone.minOrder },
                        {
                          label: 'Costo consegna (€)',
                          field: 'deliveryFee',
                          value: zone.deliveryFee,
                        },
                        {
                          label: 'Gratis da (€)',
                          field: 'freeDeliveryThreshold',
                          value: zone.freeDeliveryThreshold,
                        },
                      ].map((f) => (
                        <div key={f.field}>
                          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                            {f.label}
                          </label>
                          <input
                            type="number"
                            value={f.value}
                            onChange={(e) =>
                              updateZone(zone.id, f.field, parseFloat(e.target.value) || 0)
                            }
                            min={0}
                            step={0.5}
                            className="w-full px-3 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button
                  onClick={addZone}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-4 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Plus size={16} />
                  Aggiungi zona di consegna
                </button>
              </div>
            )}

            {/* Tab: Hours */}
            {activeTab === 'hours' && (
              <div className="space-y-6">
                {/* Main opening hours */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Orari di apertura principali
                  </h3>
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    {DAYS.map((day, idx) => (
                      <div
                        key={day}
                        className={`px-5 py-4 ${idx < DAYS.length - 1 ? 'border-b border-border' : ''}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-28 flex items-center gap-3 flex-shrink-0">
                            <Toggle
                              checked={hours[day].open}
                              onChange={() => toggleDay(day)}
                              size="sm"
                            />
                            <span
                              className={`text-sm font-semibold ${hours[day].open ? 'text-foreground' : 'text-muted-foreground'}`}
                            >
                              {day}
                            </span>
                          </div>
                          {hours[day].open ? (
                            <div className="flex flex-wrap items-center gap-4 flex-1">
                              {(['lunch', 'dinner'] as const).map((service) => (
                                <div key={service} className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground font-medium w-12">
                                    {service === 'lunch' ? 'Pranzo' : 'Cena'}
                                  </span>
                                  <input
                                    type="time"
                                    value={hours[day][service].from}
                                    onChange={(e) =>
                                      updateHour(day, service, 'from', e.target.value)
                                    }
                                    className="px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring min-w-0 w-[110px] appearance-none"
                                  />
                                  <span className="text-xs text-muted-foreground">–</span>
                                  <input
                                    type="time"
                                    value={hours[day][service].to}
                                    onChange={(e) => updateHour(day, service, 'to', e.target.value)}
                                    className="px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring min-w-0 w-[110px] appearance-none"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Chiuso</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Service hours */}
                {(
                  [
                    { key: 'pickup', label: 'Orari Ritiro' },
                    { key: 'delivery', label: 'Orari Consegna' },
                    { key: 'reservation', label: 'Orari Prenotazione tavolo' },
                  ] as { key: 'pickup' | 'delivery' | 'reservation'; label: string }[]
                ).map((svc) => (
                  <div key={svc.key}>
                    <h3 className="text-sm font-semibold text-foreground mb-3">{svc.label}</h3>
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      {DAYS.map((day, idx) => (
                        <div
                          key={day}
                          className={`px-5 py-4 ${idx < DAYS.length - 1 ? 'border-b border-border' : ''}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-28 flex items-center gap-3 flex-shrink-0">
                              <Toggle
                                checked={serviceHours[svc.key][day].enabled}
                                onChange={() => toggleServiceDay(svc.key, day)}
                                size="sm"
                              />
                              <span
                                className={`text-sm font-semibold ${serviceHours[svc.key][day].enabled ? 'text-foreground' : 'text-muted-foreground'}`}
                              >
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
                                      onChange={(e) =>
                                        updateServiceHour(
                                          svc.key,
                                          day,
                                          service,
                                          'from',
                                          e.target.value
                                        )
                                      }
                                      className="px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring min-w-0 w-[110px] appearance-none"
                                    />
                                    <span className="text-xs text-muted-foreground">–</span>
                                    <input
                                      type="time"
                                      value={serviceHours[svc.key][day][service].to}
                                      onChange={(e) =>
                                        updateServiceHour(
                                          svc.key,
                                          day,
                                          service,
                                          'to',
                                          e.target.value
                                        )
                                      }
                                      className="px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring min-w-0 w-[110px] appearance-none"
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">
                                Non disponibile
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Menu */}
            {activeTab === 'menu' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {menuItems.length} piatti nel menu
                  </p>
                  <button
                    onClick={() => {
                      setShowAddItem(true);
                      setEditingItemId(null);
                    }}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#d43d22] transition-all active:scale-95"
                  >
                    <Plus size={16} />
                    Aggiungi Piatto
                  </button>
                </div>

                {showAddItem && (
                  <ItemForm
                    item={emptyItem()}
                    categories={categories}
                    onSave={addMenuItem}
                    onCancel={() => setShowAddItem(false)}
                    title="Nuovo Piatto"
                    saveLabel="Aggiungi al menu"
                    onAddCategory={addCategory}
                  />
                )}

                <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
                  {menuItems.length === 0 && (
                    <div className="py-16 text-center text-sm text-muted-foreground">
                      <UtensilsCrossed size={32} className="mx-auto text-muted-foreground mb-3" />
                      Nessun piatto nel menu
                    </div>
                  )}
                  {menuItems.map((item) =>
                    editingItemId === item.id ? (
                      <div key={item.id} className="p-4">
                        <ItemForm
                          item={item}
                          categories={categories}
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
                        {item.imageUrl ? (
                          <AppImage
                            src={item.imageUrl}
                            alt={`Immagine di ${item.name}`}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-border"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <UtensilsCrossed size={18} className="text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">
                              {item.name}
                            </span>
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              {item.category}
                            </span>
                            {!item.available && (
                              <span className="text-xs bg-[var(--warning-bg)] text-[var(--warning)] px-2 py-0.5 rounded-full">
                                Sospeso
                              </span>
                            )}
                            {item.visibility === 'hidden' && (
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                                <EyeOff size={10} />
                                Nascosto
                              </span>
                            )}
                            {item.visibility === 'scheduled' && (
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Clock size={10} />
                                Programmato
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <span className="font-bold text-sm tabular-nums text-foreground flex-shrink-0">
                          € {parseFloat(item.price || '0').toFixed(2)}
                        </span>
                        <Toggle
                          checked={item.available}
                          onChange={() => toggleItemAvailability(item.id)}
                          size="sm"
                        />
                        <button
                          onClick={() => {
                            setEditingItemId(item.id);
                            setShowAddItem(false);
                          }}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                          title="Modifica piatto"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => removeMenuItem(item.id)}
                          className="p-1.5 rounded-lg hover:bg-[var(--danger-bg)] text-muted-foreground hover:text-[var(--danger)] transition-colors flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
