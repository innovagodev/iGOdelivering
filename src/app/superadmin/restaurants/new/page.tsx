'use client';
import React, { useState, useRef } from 'react';
import Link from 'next/link';
import RestaurantSidebar from '@/components/RestaurantSidebar';
import {
  ArrowLeft, ArrowRight, Check, Store, MapPin, Clock, UtensilsCrossed,
  Bell, Plus, Trash2, Upload, Euro, Globe, Phone, Mail, FileText, ChevronDown, CheckCircle,
  ChevronUp, Settings, Calendar, Eye, EyeOff, X, Edit2
} from 'lucide-react';
import Toggle from '@/components/ui/Toggle';


type WizardStep = 'info' | 'delivery' | 'hours' | 'scheduled' | 'menu' | 'review';

interface RestaurantInfo {
  name: string;
  category: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  province: string;
  cap: string;
  vatNumber: string;
  logoUrl: string;
  backgroundImageUrl: string;
}

interface DeliveryZone {
  id: string;
  name: string;
  radius: number;
  minOrder: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  enabled: boolean;
}

interface DayHours {
  open: boolean;
  lunch: { from: string; to: string };
  dinner: { from: string; to: string };
}

interface ServiceHours {
  useCustom: boolean;
  hours: Record<string, DayHours>;
}

interface TableBookingConfig {
  enabled: boolean;
  maxGuests: number;
  slotDuration: number;
  advanceBookingDays: number;
  serviceEnabled: boolean;
}

interface ScheduledOrdersConfig {
  enabled: boolean;
  pickup: { minNoticeValue: number; minNoticeUnit: string; maxNoticeDays: number };
  delivery: { minNoticeValue: number; minNoticeUnit: string; maxNoticeDays: number; timeWindowMinutes: number };
  onPremise: { minNoticeValue: number; minNoticeUnit: string; maxNoticeDays: number };
  hideAsap: boolean;
  pickupExpanded: boolean;
  deliveryExpanded: boolean;
  onPremiseExpanded: boolean;
  altroExpanded: boolean;
}

interface OptionChoice {
  id: string;
  name: string;
  price: number;
}

interface OptionGroup {
  id: string;
  name: string;
  choices: OptionChoice[];
  appliedTo: string[]; // category names or 'all'
}

type VisibilityMode = 'always' | 'hidden' | 'time_range' | 'date_range';

interface DishVisibility {
  mode: VisibilityMode;
  timeFrom: string;
  timeTo: string;
  days: string[];
  dateFrom: string;
  dateFromTime: string;
  dateTo: string;
  dateToTime: string;
}

interface MenuItemDraft {
  id: string;
  name: string;
  category: string;
  price: string;
  description: string;
  available: boolean;
  imageUrl: string;
  imageFile: File | null;
  allergens: string[];
  optionGroups: string[];
  visibility: DishVisibility;
}

const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const DEFAULT_CATEGORIES = ['Antipasti', 'Primi', 'Secondi', 'Pizza', 'Contorni', 'Dolci', 'Bevande'];
const ALLERGENS_LIST = ['Glutine', 'Latte', 'Uova', 'Pesce', 'Crostacei', 'Arachidi', 'Soia', 'Frutta a guscio', 'Sedano', 'Senape', 'Sesamo', 'Lupini', 'Molluschi', 'Anidride solforosa'];
const RESTAURANT_CATEGORIES = ['Pizzeria', 'Trattoria', 'Ristorante', 'Osteria', 'Sushi', 'Cinese', 'Messicano', 'Indiano', 'Burger', 'Kebab', 'Poke', 'Altro'];
const TIME_UNITS = ['minuti', 'ore'];
const TIME_WINDOWS = ['5 minuti', '10 minuti', '15 minuti', '20 minuti', '30 minuti', '45 minuti', '60 minuti'];

const steps: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
  { id: 'info', label: 'Informazioni', icon: <Store size={16} /> },
  { id: 'delivery', label: 'Consegna', icon: <MapPin size={16} /> },
  { id: 'hours', label: 'Orari', icon: <Clock size={16} /> },
  { id: 'scheduled', label: 'Programmati', icon: <Calendar size={16} /> },
  { id: 'menu', label: 'Menu', icon: <UtensilsCrossed size={16} /> },
  { id: 'review', label: 'Pubblica', icon: <Check size={16} /> },
];

const defaultDayHours = (): Record<string, DayHours> => {
  const h: Record<string, DayHours> = {};
  DAYS.forEach((d) => {
    h[d] = { open: true, lunch: { from: '12:00', to: '14:30' }, dinner: { from: '19:00', to: '22:30' } };
  });
  h['Domenica'].open = false;
  return h;
};

const defaultServiceHours = (): ServiceHours => ({
  useCustom: false,
  hours: defaultDayHours(),
});

const defaultVisibility = (): DishVisibility => ({
  mode: 'always',
  timeFrom: '10:00',
  timeTo: '15:00',
  days: [...DAYS],
  dateFrom: '',
  dateFromTime: '10:00',
  dateTo: '',
  dateToTime: '15:00',
});

export default function NewRestaurantPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>('info');
  const [published, setPublished] = useState(false);

  const [info, setInfo] = useState<RestaurantInfo>({
    name: '', category: 'Pizzeria', description: '', phone: '', email: '', website: '',
    address: '', city: '', province: '', cap: '', vatNumber: '',
    logoUrl: '', backgroundImageUrl: '',
  });

  const [zones, setZones] = useState<DeliveryZone[]>([
    { id: 'z-1', name: 'Zona Centro', radius: 3, minOrder: 15, deliveryFee: 2.50, freeDeliveryThreshold: 35, enabled: true },
  ]);

  const [hours, setHours] = useState<Record<string, DayHours>>(defaultDayHours());

  // Per-service hours (Feature 2)
  const [pickupHours, setPickupHours] = useState<ServiceHours>(defaultServiceHours());
  const [deliveryHours, setDeliveryHours] = useState<ServiceHours>(defaultServiceHours());
  const [bookingHours, setBookingHours] = useState<ServiceHours>(defaultServiceHours());

  // Table booking (Feature 1)
  const [tableBooking, setTableBooking] = useState<TableBookingConfig>({
    enabled: false,
    maxGuests: 8,
    slotDuration: 90,
    advanceBookingDays: 30,
    serviceEnabled: true,
  });

  // Scheduled orders (Feature 3)
  const [scheduledOrders, setScheduledOrders] = useState<ScheduledOrdersConfig>({
    enabled: true,
    pickup: { minNoticeValue: 30, minNoticeUnit: 'minuti', maxNoticeDays: 4 },
    delivery: { minNoticeValue: 1, minNoticeUnit: 'ore', maxNoticeDays: 4, timeWindowMinutes: 15 },
    onPremise: { minNoticeValue: 30, minNoticeUnit: 'minuti', maxNoticeDays: 1 },
    hideAsap: false,
    pickupExpanded: true,
    deliveryExpanded: true,
    onPremiseExpanded: true,
    altroExpanded: true,
  });

  // Menu categories (Feature 4 - custom category)
  const [menuCategories, setMenuCategories] = useState<string[]>([...DEFAULT_CATEGORIES]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Option groups (Feature 4 - opzioni aggiuntivi)
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupChoices, setNewGroupChoices] = useState<OptionChoice[]>([{ id: 'c-1', name: '', price: 0 }]);

  // Edit state for option groups
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupChoices, setEditGroupChoices] = useState<OptionChoice[]>([]);

  const [menuItems, setMenuItems] = useState<MenuItemDraft[]>([]);
  const [newItem, setNewItem] = useState<MenuItemDraft>({
    id: '', name: '', category: 'Pizza', price: '', description: '', available: true,
    imageUrl: '', imageFile: null, allergens: [], optionGroups: [], visibility: defaultVisibility(),
  });
  const [showAddItem, setShowAddItem] = useState(false);
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);

  const stepOrder: WizardStep[] = ['info', 'delivery', 'hours', 'scheduled', 'menu', 'review'];
  const currentIndex = stepOrder.indexOf(currentStep);

  const goNext = () => { if (currentIndex < stepOrder.length - 1) setCurrentStep(stepOrder[currentIndex + 1]); };
  const goPrev = () => { if (currentIndex > 0) setCurrentStep(stepOrder[currentIndex - 1]); };

  // Zone helpers
  const addZone = () => {
    setZones((prev) => [...prev, { id: `z-${Date.now()}`, name: 'Nuova Zona', radius: 5, minOrder: 20, deliveryFee: 3, freeDeliveryThreshold: 40, enabled: true }]);
  };
  const removeZone = (id: string) => setZones((prev) => prev.filter((z) => z.id !== id));
  const updateZone = (id: string, field: keyof DeliveryZone, value: string | number | boolean) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, [field]: value } : z)));
  };

  // Hours helpers
  const toggleDay = (day: string) => setHours((prev) => ({ ...prev, [day]: { ...prev[day], open: !prev[day].open } }));
  const updateHour = (day: string, service: 'lunch' | 'dinner', field: 'from' | 'to', value: string) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [service]: { ...prev[day][service], [field]: value } } }));
  };

  // Service hours helpers
  const toggleServiceDay = (setter: React.Dispatch<React.SetStateAction<ServiceHours>>, day: string) => {
    setter((prev) => ({ ...prev, hours: { ...prev.hours, [day]: { ...prev.hours[day], open: !prev.hours[day].open } } }));
  };
  const updateServiceHour = (setter: React.Dispatch<React.SetStateAction<ServiceHours>>, day: string, service: 'lunch' | 'dinner', field: 'from' | 'to', value: string) => {
    setter((prev) => ({ ...prev, hours: { ...prev.hours, [day]: { ...prev.hours[day], [service]: { ...prev.hours[day][service], [field]: value } } } }));
  };

  // Menu helpers
  const addMenuItem = () => {
    if (!newItem.name || !newItem.price) return;
    setMenuItems((prev) => [...prev, { ...newItem, id: `mi-${Date.now()}` }]);
    setNewItem({ id: '', name: '', category: menuCategories[0] || 'Pizza', price: '', description: '', available: true, imageUrl: '', imageFile: null, allergens: [], optionGroups: [], visibility: defaultVisibility() });
    setShowAddItem(false);
    setShowVisibilityPanel(false);
  };
  const removeMenuItem = (id: string) => setMenuItems((prev) => prev.filter((m) => m.id !== id));
  const toggleAllergen = (allergen: string) => {
    setNewItem((prev) => ({ ...prev, allergens: prev.allergens.includes(allergen) ? prev.allergens.filter((a) => a !== allergen) : [...prev.allergens, allergen] }));
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setNewItem((prev) => ({ ...prev, imageFile: file, imageUrl: url }));
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setInfo((prev) => ({ ...prev, logoUrl: url }));
  };

  const handleBgImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setInfo((prev) => ({ ...prev, backgroundImageUrl: url }));
  };

  const addNewCategory = () => {
    if (!newCategoryName.trim()) return;
    const cat = newCategoryName.trim();
    if (!menuCategories.includes(cat)) setMenuCategories((prev) => [...prev, cat]);
    setNewItem((prev) => ({ ...prev, category: cat }));
    setNewCategoryName('');
    setShowNewCategory(false);
  };

  // Option group helpers
  const addOptionGroup = () => {
    if (!newGroupName.trim()) return;
    const validChoices = newGroupChoices.filter((c) => c.name.trim());
    if (validChoices.length === 0) return;
    setOptionGroups((prev) => [...prev, { id: `og-${Date.now()}`, name: newGroupName.trim(), choices: validChoices, appliedTo: [] }]);
    setNewGroupName('');
    setNewGroupChoices([{ id: 'c-1', name: '', price: 0 }]);
    setShowAddGroup(false);
  };
  const removeOptionGroup = (id: string) => setOptionGroups((prev) => prev.filter((g) => g.id !== id));
  const addChoice = () => setNewGroupChoices((prev) => [...prev, { id: `c-${Date.now()}`, name: '', price: 0 }]);
  const updateChoice = (id: string, field: 'name' | 'price', value: string | number) => {
    setNewGroupChoices((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  };
  const removeChoice = (id: string) => setNewGroupChoices((prev) => prev.filter((c) => c.id !== id));

  // Edit option group helpers
  const startEditGroup = (group: OptionGroup) => {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
    setEditGroupChoices(group.choices.map((c) => ({ ...c })));
    setShowAddGroup(false);
  };
  const cancelEditGroup = () => {
    setEditingGroupId(null);
    setEditGroupName('');
    setEditGroupChoices([]);
  };
  const addEditChoice = () => setEditGroupChoices((prev) => [...prev, { id: `c-${Date.now()}`, name: '', price: 0 }]);
  const updateEditChoice = (id: string, field: 'name' | 'price', value: string | number) => {
    setEditGroupChoices((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  };
  const removeEditChoice = (id: string) => setEditGroupChoices((prev) => prev.filter((c) => c.id !== id));
  const saveEditGroup = () => {
    if (!editGroupName.trim()) return;
    const validChoices = editGroupChoices.filter((c) => c.name.trim());
    if (validChoices.length === 0) return;
    setOptionGroups((prev) => prev.map((g) => g.id === editingGroupId ? { ...g, name: editGroupName.trim(), choices: validChoices } : g));
    cancelEditGroup();
  };

  const toggleItemOptionGroup = (groupId: string) => {
    setNewItem((prev) => ({
      ...prev,
      optionGroups: prev.optionGroups.includes(groupId)
        ? prev.optionGroups.filter((g) => g !== groupId)
        : [...prev.optionGroups, groupId],
    }));
  };

  const toggleVisibilityDay = (day: string) => {
    setNewItem((prev) => ({
      ...prev,
      visibility: {
        ...prev.visibility,
        days: prev.visibility.days.includes(day)
          ? prev.visibility.days.filter((d) => d !== day)
          : [...prev.visibility.days, day],
      },
    }));
  };

  const handlePublish = () => {
    // Convert wizard ServiceHours to configure page format {enabled, lunch, dinner}
    const convertServiceHours = (svcHours: ServiceHours) => {
      const result: Record<string, { enabled: boolean; lunch: { from: string; to: string }; dinner: { from: string; to: string } }> = {};
      DAYS.forEach((day) => {
        const dayData = svcHours.hours[day];
        result[day] = {
          enabled: dayData.open,
          lunch: { from: dayData.lunch.from, to: dayData.lunch.to },
          dinner: { from: dayData.dinner.from, to: dayData.dinner.to },
        };
      });
      return result;
    };

    // Save new restaurant to localStorage so the list page can show it
    const newRestaurant = {
      id: `r-${Date.now()}`,
      name: info.name || 'Nuovo Ristorante',
      address: info.address || '',
      city: info.city || '',
      status: 'published' as const,
      owner: info.name || 'Proprietario',
      email: info.email || '',
      phone: info.phone || '',
      website: info.website || '',
      description: info.description || '',
      province: info.province || '',
      cap: info.cap || '',
      vatNumber: info.vatNumber || '',
      category: info.category || 'Ristorante',
      logoUrl: info.logoUrl || '',
      backgroundImageUrl: info.backgroundImageUrl || '',
      createdAt: new Date().toISOString().split('T')[0],
      menuItems: menuItems.map((item) => ({
        id: item.id || `mi-${Date.now()}-${Math.random()}`,
        name: item.name,
        category: item.category,
        price: item.price,
        description: item.description,
        available: item.available,
        imageUrl: item.imageUrl,
        allergens: item.allergens,
        visibility: 'always',
        optionGroups: [],
      })),
      menuCategories: menuCategories,
      ordersToday: 0,
      hours,
      serviceHours: {
        pickup: convertServiceHours(pickupHours),
        delivery: convertServiceHours(deliveryHours),
        reservation: convertServiceHours(bookingHours),
      },
      zones,
    };
    try {
      const existing = JSON.parse(localStorage.getItem('gloriaorder_restaurants') || '[]');
      localStorage.setItem('gloriaorder_restaurants', JSON.stringify([...existing, newRestaurant]));
    } catch {}
    setPublished(true);
  };

  // Render service hours block
  const renderServiceHoursBlock = (
    label: string,
    state: ServiceHours,
    setter: React.Dispatch<React.SetStateAction<ServiceHours>>
  ) => (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {state.useCustom ? 'Orari personalizzati' : 'Stessi orari di apertura'}
          </p>
        </div>
        <button
          onClick={() => setter((prev) => ({ ...prev, useCustom: !prev.useCustom }))}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
            state.useCustom
              ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20' :'bg-muted text-muted-foreground border-border hover:bg-border'
          }`}
        >
          <Settings size={12} />
          {state.useCustom ? 'Personalizzati' : 'Personalizza'}
        </button>
      </div>
      {state.useCustom && (
        <div>
          {DAYS.map((day, idx) => (
            <div key={day} className={`px-5 py-3 ${idx < DAYS.length - 1 ? 'border-b border-border' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="w-28 flex items-center gap-3 flex-shrink-0">
                  <Toggle checked={state.hours[day].open} onChange={() => toggleServiceDay(setter, day)} size="sm" />
                  <span className={`text-sm font-semibold ${state.hours[day].open ? 'text-foreground' : 'text-muted-foreground'}`}>{day}</span>
                </div>
                {state.hours[day].open ? (
                  <div className="flex flex-wrap items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium w-12">Pranzo</span>
                      <input type="time" value={state.hours[day].lunch.from} onChange={(e) => updateServiceHour(setter, day, 'lunch', 'from', e.target.value)} className="px-2 py-1.5 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
                      <span className="text-xs text-muted-foreground">–</span>
                      <input type="time" value={state.hours[day].lunch.to} onChange={(e) => updateServiceHour(setter, day, 'lunch', 'to', e.target.value)} className="px-2 py-1.5 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium w-12">Cena</span>
                      <input type="time" value={state.hours[day].dinner.from} onChange={(e) => updateServiceHour(setter, day, 'dinner', 'from', e.target.value)} className="px-2 py-1.5 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
                      <span className="text-xs text-muted-foreground">–</span>
                      <input type="time" value={state.hours[day].dinner.to} onChange={(e) => updateServiceHour(setter, day, 'dinner', 'to', e.target.value)} className="px-2 py-1.5 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Chiuso</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (published) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <RestaurantSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} activeSection="nav-ristoranti" onSectionChange={() => {}} role="superadmin" />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-full bg-[var(--success-bg)] flex items-center justify-center mx-auto mb-6">
              <Check size={36} className="text-[var(--success)]" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Ristorante Pubblicato!</h2>
            <p className="text-muted-foreground mb-8"><strong>{info.name || 'Il ristorante'}</strong> è ora online. Le credenziali di accesso sono state generate per il ristoratore.</p>
            <div className="bg-card border border-border rounded-xl p-5 mb-6 text-left space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Credenziali generate</p>
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Email</span><span className="text-sm font-semibold text-foreground">{info.email || 'ristoratore@example.it'}</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Password temporanea</span><span className="text-sm font-mono font-bold text-primary">Temp2026!</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Ruolo</span><span className="text-sm font-semibold text-foreground">Ristoratore</span></div>
            </div>
            <div className="flex flex-col gap-3">
              <Link href={`/superadmin/restaurants/r-new/access`} className="w-full flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-[#d43d22] transition-all">Gestisci Accessi</Link>
              <Link href="/superadmin/restaurants" className="w-full flex items-center justify-center gap-2 bg-muted text-foreground px-4 py-3 rounded-xl text-sm font-semibold hover:bg-border transition-all">Torna alla lista ristoranti</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <RestaurantSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} activeSection="nav-ristoranti" onSectionChange={() => {}} role="superadmin" />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-card border-b border-border flex items-center px-6 gap-4 flex-shrink-0">
          <Link href="/superadmin/restaurants" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
            <ArrowLeft size={16} />Ristoranti
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-semibold text-foreground">Nuovo Ristorante</span>
          <div className="flex-1" />
          <button className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Bell size={18} /></button>
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">A</div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-foreground leading-none">Super Admin</p>
              <p className="text-xs text-muted-foreground mt-0.5">admin@gloriaorder.it</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
            {/* Stepper */}
            <div className="flex items-center gap-0">
              {steps.map((step, idx) => {
                const stepIdx = stepOrder.indexOf(step.id);
                const isDone = stepIdx < currentIndex;
                const isActive = step.id === currentStep;
                return (
                  <React.Fragment key={step.id}>
                    <button
                      onClick={() => isDone && setCurrentStep(step.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${isActive ? 'bg-primary text-white' : isDone ? 'text-[var(--success)] hover:bg-[var(--success-bg)] cursor-pointer' : 'text-muted-foreground cursor-default'}`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isActive ? 'bg-white/20' : isDone ? 'bg-[var(--success-bg)]' : 'bg-muted'}`}>
                        {isDone ? <Check size={12} /> : idx + 1}
                      </span>
                      <span className="hidden sm:inline">{step.label}</span>
                    </button>
                    {idx < steps.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${stepIdx < currentIndex ? 'bg-[var(--success)]' : 'bg-border'}`} />}
                  </React.Fragment>
                );
              })}
            </div>

            {/* ─── Step: Info ─── */}
            {currentStep === 'info' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Informazioni Ristorante</h2>
                  <p className="text-sm text-muted-foreground mt-1">Dati anagrafici e contatti del ristorante</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-foreground mb-1.5">Nome Ristorante *</label>
                      <div className="relative"><Store size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="text" value={info.name} onChange={(e) => setInfo((p) => ({ ...p, name: e.target.value }))} placeholder="es. Pizzeria Bella Napoli" className="w-full pl-9 pr-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">Categoria *</label>
                      <div className="relative"><select value={info.category} onChange={(e) => setInfo((p) => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring appearance-none">{RESTAURANT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select><ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" /></div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">P. IVA</label>
                      <div className="relative"><FileText size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="text" value={info.vatNumber} onChange={(e) => setInfo((p) => ({ ...p, vatNumber: e.target.value }))} placeholder="IT12345678901" className="w-full pl-9 pr-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-foreground mb-1.5">Descrizione</label>
                      <textarea value={info.description} onChange={(e) => setInfo((p) => ({ ...p, description: e.target.value }))} placeholder="Breve descrizione del ristorante..." rows={3} className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                    </div>

                    {/* Logo & Background Image */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">Logo Ristorante</label>
                      <div className="flex items-center gap-3">
                        {info.logoUrl ? (
                          <div className="relative w-16 h-16 rounded-xl border border-border overflow-hidden flex-shrink-0 bg-muted">
                            <img src={info.logoUrl} alt="Logo ristorante" className="w-full h-full object-contain" />
                            <button
                              type="button"
                              onClick={() => setInfo((p) => ({ ...p, logoUrl: '' }))}
                              className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center flex-shrink-0">
                            <Upload size={18} className="text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <button
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm border border-border rounded-xl hover:bg-muted transition-colors text-muted-foreground font-medium"
                          >
                            <Upload size={14} />
                            {info.logoUrl ? 'Cambia logo' : 'Carica logo'}
                          </button>
                          <p className="text-xs text-muted-foreground mt-1.5">PNG, JPG — verrà mostrato in alto a sinistra nel menu</p>
                          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">Immagine di Sfondo (Hero)</label>
                      <div className="flex items-center gap-3">
                        {info.backgroundImageUrl ? (
                          <div className="relative w-16 h-16 rounded-xl border border-border overflow-hidden flex-shrink-0">
                            <img src={info.backgroundImageUrl} alt="Immagine di sfondo" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setInfo((p) => ({ ...p, backgroundImageUrl: '' }))}
                              className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center flex-shrink-0">
                            <Upload size={18} className="text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <button
                            type="button"
                            onClick={() => bgImageInputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm border border-border rounded-xl hover:bg-muted transition-colors text-muted-foreground font-medium"
                          >
                            <Upload size={14} />
                            {info.backgroundImageUrl ? 'Cambia sfondo' : 'Carica sfondo'}
                          </button>
                          <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG — banner hero nella pagina menu cliente</p>
                          <input ref={bgImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgImageFile} />
                        </div>
                      </div>
                    </div>

                  </div>
                  <div className="border-t border-border pt-5">
                    <p className="text-sm font-semibold text-foreground mb-4">Indirizzo</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Via / Piazza *</label>
                        <div className="relative"><MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="text" value={info.address} onChange={(e) => setInfo((p) => ({ ...p, address: e.target.value }))} placeholder="Via Roma 1" className="w-full pl-9 pr-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Città *</label>
                        <input type="text" value={info.city} onChange={(e) => setInfo((p) => ({ ...p, city: e.target.value }))} placeholder="Napoli" className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Provincia</label>
                          <input type="text" value={info.province} onChange={(e) => setInfo((p) => ({ ...p, province: e.target.value }))} placeholder="NA" maxLength={2} className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring uppercase" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1.5">CAP</label>
                          <input type="text" value={info.cap} onChange={(e) => setInfo((p) => ({ ...p, cap: e.target.value }))} placeholder="80100" maxLength={5} className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-border pt-5">
                    <p className="text-sm font-semibold text-foreground mb-4">Contatti</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Telefono *</label>
                        <div className="relative"><Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="tel" value={info.phone} onChange={(e) => setInfo((p) => ({ ...p, phone: e.target.value }))} placeholder="+39 081 123 4567" className="w-full pl-9 pr-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email *</label>
                        <div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="email" value={info.email} onChange={(e) => setInfo((p) => ({ ...p, email: e.target.value }))} placeholder="info@ristorante.it" className="w-full pl-9 pr-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sito web</label>
                        <div className="relative"><Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="url" value={info.website} onChange={(e) => setInfo((p) => ({ ...p, website: e.target.value }))} placeholder="https://www.ristorante.it" className="w-full pl-9 pr-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                      </div>
                    </div>
                  </div>

                  {/* Feature 1: Table Booking Config */}
                  <div className="border-t border-border pt-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Prenotazione Tavolo</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Abilita il servizio di prenotazione tavolo per questo ristorante</p>
                      </div>
                      <Toggle checked={tableBooking.enabled} onChange={() => setTableBooking((p) => ({ ...p, enabled: !p.enabled }))} size="sm" />
                    </div>
                    {tableBooking.enabled && (
                      <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Max ospiti per prenotazione</label>
                            <input type="number" value={tableBooking.maxGuests} onChange={(e) => setTableBooking((p) => ({ ...p, maxGuests: parseInt(e.target.value) || 1 }))} min={1} max={50} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Durata slot (minuti)</label>
                            <input type="number" value={tableBooking.slotDuration} onChange={(e) => setTableBooking((p) => ({ ...p, slotDuration: parseInt(e.target.value) || 30 }))} min={15} step={15} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Prenotazione anticipata (giorni)</label>
                            <input type="number" value={tableBooking.advanceBookingDays} onChange={(e) => setTableBooking((p) => ({ ...p, advanceBookingDays: parseInt(e.target.value) || 1 }))} min={1} max={365} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <div>
                            <p className="text-sm font-medium text-foreground">Servizio attivo</p>
                            <p className="text-xs text-muted-foreground">Il ristorante può disattivare quando i tavoli sono pieni</p>
                          </div>
                          <Toggle checked={tableBooking.serviceEnabled} onChange={() => setTableBooking((p) => ({ ...p, serviceEnabled: !p.serviceEnabled }))} size="sm" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─── Step: Delivery ─── */}
            {currentStep === 'delivery' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Zone di Consegna</h2>
                  <p className="text-sm text-muted-foreground mt-1">Configura le zone di consegna, i costi e gli ordini minimi</p>
                </div>
                <div className="space-y-4">
                  {zones.map((zone) => (
                    <div key={zone.id} className="bg-card border border-border rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Toggle checked={zone.enabled} onChange={() => updateZone(zone.id, 'enabled', !zone.enabled)} size="sm" />
                          <input type="text" value={zone.name} onChange={(e) => updateZone(zone.id, 'name', e.target.value)} className="font-semibold text-sm text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5" />
                        </div>
                        <button onClick={() => removeZone(zone.id)} className="p-1.5 rounded-lg hover:bg-[var(--danger-bg)] text-muted-foreground hover:text-[var(--danger)] transition-colors"><Trash2 size={14} /></button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Raggio (km)</label><input type="number" value={zone.radius} onChange={(e) => updateZone(zone.id, 'radius', parseFloat(e.target.value) || 0)} min={0.5} step={0.5} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums" /></div>
                        <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Ordine min. (€)</label><div className="relative"><Euro size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="number" value={zone.minOrder} onChange={(e) => updateZone(zone.id, 'minOrder', parseFloat(e.target.value) || 0)} min={0} step={0.5} className="w-full pl-7 pr-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums" /></div></div>
                        <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Costo consegna (€)</label><div className="relative"><Euro size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="number" value={zone.deliveryFee} onChange={(e) => updateZone(zone.id, 'deliveryFee', parseFloat(e.target.value) || 0)} min={0} step={0.5} className="w-full pl-7 pr-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums" /></div></div>
                        <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Gratis da (€)</label><div className="relative"><Euro size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="number" value={zone.freeDeliveryThreshold} onChange={(e) => updateZone(zone.id, 'freeDeliveryThreshold', parseFloat(e.target.value) || 0)} min={0} step={1} className="w-full pl-7 pr-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums" /></div></div>
                      </div>
                    </div>
                  ))}
                  <button onClick={addZone} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-4 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"><Plus size={16} />Aggiungi zona di consegna</button>
                </div>
              </div>
            )}

            {/* ─── Step: Hours (Feature 2) ─── */}
            {currentStep === 'hours' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Orari</h2>
                  <p className="text-sm text-muted-foreground mt-1">Configura gli orari di apertura e per ogni servizio</p>
                </div>

                {/* General opening hours */}
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">Orari di Apertura</p>
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    {DAYS.map((day, idx) => (
                      <div key={day} className={`px-5 py-4 ${idx < DAYS.length - 1 ? 'border-b border-border' : ''}`}>
                        <div className="flex items-center gap-4">
                          <div className="w-28 flex items-center gap-3 flex-shrink-0">
                            <Toggle checked={hours[day].open} onChange={() => toggleDay(day)} size="sm" />
                            <span className={`text-sm font-semibold ${hours[day].open ? 'text-foreground' : 'text-muted-foreground'}`}>{day}</span>
                          </div>
                          {hours[day].open ? (
                            <div className="flex flex-wrap items-center gap-4 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground font-medium w-12">Pranzo</span>
                                <input type="time" value={hours[day].lunch.from} onChange={(e) => updateHour(day, 'lunch', 'from', e.target.value)} className="px-2 py-1.5 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
                                <span className="text-xs text-muted-foreground">–</span>
                                <input type="time" value={hours[day].lunch.to} onChange={(e) => updateHour(day, 'lunch', 'to', e.target.value)} className="px-2 py-1.5 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground font-medium w-12">Cena</span>
                                <input type="time" value={hours[day].dinner.from} onChange={(e) => updateHour(day, 'dinner', 'from', e.target.value)} className="px-2 py-1.5 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
                                <span className="text-xs text-muted-foreground">–</span>
                                <input type="time" value={hours[day].dinner.to} onChange={(e) => updateHour(day, 'dinner', 'to', e.target.value)} className="px-2 py-1.5 text-xs bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Chiuso</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Per-service hours */}
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-foreground">Orari per Servizio</p>
                  <p className="text-xs text-muted-foreground -mt-2">Di default uguali agli orari di apertura. Clicca "Personalizza" per impostare orari diversi.</p>
                  {renderServiceHoursBlock('Orari di Ritiro presso il ristorante', pickupHours, setPickupHours)}
                  {renderServiceHoursBlock('Orari di Consegna', deliveryHours, setDeliveryHours)}
                  {tableBooking.enabled && renderServiceHoursBlock('Orari Prenotazione Tavolo', bookingHours, setBookingHours)}
                </div>
              </div>
            )}

            {/* ─── Step: Scheduled Orders (Feature 3) ─── */}
            {currentStep === 'scheduled' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Ordini Programmati</h2>
                  <p className="text-sm text-muted-foreground mt-1">Configura le impostazioni per gli ordini con orario specifico</p>
                </div>

                {/* Main toggle */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-foreground">Permetti ai clienti di chiedere un orario specifico di consegna</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setScheduledOrders((p) => ({ ...p, enabled: true }))}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${scheduledOrders.enabled ? 'bg-[var(--success)] text-white' : 'bg-muted text-muted-foreground hover:bg-border'}`}
                      >Sì</button>
                      <button
                        onClick={() => setScheduledOrders((p) => ({ ...p, enabled: false }))}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${!scheduledOrders.enabled ? 'bg-muted text-foreground border border-border' : 'bg-muted text-muted-foreground hover:bg-border'}`}
                      >No</button>
                    </div>
                  </div>
                </div>

                {scheduledOrders.enabled && (
                  <div className="space-y-4">
                    {/* Pickup settings */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors" onClick={() => setScheduledOrders((p) => ({ ...p, pickupExpanded: !p.pickupExpanded }))}>
                        <p className="text-sm font-semibold text-foreground">Impostazione per il ritiro presso il ristorante</p>
                        {scheduledOrders.pickupExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                      </button>
                      {scheduledOrders.pickupExpanded && (
                        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground w-40">Preavviso minimo:</span>
                            <input type="number" value={scheduledOrders.pickup.minNoticeValue} onChange={(e) => setScheduledOrders((p) => ({ ...p, pickup: { ...p.pickup, minNoticeValue: parseInt(e.target.value) || 0 } }))} className="w-24 px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                            <div className="relative">
                              <select value={scheduledOrders.pickup.minNoticeUnit} onChange={(e) => setScheduledOrders((p) => ({ ...p, pickup: { ...p.pickup, minNoticeUnit: e.target.value } }))} className="px-3 py-2 pr-8 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring appearance-none">
                                {TIME_UNITS.map((u) => <option key={u}>{u}</option>)}
                              </select>
                              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground w-40">Preavviso massimo:</span>
                            <input type="number" value={scheduledOrders.pickup.maxNoticeDays} onChange={(e) => setScheduledOrders((p) => ({ ...p, pickup: { ...p.pickup, maxNoticeDays: parseInt(e.target.value) || 0 } }))} className="w-24 px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                            <span className="text-sm text-muted-foreground px-3 py-2 bg-muted border border-border rounded-xl">Giorni</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Delivery settings */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors" onClick={() => setScheduledOrders((p) => ({ ...p, deliveryExpanded: !p.deliveryExpanded }))}>
                        <p className="text-sm font-semibold text-foreground">Impostazione per la consegna</p>
                        {scheduledOrders.deliveryExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                      </button>
                      {scheduledOrders.deliveryExpanded && (
                        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground w-40">Preavviso minimo:</span>
                            <input type="number" value={scheduledOrders.delivery.minNoticeValue} onChange={(e) => setScheduledOrders((p) => ({ ...p, delivery: { ...p.delivery, minNoticeValue: parseInt(e.target.value) || 0 } }))} className="w-24 px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                            <div className="relative">
                              <select value={scheduledOrders.delivery.minNoticeUnit} onChange={(e) => setScheduledOrders((p) => ({ ...p, delivery: { ...p.delivery, minNoticeUnit: e.target.value } }))} className="px-3 py-2 pr-8 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring appearance-none">
                                {TIME_UNITS.map((u) => <option key={u}>{u}</option>)}
                              </select>
                              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground w-40">Preavviso massimo:</span>
                            <input type="number" value={scheduledOrders.delivery.maxNoticeDays} onChange={(e) => setScheduledOrders((p) => ({ ...p, delivery: { ...p.delivery, maxNoticeDays: parseInt(e.target.value) || 0 } }))} className="w-24 px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                            <span className="text-sm text-muted-foreground px-3 py-2 bg-muted border border-border rounded-xl">Giorni</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground w-40">Finestra di tempo (ogni):</span>
                            <div className="relative">
                              <select value={`${scheduledOrders.delivery.timeWindowMinutes} minuti`} onChange={(e) => setScheduledOrders((p) => ({ ...p, delivery: { ...p.delivery, timeWindowMinutes: parseInt(e.target.value) } }))} className="px-3 py-2 pr-8 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring appearance-none min-w-[160px]">
                                {TIME_WINDOWS.map((w) => <option key={w} value={parseInt(w)}>{w}</option>)}
                              </select>
                              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* On premise settings */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors" onClick={() => setScheduledOrders((p) => ({ ...p, onPremiseExpanded: !p.onPremiseExpanded }))}>
                        <p className="text-sm font-semibold text-foreground">Impostazioni per on premise</p>
                        {scheduledOrders.onPremiseExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                      </button>
                      {scheduledOrders.onPremiseExpanded && (
                        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground w-40">Preavviso minimo:</span>
                            <input type="number" value={scheduledOrders.onPremise.minNoticeValue} onChange={(e) => setScheduledOrders((p) => ({ ...p, onPremise: { ...p.onPremise, minNoticeValue: parseInt(e.target.value) || 0 } }))} className="w-24 px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                            <div className="relative">
                              <select value={scheduledOrders.onPremise.minNoticeUnit} onChange={(e) => setScheduledOrders((p) => ({ ...p, onPremise: { ...p.onPremise, minNoticeUnit: e.target.value } }))} className="px-3 py-2 pr-8 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring appearance-none">
                                {TIME_UNITS.map((u) => <option key={u}>{u}</option>)}
                              </select>
                              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground w-40">Preavviso massimo:</span>
                            <input type="number" value={scheduledOrders.onPremise.maxNoticeDays} onChange={(e) => setScheduledOrders((p) => ({ ...p, onPremise: { ...p.onPremise, maxNoticeDays: parseInt(e.target.value) || 0 } }))} className="w-24 px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                            <span className="text-sm text-muted-foreground px-3 py-2 bg-muted border border-border rounded-xl">Giorni</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Altro */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors" onClick={() => setScheduledOrders((p) => ({ ...p, altroExpanded: !p.altroExpanded }))}>
                        <p className="text-sm font-semibold text-foreground">Altro</p>
                        {scheduledOrders.altroExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                      </button>
                      {scheduledOrders.altroExpanded && (
                        <div className="px-5 pb-5 border-t border-border pt-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-foreground max-w-xs">Nascondi &ldquo;il prima possibile&rdquo; (permetti solo agli ordini programmati)</p>
                            <Toggle checked={scheduledOrders.hideAsap} onChange={() => setScheduledOrders((p) => ({ ...p, hideAsap: !p.hideAsap }))} size="sm" />
                          </div>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-primary underline cursor-pointer hover:text-primary/80">Come funziona fuori dagli orari di apertura</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── Step: Menu (Features 4 & 5) ─── */}
            {currentStep === 'menu' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Menu</h2>
                    <p className="text-sm text-muted-foreground mt-1">{menuItems.length} voci aggiunte</p>
                  </div>
                  <button onClick={() => { setShowAddItem(true); setShowVisibilityPanel(false); }} className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#d43d22] transition-all active:scale-95">
                    <Plus size={16} />Aggiungi Piatto
                  </button>
                </div>

                {/* Add item form */}
                {showAddItem && (
                  <div className="bg-card border-2 border-primary/30 rounded-xl p-5 space-y-4">
                    <p className="text-sm font-semibold text-foreground">Nuovo Piatto</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nome *</label>
                        <input type="text" value={newItem.name} onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))} placeholder="es. Pizza Margherita" className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>

                      {/* Category with add new option */}
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Categoria</label>
                        {showNewCategory ? (
                          <div className="flex gap-2">
                            <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nuova categoria..." className="flex-1 px-3 py-2.5 text-sm bg-input border border-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" onKeyDown={(e) => e.key === 'Enter' && addNewCategory()} autoFocus />
                            <button onClick={addNewCategory} className="px-3 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-[#d43d22]"><Check size={14} /></button>
                            <button onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }} className="px-3 py-2 bg-muted text-muted-foreground rounded-xl text-sm hover:bg-border"><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <select value={newItem.category} onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring appearance-none">
                                {menuCategories.map((c) => <option key={c}>{c}</option>)}
                              </select>
                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                            <button onClick={() => setShowNewCategory(true)} className="px-3 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm hover:bg-border hover:text-foreground transition-colors" title="Aggiungi nuova categoria"><Plus size={14} /></button>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Prezzo (€) *</label>
                        <div className="relative"><Euro size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="number" value={newItem.price} onChange={(e) => setNewItem((p) => ({ ...p, price: e.target.value }))} placeholder="9.50" min={0} step={0.5} className="w-full pl-7 pr-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                      </div>

                      {/* Local image upload */}
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Immagine del piatto</label>
                        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
                        {newItem.imageUrl ? (
                          <div className="flex items-center gap-3">
                            <img src={newItem.imageUrl} alt="Anteprima piatto" className="w-14 h-14 rounded-xl object-cover border border-border flex-shrink-0" />
                            <div className="flex flex-col gap-1.5">
                              <button onClick={() => imageInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs hover:bg-border transition-colors"><Edit2 size={11} />Cambia</button>
                              <button onClick={() => setNewItem((p) => ({ ...p, imageUrl: '', imageFile: null }))} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] transition-colors"><X size={11} />Rimuovi</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => imageInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-4 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                            <Upload size={16} />Carica da file locale
                          </button>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Descrizione</label>
                        <textarea value={newItem.description} onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))} placeholder="Ingredienti e descrizione..." rows={2} className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-2">Allergeni</label>
                        <div className="flex flex-wrap gap-2">
                          {ALLERGENS_LIST.map((a) => (
                            <button key={a} type="button" onClick={() => toggleAllergen(a)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${newItem.allergens.includes(a) ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-muted text-muted-foreground border border-border hover:border-amber-300'}`}>{a}</button>
                          ))}
                        </div>
                      </div>

                      {/* Option groups assignment */}
                      {optionGroups.length > 0 && (
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-muted-foreground mb-2">Opzioni e componenti aggiuntivi</label>
                          <div className="flex flex-wrap gap-2">
                            {optionGroups.map((g) => (
                              <button key={g.id} type="button" onClick={() => toggleItemOptionGroup(g.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${newItem.optionGroups.includes(g.id) ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border hover:border-primary/30'}`}>{g.name}</button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Visibility (Feature 5) */}
                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium text-muted-foreground">Visibilità</label>
                          <button onClick={() => setShowVisibilityPanel((v) => !v)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                            {showVisibilityPanel ? <EyeOff size={12} /> : <Eye size={12} />}
                            {showVisibilityPanel ? 'Nascondi opzioni' : 'Configura visibilità'}
                          </button>
                        </div>
                        {showVisibilityPanel && (
                          <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-4">
                            {/* Mode selection */}
                            <div className="space-y-2">
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input type="radio" name="visibility" checked={newItem.visibility.mode === 'always'} onChange={() => setNewItem((p) => ({ ...p, visibility: { ...p.visibility, mode: 'always' } }))} className="accent-primary" />
                                <span className="text-sm text-foreground">Sempre visibile</span>
                              </label>
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input type="radio" name="visibility" checked={newItem.visibility.mode === 'hidden'} onChange={() => setNewItem((p) => ({ ...p, visibility: { ...p.visibility, mode: 'hidden' } }))} className="accent-primary" />
                                <span className="text-sm text-foreground">Nascondi</span>
                              </label>
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input type="radio" name="visibility" checked={newItem.visibility.mode === 'time_range'} onChange={() => setNewItem((p) => ({ ...p, visibility: { ...p.visibility, mode: 'time_range' } }))} className="accent-primary" />
                                <span className="text-sm text-foreground">Mostra solo per orario fisso</span>
                              </label>
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input type="radio" name="visibility" checked={newItem.visibility.mode === 'date_range'} onChange={() => setNewItem((p) => ({ ...p, visibility: { ...p.visibility, mode: 'date_range' } }))} className="accent-primary" />
                                <span className="text-sm text-foreground">Mostra solo in un intervallo di date</span>
                              </label>
                            </div>

                            {/* Time range config */}
                            {newItem.visibility.mode === 'time_range' && (
                              <div className="space-y-3 pt-2 border-t border-border">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ora di inizio</label>
                                    <input type="time" value={newItem.visibility.timeFrom} onChange={(e) => setNewItem((p) => ({ ...p, visibility: { ...p.visibility, timeFrom: e.target.value } }))} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ora di fine</label>
                                    <input type="time" value={newItem.visibility.timeTo} onChange={(e) => setNewItem((p) => ({ ...p, visibility: { ...p.visibility, timeTo: e.target.value } }))} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-muted-foreground mb-2">Giorni della settimana</label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {DAYS.map((day) => (
                                      <label key={day} className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={newItem.visibility.days.includes(day)} onChange={() => toggleVisibilityDay(day)} className="accent-primary rounded" />
                                        <span className="text-sm text-foreground">{day}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Date range config */}
                            {newItem.visibility.mode === 'date_range' && (
                              <div className="space-y-3 pt-2 border-t border-border">
                                <div>
                                  <p className="text-xs font-semibold text-foreground mb-2">Da</p>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Data</label>
                                      <input type="date" value={newItem.visibility.dateFrom} onChange={(e) => setNewItem((p) => ({ ...p, visibility: { ...p.visibility, dateFrom: e.target.value } }))} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ora</label>
                                      <input type="time" value={newItem.visibility.dateFromTime} onChange={(e) => setNewItem((p) => ({ ...p, visibility: { ...p.visibility, dateFromTime: e.target.value } }))} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-foreground mb-2">Fino a</p>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Data</label>
                                      <input type="date" value={newItem.visibility.dateTo} onChange={(e) => setNewItem((p) => ({ ...p, visibility: { ...p.visibility, dateTo: e.target.value } }))} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ora</label>
                                      <input type="time" value={newItem.visibility.dateToTime} onChange={(e) => setNewItem((p) => ({ ...p, visibility: { ...p.visibility, dateToTime: e.target.value } }))} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button onClick={addMenuItem} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#d43d22] transition-all"><Check size={14} />Aggiungi al menu</button>
                      <button onClick={() => { setShowAddItem(false); setShowVisibilityPanel(false); }} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Annulla</button>
                    </div>
                  </div>
                )}

                {/* Option Groups section (Feature 4) */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Opzioni e componenti aggiuntivi</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Gruppi di opzioni applicabili a categorie o singoli piatti</p>
                    </div>
                    <button onClick={() => setShowAddGroup(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition-colors border border-primary/20"><Plus size={12} />Aggiungi gruppo</button>
                  </div>

                  {showAddGroup && (
                    <div className="px-5 py-4 border-b border-border bg-muted/30 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nome del gruppo</label>
                        <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="es. Scegli l'impasto" className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2">Scelte</label>
                        <div className="space-y-2">
                          {newGroupChoices.map((choice) => (
                            <div key={choice.id} className="flex items-center gap-2">
                              <input type="text" value={choice.name} onChange={(e) => updateChoice(choice.id, 'name', e.target.value)} placeholder="Nome scelta" className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                              <div className="relative w-28">
                                <Euro size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input type="number" value={choice.price} onChange={(e) => updateChoice(choice.id, 'price', parseFloat(e.target.value) || 0)} placeholder="0.00" min={0} step={0.5} className="w-full pl-6 pr-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                              </div>
                              {newGroupChoices.length > 1 && (
                                <button onClick={() => removeChoice(choice.id)} className="p-1.5 rounded-lg hover:bg-[var(--danger-bg)] text-muted-foreground hover:text-[var(--danger)] transition-colors"><X size={13} /></button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button onClick={addChoice} className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:underline"><Plus size={12} />Aggiungi scelta</button>
                      </div>
                      <div className="flex items-center gap-3 pt-1">
                        <button onClick={addOptionGroup} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#d43d22] transition-all"><Check size={14} />Salva gruppo</button>
                        <button onClick={() => { setShowAddGroup(false); setNewGroupName(''); setNewGroupChoices([{ id: 'c-1', name: '', price: 0 }]); }} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Annulla</button>
                      </div>
                    </div>
                  )}

                  {optionGroups.length === 0 && !showAddGroup ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">Nessun gruppo di opzioni configurato</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {optionGroups.map((group) => (
                        <div key={group.id}>
                          {editingGroupId === group.id ? (
                            <div className="px-5 py-4 bg-muted/30 space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nome del gruppo</label>
                                <input type="text" value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} placeholder="es. Scegli l'impasto" className="w-full px-3 py-2.5 text-sm bg-input border border-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2">Scelte</label>
                                <div className="space-y-2">
                                  {editGroupChoices.map((choice) => (
                                    <div key={choice.id} className="flex items-center gap-2">
                                      <input type="text" value={choice.name} onChange={(e) => updateEditChoice(choice.id, 'name', e.target.value)} placeholder="Nome scelta" className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                                      <div className="relative w-28">
                                        <Euro size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <input type="number" value={choice.price} onChange={(e) => updateEditChoice(choice.id, 'price', parseFloat(e.target.value) || 0)} placeholder="0.00" min={0} step={0.5} className="w-full pl-6 pr-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                                      </div>
                                      {editGroupChoices.length > 1 && (
                                        <button onClick={() => removeEditChoice(choice.id)} className="p-1.5 rounded-lg hover:bg-[var(--danger-bg)] text-muted-foreground hover:text-[var(--danger)] transition-colors"><X size={13} /></button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <button onClick={addEditChoice} className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:underline"><Plus size={12} />Aggiungi scelta</button>
                              </div>
                              <div className="flex items-center gap-3 pt-1">
                                <button onClick={saveEditGroup} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#d43d22] transition-all"><Check size={14} />Salva modifiche</button>
                                <button onClick={cancelEditGroup} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Annulla</button>
                              </div>
                            </div>
                          ) : (
                            <div className="px-5 py-4 flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-foreground mb-1">{group.name}</p>
                                <div className="flex flex-wrap gap-2">
                                  {group.choices.map((c) => (
                                    <span key={c.id} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{c.name} {c.price > 0 ? `+€${c.price.toFixed(2)}` : '€0.00'}</span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button onClick={() => startEditGroup(group)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Modifica gruppo"><Edit2 size={14} /></button>
                                <button onClick={() => removeOptionGroup(group.id)} className="p-1.5 rounded-lg hover:bg-[var(--danger-bg)] text-muted-foreground hover:text-[var(--danger)] transition-colors" title="Elimina gruppo"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Menu items list */}
                {menuItems.length === 0 && !showAddItem && (
                  <div className="bg-card border border-dashed border-border rounded-xl py-16 text-center">
                    <UtensilsCrossed size={32} className="mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Nessun piatto aggiunto</p>
                    <p className="text-xs text-muted-foreground mt-1">Clicca &ldquo;Aggiungi Piatto&rdquo; per iniziare</p>
                  </div>
                )}
                <div className="space-y-3">
                  {menuItems.map((item) => (
                    <div key={item.id} className="bg-card border border-border rounded-xl flex items-center gap-4 px-4 py-3">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={`Immagine di ${item.name}`} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-border" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"><UtensilsCrossed size={18} className="text-muted-foreground" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">{item.name}</span>
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{item.category}</span>
                          {item.visibility.mode === 'hidden' && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex items-center gap-1"><EyeOff size={9} />Nascosto</span>}
                          {item.visibility.mode === 'time_range' && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock size={9} />{item.visibility.timeFrom}–{item.visibility.timeTo}</span>}
                          {item.visibility.mode === 'date_range' && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full flex items-center gap-1"><Calendar size={9} />Intervallo date</span>}
                          {item.optionGroups.length > 0 && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">{item.optionGroups.length} opzioni</span>}
                        </div>
                        {item.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>}
                      </div>
                      <span className="font-bold text-sm tabular-nums text-foreground flex-shrink-0">€ {parseFloat(item.price || '0').toFixed(2)}</span>
                      <button onClick={() => removeMenuItem(item.id)} className="p-1.5 rounded-lg hover:bg-[var(--danger-bg)] text-muted-foreground hover:text-[var(--danger)] transition-colors flex-shrink-0"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Step: Review ─── */}
            {currentStep === 'review' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Riepilogo e Pubblicazione</h2>
                  <p className="text-sm text-muted-foreground mt-1">Verifica le informazioni prima di pubblicare il ristorante</p>
                </div>
                <div className="space-y-4">
                  <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4"><p className="text-sm font-semibold text-foreground">Informazioni</p><button onClick={() => setCurrentStep('info')} className="text-xs text-primary hover:underline font-medium">Modifica</button></div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Nome:</span> <span className="font-medium ml-1">{info.name || '—'}</span></div>
                      <div><span className="text-muted-foreground">Categoria:</span> <span className="font-medium ml-1">{info.category}</span></div>
                      <div><span className="text-muted-foreground">Indirizzo:</span> <span className="font-medium ml-1">{info.address ? `${info.address}, ${info.city}` : '—'}</span></div>
                      <div><span className="text-muted-foreground">Email:</span> <span className="font-medium ml-1">{info.email || '—'}</span></div>
                      <div><span className="text-muted-foreground">Telefono:</span> <span className="font-medium ml-1">{info.phone || '—'}</span></div>
                      <div><span className="text-muted-foreground">Prenotazione tavolo:</span> <span className={`font-medium ml-1 ${tableBooking.enabled ? 'text-[var(--success)]' : 'text-muted-foreground'}`}>{tableBooking.enabled ? 'Attiva' : 'Non attiva'}</span></div>
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4"><p className="text-sm font-semibold text-foreground">Zone di Consegna</p><button onClick={() => setCurrentStep('delivery')} className="text-xs text-primary hover:underline font-medium">Modifica</button></div>
                    <div className="space-y-2">{zones.map((z) => (<div key={z.id} className="flex items-center justify-between text-sm"><span className="font-medium">{z.name}</span><span className="text-muted-foreground">{z.radius}km · min €{z.minOrder} · consegna €{z.deliveryFee}</span></div>))}</div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4"><p className="text-sm font-semibold text-foreground">Orari</p><button onClick={() => setCurrentStep('hours')} className="text-xs text-primary hover:underline font-medium">Modifica</button></div>
                    <div className="grid grid-cols-2 gap-2 text-xs">{DAYS.map((day) => (<div key={day} className="flex items-center gap-2"><span className="font-medium w-20">{day}</span>{hours[day].open ? <span className="text-muted-foreground">{hours[day].lunch.from}–{hours[day].lunch.to} / {hours[day].dinner.from}–{hours[day].dinner.to}</span> : <span className="text-muted-foreground italic">Chiuso</span>}</div>))}</div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4"><p className="text-sm font-semibold text-foreground">Ordini Programmati</p><button onClick={() => setCurrentStep('scheduled')} className="text-xs text-primary hover:underline font-medium">Modifica</button></div>
                    <p className="text-sm text-muted-foreground">{scheduledOrders.enabled ? 'Abilitati — i clienti possono scegliere un orario specifico' : 'Non abilitati'}</p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4"><p className="text-sm font-semibold text-foreground">Menu</p><button onClick={() => setCurrentStep('menu')} className="text-xs text-primary hover:underline font-medium">Modifica</button></div>
                    <p className="text-sm text-muted-foreground">{menuItems.length} piatti configurati · {optionGroups.length} gruppi di opzioni</p>
                  </div>
                  <div className="bg-[var(--success-bg)] border border-[var(--success)]/30 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <CheckCircle size={20} className="text-[var(--success)] flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Pronto per la pubblicazione</p>
                        <p className="text-xs text-muted-foreground mt-1">Pubblicando il ristorante, verranno generate automaticamente le credenziali di accesso per il ristoratore all&apos;indirizzo <strong>{info.email || 'email non impostata'}</strong>.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <button onClick={goPrev} disabled={currentIndex === 0} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><ArrowLeft size={16} />Indietro</button>
              {currentStep !== 'review' ? (
                <button onClick={goNext} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#d43d22] transition-all active:scale-95">Avanti<ArrowRight size={16} /></button>
              ) : (
                <button onClick={handlePublish} className="flex items-center gap-2 bg-[var(--success)] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-all active:scale-95"><CheckCircle size={16} />Pubblica Ristorante</button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
