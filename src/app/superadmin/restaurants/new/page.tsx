'use client';
import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import { ArrowLeft, Bell, Check } from 'lucide-react';

// Wizard Components
import RestaurantInfoStep from '@/components/superadmin/restaurant-wizard/RestaurantInfoStep';
import DeliveryZonesStep from '@/components/superadmin/restaurant-wizard/DeliveryZonesStep';
import HoursStep from '@/components/superadmin/restaurant-wizard/HoursStep';
import ScheduledOrdersStep from '@/components/superadmin/restaurant-wizard/ScheduledOrdersStep';
import MenuStep from '@/components/superadmin/restaurant-wizard/MenuStep';
import ReviewStep from '@/components/superadmin/restaurant-wizard/ReviewStep';
import PublishedSuccess from '@/components/superadmin/restaurant-wizard/PublishedSuccess';

import {
  MenuItemWizardDraft,
  DayHours,
  ServiceHours,
  RestaurantInfo,
  DeliveryZone,
  TableBookingConfig,
  ScheduledOrdersConfig,
  WizardOptionGroup,
  WizardOptionChoice,
} from '@/types';
import {
  DAYS,
  ALLERGENS_LIST,
  DEFAULT_CATEGORIES,
  TIME_UNITS,
  TIME_WINDOWS,
} from '@/lib/constants';

type WizardStep = 'info' | 'delivery' | 'hours' | 'scheduled' | 'menu' | 'review';

const steps: { id: WizardStep; label: string }[] = [
  { id: 'info', label: 'Informazioni' },
  { id: 'delivery', label: 'Consegna' },
  { id: 'hours', label: 'Orari' },
  { id: 'scheduled', label: 'Programmati' },
  { id: 'menu', label: 'Menu' },
  { id: 'review', label: 'Pubblica' },
];

const defaultDayHours = (): Record<string, DayHours> => {
  const h: Record<string, DayHours> = {};
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

export default function NewRestaurantPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>('info');
  const [published, setPublished] = useState(false);

  // --- STATE ---
  const [info, setInfo] = useState<RestaurantInfo>({
    name: '',
    category: 'Pizzeria',
    description: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    province: '',
    cap: '',
    vatNumber: '',
    logoUrl: '',
    backgroundImageUrl: '',
  });
  const [zones, setZones] = useState<DeliveryZone[]>([
    {
      id: 'z-1',
      name: 'Zona Centro',
      radius: 3,
      minOrder: 15,
      deliveryFee: 2.5,
      freeDeliveryThreshold: 35,
      enabled: true,
    },
  ]);
  const [hours, setHours] = useState<Record<string, DayHours>>(defaultDayHours());
  const [pickupHours, setPickupHours] = useState<ServiceHours>({
    useCustom: false,
    hours: defaultDayHours(),
  });
  const [deliveryHours, setDeliveryHours] = useState<ServiceHours>({
    useCustom: false,
    hours: defaultDayHours(),
  });
  const [bookingHours, setBookingHours] = useState<ServiceHours>({
    useCustom: false,
    hours: defaultDayHours(),
  });
  const [tableBooking, setTableBooking] = useState<TableBookingConfig>({
    enabled: false,
    maxGuests: 8,
    slotDuration: 90,
    advanceBookingDays: 30,
    serviceEnabled: true,
  });
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
  const [menuCategories, setMenuCategories] = useState<string[]>([...DEFAULT_CATEGORIES]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [optionGroups, setOptionGroups] = useState<WizardOptionGroup[]>([]);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupChoices, setNewGroupChoices] = useState<WizardOptionChoice[]>([
    { id: 'c-1', name: '', price: 0 },
  ]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupChoices, setEditGroupChoices] = useState<WizardOptionChoice[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemWizardDraft[]>([]);
  const [newItem, setNewItem] = useState<MenuItemWizardDraft>({
    id: '',
    name: '',
    category: 'Pizza',
    price: '',
    description: '',
    available: true,
    imageUrl: '',
    imageFile: null,
    allergens: [],
    optionGroups: [],
    visibility: {
      mode: 'always',
      timeFrom: '10:00',
      timeTo: '15:00',
      days: [...DAYS],
      dateFrom: '',
      dateFromTime: '10:00',
      dateTo: '',
      dateToTime: '15:00',
    },
  });
  const [showAddItem, setShowAddItem] = useState(false);
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // --- HELPERS ---
  const stepOrder: WizardStep[] = ['info', 'delivery', 'hours', 'scheduled', 'menu', 'review'];
  const currentIndex = stepOrder.indexOf(currentStep);

  const addZone = () =>
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
  const removeZone = (id: string) => setZones((prev) => prev.filter((z) => z.id !== id));
  const updateZone = (id: string, field: keyof DeliveryZone, value: any) =>
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, [field]: value } : z)));

  const toggleDay = (day: string) =>
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], open: !prev[day].open } }));
  const updateHour = (day: string, svc: 'lunch' | 'dinner', f: 'from' | 'to', v: string) =>
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [svc]: { ...prev[day][svc], [f]: v } },
    }));

  const toggleServiceDay = (s: any, d: string) =>
    s((p: any) => ({
      ...p,
      hours: { ...p.hours, [d]: { ...p.hours[d], open: !p.hours[d].open } },
    }));
  const updateServiceHour = (s: any, d: string, svc: any, f: any, v: string) =>
    s((p: any) => ({
      ...p,
      hours: { ...p.hours, [d]: { ...p.hours[d], [svc]: { ...p.hours[d][svc], [f]: v } } },
    }));

  const addNewCategory = () => {
    if (!newCategoryName.trim()) return;
    setMenuCategories((p) => [...p, newCategoryName.trim()]);
    setNewCategoryName('');
    setShowNewCategory(false);
  };
  const addMenuItem = () => {
    if (!newItem.name || !newItem.price) return;
    setMenuItems((p) => [...p, { ...newItem, id: `mi-${Date.now()}` }]);
    setShowAddItem(false);
  };
  const toggleAllergen = (a: string) =>
    setNewItem((p) => ({
      ...p,
      allergens: p.allergens.includes(a)
        ? p.allergens.filter((x: string) => x !== a)
        : [...p.allergens, a],
    }));
  const toggleItemOptionGroup = (id: string) =>
    setNewItem((p) => ({
      ...p,
      optionGroups: p.optionGroups.includes(id)
        ? p.optionGroups.filter((x: string) => x !== id)
        : [...p.optionGroups, id],
    }));
  const toggleVisibilityDay = (d: string) =>
    setNewItem((p) => ({
      ...p,
      visibility: {
        ...p.visibility,
        days: p.visibility.days.includes(d)
          ? p.visibility.days.filter((x) => x !== d)
          : [...p.visibility.days, d],
      },
    }));

  const handleLogoFile = (e: any) => {
    const f = e.target.files?.[0];
    if (f) setInfo((p) => ({ ...p, logoUrl: URL.createObjectURL(f) }));
  };
  const handleBgImageFile = (e: any) => {
    const f = e.target.files?.[0];
    if (f) setInfo((p) => ({ ...p, backgroundImageUrl: URL.createObjectURL(f) }));
  };
  const handleImageFile = (e: any) => {
    const f = e.target.files?.[0];
    if (f) setNewItem((p) => ({ ...p, imageUrl: URL.createObjectURL(f), imageFile: f }));
  };

  const handlePublish = () => {
    setPublished(true);
  };

  if (published) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeSection="nav-ristoranti"
          onSectionChange={() => {}}
          role="superadmin"
        />
        <PublishedSuccess restaurantName={info.name} email={info.email} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeSection="nav-ristoranti"
        onSectionChange={() => {}}
        role="superadmin"
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-card border-b border-border flex items-center px-6 gap-4 flex-shrink-0">
          <Link
            href="/superadmin/restaurants"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-medium"
          >
            <ArrowLeft size={16} />
            Ristoranti
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-semibold text-foreground">Nuovo Ristorante</span>
          <div className="flex-1" />
          <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
            <Bell size={18} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
            <div className="flex items-center gap-0">
              {steps.map((step, idx) => (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() =>
                      stepOrder.indexOf(step.id) < currentIndex && setCurrentStep(step.id)
                    }
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${step.id === currentStep ? 'bg-primary text-white' : stepOrder.indexOf(step.id) < currentIndex ? 'text-[var(--success)] hover:bg-[var(--success-bg)]' : 'text-muted-foreground'}`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step.id === currentStep ? 'bg-white/20' : stepOrder.indexOf(step.id) < currentIndex ? 'bg-[var(--success-bg)]' : 'bg-muted'}`}
                    >
                      {stepOrder.indexOf(step.id) < currentIndex ? <Check size={12} /> : idx + 1}
                    </span>
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                  {idx < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-1 ${stepOrder.indexOf(step.id) < currentIndex ? 'bg-[var(--success)]' : 'bg-border'}`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            {currentStep === 'info' && (
              <RestaurantInfoStep
                info={info}
                setInfo={setInfo}
                tableBooking={tableBooking}
                setTableBooking={setTableBooking}
                logoInputRef={logoInputRef}
                bgImageInputRef={bgImageInputRef}
                handleLogoFile={handleLogoFile}
                handleBgImageFile={handleBgImageFile}
              />
            )}
            {currentStep === 'delivery' && (
              <DeliveryZonesStep
                zones={zones}
                addZone={addZone}
                removeZone={removeZone}
                updateZone={updateZone}
              />
            )}
            {currentStep === 'hours' && (
              <HoursStep
                days={DAYS}
                hours={hours}
                toggleDay={toggleDay}
                updateHour={updateHour}
                pickupHours={pickupHours}
                setPickupHours={setPickupHours}
                deliveryHours={deliveryHours}
                setDeliveryHours={setDeliveryHours}
                bookingHours={bookingHours}
                setBookingHours={setBookingHours}
                toggleServiceDay={toggleServiceDay}
                updateServiceHour={updateServiceHour}
              />
            )}
            {currentStep === 'scheduled' && (
              <ScheduledOrdersStep
                scheduledOrders={scheduledOrders}
                setScheduledOrders={setScheduledOrders}
                timeUnits={TIME_UNITS}
                timeWindows={TIME_WINDOWS}
              />
            )}
            {currentStep === 'menu' && (
              <MenuStep
                menuCategories={menuCategories}
                setMenuCategories={setMenuCategories}
                showNewCategory={showNewCategory}
                setShowNewCategory={setShowNewCategory}
                newCategoryName={newCategoryName}
                setNewCategoryName={setNewCategoryName}
                addNewCategory={addNewCategory}
                optionGroups={optionGroups}
                showAddGroup={showAddGroup}
                setShowAddGroup={setShowAddGroup}
                newGroupName={newGroupName}
                setNewGroupName={setNewGroupName}
                newGroupChoices={newGroupChoices}
                addChoice={() =>
                  setNewGroupChoices((p) => [...p, { id: `c-${Date.now()}`, name: '', price: 0 }])
                }
                updateChoice={(id, f, v) =>
                  setNewGroupChoices((p) => p.map((c) => (c.id === id ? { ...c, [f]: v } : c)))
                }
                removeChoice={(id) => setNewGroupChoices((p) => p.filter((c) => c.id !== id))}
                addWizardOptionGroup={() => {
                  if (!newGroupName.trim()) return;
                  setOptionGroups((p) => [
                    ...p,
                    {
                      id: `og-${Date.now()}`,
                      name: newGroupName.trim(),
                      choices: newGroupChoices.filter((c) => c.name.trim()),
                      appliedTo: [],
                    },
                  ]);
                  setShowAddGroup(false);
                }}
                removeWizardOptionGroup={(id) =>
                  setOptionGroups((p) => p.filter((g) => g.id !== id))
                }
                editingGroupId={editingGroupId}
                startEditGroup={(g) => {
                  setEditingGroupId(g.id);
                  setEditGroupName(g.name);
                  setEditGroupChoices(g.choices.map((c) => ({ ...c })));
                }}
                editGroupName={editGroupName}
                setEditGroupName={setEditGroupName}
                editGroupChoices={editGroupChoices}
                addEditChoice={() =>
                  setEditGroupChoices((p) => [...p, { id: `c-${Date.now()}`, name: '', price: 0 }])
                }
                updateEditChoice={(id, f, v) =>
                  setEditGroupChoices((p) => p.map((c) => (c.id === id ? { ...c, [f]: v } : c)))
                }
                removeEditChoice={(id) => setEditGroupChoices((p) => p.filter((c) => c.id !== id))}
                saveEditGroup={() => {
                  setOptionGroups((p) =>
                    p.map((g) =>
                      g.id === editingGroupId
                        ? { ...g, name: editGroupName, choices: editGroupChoices }
                        : g
                    )
                  );
                  setEditingGroupId(null);
                }}
                cancelEditGroup={() => setEditingGroupId(null)}
                menuItems={menuItems}
                newItem={newItem}
                setNewItem={setNewItem}
                showAddItem={showAddItem}
                setShowAddItem={setShowAddItem}
                addMenuItem={addMenuItem}
                removeMenuItem={(id) => setMenuItems((p) => p.filter((m) => m.id !== id))}
                toggleAllergen={toggleAllergen}
                handleImageFile={handleImageFile}
                imageInputRef={imageInputRef}
                toggleItemOptionGroup={toggleItemOptionGroup}
                showVisibilityPanel={showVisibilityPanel}
                setShowVisibilityPanel={setShowVisibilityPanel}
                toggleVisibilityDay={toggleVisibilityDay}
                days={DAYS}
                allergensList={ALLERGENS_LIST}
              />
            )}
            {currentStep === 'review' && (
              <ReviewStep
                info={info}
                zones={zones}
                hours={hours}
                menuItems={menuItems}
                menuCategories={menuCategories}
                handlePublish={handlePublish}
              />
            )}

            <div className="flex items-center justify-between pt-8 border-t border-border">
              <button
                onClick={() => setCurrentStep(stepOrder[currentIndex - 1])}
                disabled={currentIndex === 0}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground disabled:opacity-0 transition-all"
              >
                Indietro
              </button>
              {currentStep !== 'review' && (
                <button
                  onClick={() => setCurrentStep(stepOrder[currentIndex + 1])}
                  className="bg-primary text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-[#d43d22] transition-all"
                >
                  Continua
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
