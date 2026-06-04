'use client';
import React, { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { ArrowLeft, ChevronRight, Check, ChevronLeft as ChevronLeftIcon } from 'lucide-react';
import type { PaymentConfig } from '@/components/admin/restaurant-wizard/PaymentStep';

// Wizard step components — dynamically imported so each step is a separate chunk
const RestaurantInfoStep = dynamic(
  () => import('@/components/admin/restaurant-wizard/RestaurantInfoStep'),
  { ssr: false }
);
const DeliveryZonesStep = dynamic(
  () => import('@/components/admin/restaurant-wizard/DeliveryZonesStep'),
  { ssr: false }
);
const HoursStep = dynamic(
  () => import('@/components/admin/restaurant-wizard/HoursStep'),
  { ssr: false }
);
const ScheduledOrdersStep = dynamic(
  () => import('@/components/admin/restaurant-wizard/ScheduledOrdersStep'),
  { ssr: false }
);
const PaymentStep = dynamic(
  () => import('@/components/admin/restaurant-wizard/PaymentStep'),
  { ssr: false }
);
const MenuStep = dynamic(
  () => import('@/components/admin/restaurant-wizard/MenuStep'),
  { ssr: false }
);
const ReviewStep = dynamic(
  () => import('@/components/admin/restaurant-wizard/ReviewStep'),
  { ssr: false }
);
const PublishedSuccess = dynamic(
  () => import('@/components/admin/restaurant-wizard/PublishedSuccess'),
  { ssr: false }
);

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
  MenuItem,
  OptionGroup,
} from '@/types';
import {
  DAYS,
  ALLERGENS_LIST,
  DEFAULT_CATEGORIES,
  TIME_UNITS,
  TIME_WINDOWS,
} from '@/lib/constants';

type WizardStep = 'info' | 'delivery' | 'hours' | 'scheduled' | 'payment' | 'menu' | 'review';

const steps: { id: WizardStep; label: string; description: string }[] = [
  { id: 'info', label: 'Informazioni', description: 'Dati anagrafici e contatti' },
  { id: 'delivery', label: 'Consegna', description: 'Zone e tariffe di consegna' },
  { id: 'hours', label: 'Orari', description: 'Orari di apertura e servizio' },
  { id: 'scheduled', label: 'Programmati', description: 'Ordini prenotati in anticipo' },
  { id: 'payment', label: 'Pagamento', description: 'Metodi di pagamento accettati' },
  { id: 'menu', label: 'Menu', description: 'Categorie, piatti e opzioni' },
  { id: 'review', label: 'Pubblica', description: 'Revisione e pubblicazione' },
];

const defaultDayHours = (): Record<string, DayHours> => {
  const h: Record<string, DayHours> = {};
  DAYS.forEach((d) => {
    h[d] = {
      open: true,
      lunch: { from: '12:00', to: '14:30' },
      dinner: { from: '19:00', to: '22:30' },
      lunchEnabled: true,
      dinnerEnabled: true,
    };
  });
  h['Domenica'].open = false;
  return h;
};

export default function NewRestaurantPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
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
      minOrder: 0,
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
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    card_delivery: true,
    card_pickup: true,
    cash_delivery: true,
    cash_pickup: true,
    stripe_enabled: false,
    stripe_connected: false,
    stripe_account_label: '',
    paypal_enabled: false,
    paypal_connected: false,
    paypal_email: '',
    iban_enabled: false,
    onlinePaymentAccount: '',
    ibanHolder: '',
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
    originalPrice: '',
    description: '',
    available: true,
    imageUrl: '',
    imageFile: null,
    allergens: [],
    dishTags: [],
    ingredients: [],
    optionGroups: [],
    singleSupplements: [],
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
  const stepOrder: WizardStep[] = [
    'info', 'delivery', 'hours', 'scheduled', 'payment', 'menu', 'review',
  ];
  const currentIndex = stepOrder.indexOf(currentStep);
  const progressPercent = Math.round((currentIndex / (stepOrder.length - 1)) * 100);
  const currentStepMeta = steps[currentIndex];

  const addZone = () =>
    setZones((prev) => [
      ...prev,
      {
        id: `z-${Date.now()}`,
        name: 'Nuova Zona',
        radius: 5,
        minOrder: 0,
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
  const toggleSlot = (day: string, slot: 'lunch' | 'dinner') => {
    setHours((prev) => {
      const current = prev[day];
      const field = slot === 'lunch' ? 'lunchEnabled' : 'dinnerEnabled';
      const newVal = current[field] === false ? true : false;
      return {
        ...prev,
        [day]: {
          ...current,
          [field]: newVal,
        },
      };
    });
  };

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
  const toggleServiceSlot = (s: any, day: string, slot: 'lunch' | 'dinner') => {
    s((prev: any) => {
      const current = prev.hours[day];
      const field = slot === 'lunch' ? 'lunchEnabled' : 'dinnerEnabled';
      const newVal = current[field] === false ? true : false;
      return {
        ...prev,
        hours: {
          ...prev.hours,
          [day]: {
            ...current,
            [field]: newVal,
          },
        },
      };
    });
  };

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
    setNewItem({
      id: '',
      name: '',
      category: menuCategories[0] || 'Pizza',
      price: '',
      originalPrice: '',
      description: '',
      available: true,
      imageUrl: '',
      imageFile: null,
      allergens: [],
      dishTags: [],
      ingredients: [],
      optionGroups: [],
      singleSupplements: [],
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

  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  };

  const handlePublish = () => {
    const restaurantId = `r-${Date.now()}`;
    const slug = slugify(info.name);
    const convertHoursToStorage = (hoursRecord: Record<string, DayHours>) => {
      const result: Record<string, any> = {};
      DAYS.forEach((d) => {
        const dayData = hoursRecord[d];
        result[d] = {
          enabled: dayData.open,
          suspended: false,
          lunch: { from: dayData.lunch.from, to: dayData.lunch.to },
          dinner: { from: dayData.dinner.from, to: dayData.dinner.to },
          lunchEnabled: dayData.lunchEnabled !== false,
          dinnerEnabled: dayData.dinnerEnabled !== false,
        };
      });
      return result;
    };

    const serviceHoursObj = {
      general: convertHoursToStorage(hours),
      pickup: convertHoursToStorage(pickupHours.hours),
      delivery: convertHoursToStorage(deliveryHours.hours),
      reservation: convertHoursToStorage(bookingHours.hours),
    };

    const serviceHoursDataToSave = {
      serviceHours: serviceHoursObj,
      useGeneral: {
        pickup: !pickupHours.useCustom,
        delivery: !deliveryHours.useCustom,
        reservation: !bookingHours.useCustom,
      },
      serviceSuspended: {
        pickup: false,
        delivery: false,
        reservation: false,
      },
    };

    localStorage.setItem(`iGO_service_hours_${restaurantId}`, JSON.stringify(serviceHoursDataToSave));
    const settingsObj = {
      profile: {
        name: info.name,
        logoUrl: info.logoUrl,
        backgroundImageUrl: info.backgroundImageUrl,
        description: info.description,
        phone: info.phone,
        email: info.email,
        website: info.website,
        address: info.address,
        city: info.city,
        province: info.province,
        cap: info.cap,
        vatNumber: info.vatNumber,
      },
      minOrder: zones[0]?.minOrder || 0,
      deliveryFee: zones[0]?.deliveryFee || 0,
      freeDeliveryActive: (zones[0]?.freeDeliveryThreshold || 0) > 0,
      freeDeliveryThreshold: zones[0]?.freeDeliveryThreshold || 0,
      paymentMethods: {
        card_delivery: paymentConfig.card_delivery,
        card_pickup: paymentConfig.card_pickup,
        cash_delivery: paymentConfig.cash_delivery,
        cash_pickup: paymentConfig.cash_pickup,
        cash: paymentConfig.cash_delivery || paymentConfig.cash_pickup,
        card: paymentConfig.card_delivery || paymentConfig.card_pickup,
        stripe_enabled: paymentConfig.stripe_enabled,
        stripe_connected: paymentConfig.stripe_connected,
        stripe_account_label: paymentConfig.stripe_account_label,
        paypal_enabled: paymentConfig.paypal_enabled,
        paypal_connected: paymentConfig.paypal_connected,
        paypal_email: paymentConfig.paypal_email,
        iban_enabled: paymentConfig.iban_enabled,
        onlinePaymentAccount: paymentConfig.onlinePaymentAccount,
        ibanHolder: paymentConfig.ibanHolder,
      },
      orderModes: {
        delivery: zones.some((z) => z.enabled),
        pickup: true,
        table: tableBooking.enabled,
      },
      tableBooking,
      scheduledOrders,
    };

    const newRestaurant = {
      id: restaurantId,
      name: info.name,
      address: info.address,
      city: info.city,
      status: 'active' as const,
      owner: info.name + ' Owner',
      email: info.email,
      phone: info.phone,
      createdAt: new Date().toISOString().split('T')[0],
      menuItems: menuItems.length,
      ordersToday: 0,
      category: info.category,
      hours: hours,
      serviceHours: serviceHoursObj,
      zones: zones,
      paymentMethods: settingsObj.paymentMethods,
      tableBooking,
      scheduledOrders,
    };

    try {
      const domainMenuItems: MenuItem[] = menuItems.map((item) => {
        let visibility: 'always' | 'hidden' | 'scheduled' = 'always';
        let visibilitySchedule: { from: string; to: string } | undefined = undefined;

        if (item.visibility.mode === 'hidden') {
          visibility = 'hidden';
        } else if (item.visibility.mode === 'time_range' || item.visibility.mode === 'date_range') {
          visibility = 'scheduled';
          visibilitySchedule = {
            from: item.visibility.timeFrom,
            to: item.visibility.timeTo,
          };
        }

        const mappedOptionGroups: OptionGroup[] = item.optionGroups.map((groupId) => {
          const matchedGroup = optionGroups.find((g) => g.id === groupId);
          if (!matchedGroup) return null;
          return {
            id: matchedGroup.id,
            name: matchedGroup.name,
            minSelections: matchedGroup.minSelections !== undefined ? matchedGroup.minSelections : 0,
            maxSelections: matchedGroup.maxSelections !== undefined ? matchedGroup.maxSelections : null,
            choices: matchedGroup.choices.map((c) => ({
              id: c.id,
              name: c.name,
              price: c.price.toString(),
            })),
          };
        }).filter((g): g is OptionGroup => g !== null);

        if (item.singleSupplements && item.singleSupplements.length > 0) {
          mappedOptionGroups.push({
            id: 'supplementi-singoli',
            name: 'Supplementi Singoli',
            minSelections: 0,
            maxSelections: null,
            choices: item.singleSupplements.map((c) => ({
              id: c.id,
              name: c.name,
              price: c.price.toString(),
            })),
          });
        }

        const isPromoActive = !!item.originalPrice && parseFloat(item.originalPrice) > 0;
        const listPrice = parseFloat(item.price) || 0;
        const promoPrice = isPromoActive ? parseFloat(item.originalPrice!) : undefined;

        return {
          id: item.id || `mi-${Date.now()}-${Math.random()}`,
          name: item.name,
          category: item.category,
          price: isPromoActive ? promoPrice! : listPrice,
          originalPrice: isPromoActive ? listPrice : undefined,
          description: item.description,
          available: item.available,
          image: item.imageUrl,
          imageAlt: item.name,
          allergens: item.allergens,
          dishTags: item.dishTags || [],
          ingredients: item.ingredients || [],
          orders: 0,
          visibility,
          visibilitySchedule,
          optionGroups: mappedOptionGroups,
        };
      });

      localStorage.setItem(`iGO_menu_items_${restaurantId}`, JSON.stringify(domainMenuItems));
      localStorage.setItem(`iGO_menu_items_${slug}`, JSON.stringify(domainMenuItems));

      localStorage.setItem(`iGO_service_hours_${restaurantId}`, JSON.stringify(serviceHoursDataToSave));
      localStorage.setItem(`iGO_service_hours_${slug}`, JSON.stringify(serviceHoursDataToSave));
      localStorage.setItem(`iGO_zones_${restaurantId}`, JSON.stringify(zones));

      const saved = JSON.parse(localStorage.getItem('iGOdelivering_restaurants') || '[]');
      saved.push(newRestaurant);
      localStorage.setItem('iGOdelivering_restaurants', JSON.stringify(saved));

      localStorage.setItem(`iGO_settings_${restaurantId}`, JSON.stringify(settingsObj));
      localStorage.setItem(`iGO_settings_${slug}`, JSON.stringify(settingsObj));
    } catch (e) {
      console.error('Error saving restaurant or settings', e);
    }

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
          role="admin"
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
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
        role="admin"
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Topbar
          role="admin"
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMobileMenuOpen={() => setIsMobileOpen(true)}
          leftContent={
            <div className="flex items-center gap-2">
              <Link
                href="/admin/restaurants"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
              >
                <ArrowLeft size={15} />
                <span className="hidden sm:inline">Ristoranti</span>
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-semibold text-foreground">Nuovo Ristorante</span>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto overscroll-contain">
          {/* Wizard Progress Header */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
            {/* Mobile: compact progress view */}
            <div className="sm:hidden px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Step {currentIndex + 1} di {steps.length}
                  </p>
                  <h2 className="text-sm font-bold text-foreground">{currentStepMeta.label}</h2>
                </div>
                <span className="text-xs font-semibold text-primary">{progressPercent}%</span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Desktop: step pills */}
            <div className="hidden sm:flex items-center gap-0 px-6 py-3 overflow-x-auto scrollbar-hide">
              {steps.map((step, idx) => {
                const isCompleted = stepOrder.indexOf(step.id) < currentIndex;
                const isCurrent = step.id === currentStep;
                return (
                  <React.Fragment key={step.id}>
                    <button
                      onClick={() =>
                        stepOrder.indexOf(step.id) < currentIndex && setCurrentStep(step.id)
                      }
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
                        isCurrent
                          ? 'bg-primary text-white shadow-sm shadow-primary/30'
                          : isCompleted
                            ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer'
                            : 'text-muted-foreground cursor-default'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          isCurrent
                            ? 'bg-white/25'
                            : isCompleted
                              ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isCompleted ? <Check size={11} /> : idx + 1}
                      </span>
                      {step.label}
                    </button>
                    {idx < steps.length - 1 && (
                      <ChevronRight
                        size={14}
                        className={`flex-shrink-0 mx-0.5 ${
                          isCompleted ? 'text-emerald-400' : 'text-border'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Mobile step description */}
            <div className="sm:hidden">
              <p className="text-xs text-muted-foreground">{currentStepMeta.description}</p>
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
                toggleSlot={toggleSlot}
                pickupHours={pickupHours}
                setPickupHours={setPickupHours}
                deliveryHours={deliveryHours}
                setDeliveryHours={setDeliveryHours}
                bookingHours={bookingHours}
                setBookingHours={setBookingHours}
                toggleServiceDay={toggleServiceDay}
                toggleServiceSlot={toggleServiceSlot}
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
            {currentStep === 'payment' && (
              <PaymentStep paymentConfig={paymentConfig} setPaymentConfig={setPaymentConfig} />
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
                addWizardOptionGroup={(minSel, maxSel) => {
                  if (!newGroupName.trim()) return;
                  setOptionGroups((p) => [
                    ...p,
                    {
                      id: `og-${Date.now()}`,
                      name: newGroupName.trim(),
                      choices: newGroupChoices.filter((c) => c.name.trim()),
                      appliedTo: [],
                      minSelections: minSel ?? 0,
                      maxSelections: maxSel !== undefined ? maxSel : null,
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

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button
                onClick={() => setCurrentStep(stepOrder[currentIndex - 1])}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-0 transition-all"
              >
                <ChevronLeftIcon size={16} />
                Indietro
              </button>
              {currentStep !== 'review' && (
                <button
                  onClick={() => setCurrentStep(stepOrder[currentIndex + 1])}
                  className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all"
                >
                  Continua
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
