'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import {
  ArrowLeft,
  ChevronRight,
  Check,
  ChevronLeft as ChevronLeftIcon,
  Users,
  Save,
  ChevronDown
} from 'lucide-react';
import type { PaymentConfig } from '@/components/admin/restaurant-wizard/PaymentStep';

// Dynamic step imports for lazy loading
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
  MenuItemDraft,
  OptionGroup,
  MenuItem
} from '@/types';

import {
  DAYS,
  ALLERGENS_LIST,
  DEFAULT_CATEGORIES,
  TIME_UNITS,
  TIME_WINDOWS
} from '@/lib/constants';

type WizardStep = 'info' | 'delivery' | 'hours' | 'scheduled' | 'payment' | 'menu' | 'review';

const steps: { id: WizardStep; label: string; description: string }[] = [
  { id: 'info', label: 'Informazioni', description: 'Dati anagrafici e contatti' },
  { id: 'delivery', label: 'Consegna', description: 'Zone e tariffe di consegna' },
  { id: 'hours', label: 'Orari', description: 'Orari di apertura e servizio' },
  { id: 'scheduled', label: 'Programmati', description: 'Ordini prenotati in anticipo' },
  { id: 'payment', label: 'Pagamento', description: 'Metodi di pagamento accettati' },
  { id: 'menu', label: 'Menu', description: 'Categorie, piatti e opzioni' },
  { id: 'review', label: 'Salva', description: 'Revisione e salvataggio' },
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

export default function RestaurantConfigurePage() {
  const params = useParams();
  const restaurantId = params?.id as string;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>('info');
  const [saved, setSaved] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // --- STATE ---
  const [restaurantStatus, setRestaurantStatus] = useState<string>('draft');
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
  const stepOrder: WizardStep[] = [
    'info', 'delivery', 'hours', 'scheduled', 'payment', 'menu', 'review',
  ];
  const currentIndex = stepOrder.indexOf(currentStep);
  const progressPercent = Math.round((currentIndex / (stepOrder.length - 1)) * 100);
  const currentStepMeta = steps[currentIndex];

  const statusLabel: Record<string, string> = {
    published: 'Pubblicato',
    draft: 'Bozza',
    suspended: 'Sospeso',
  };

  const statusBadgeClass: Record<string, string> = {
    published: 'bg-[var(--success-bg)] text-[var(--success)]',
    draft: 'bg-muted text-muted-foreground',
    suspended: 'bg-[var(--danger-bg)] text-[var(--danger)]',
  };

  // --- Hydration ---
  useEffect(() => {
    if (!restaurantId) return;

    try {
      let foundRestaurant: any = null;
      try {
        const delivering = JSON.parse(localStorage.getItem('iGOdelivering_restaurants') || '[]');
        foundRestaurant = delivering.find((r: any) => r.id === restaurantId);
      } catch (e) {}

      if (!foundRestaurant) {
        try {
          const gloria = JSON.parse(localStorage.getItem('gloriaorder_restaurants') || '[]');
          foundRestaurant = gloria.find((r: any) => r.id === restaurantId);
        } catch (e) {}
      }

      if (!foundRestaurant) {
        foundRestaurant = mockRestaurants.find((r: any) => r.id === restaurantId) || mockRestaurants[0];
      }

      const slugify = (text: string) => {
        return text
          .toString()
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-')
          .replace(/[^\w\-]+/g, '')
          .replace(/\-\-+/g, '-');
      };
      const slug = foundRestaurant ? slugify(foundRestaurant.name) : 'pizzeria-bella-napoli';

      const infoData: RestaurantInfo = {
        name: foundRestaurant?.name || '',
        category: foundRestaurant?.category || 'Pizzeria',
        description: foundRestaurant?.description || '',
        phone: foundRestaurant?.phone || '',
        email: foundRestaurant?.email || '',
        website: foundRestaurant?.website || '',
        address: foundRestaurant?.address || '',
        city: foundRestaurant?.city || '',
        province: foundRestaurant?.province || '',
        cap: foundRestaurant?.cap || '',
        vatNumber: foundRestaurant?.vatNumber || '',
        logoUrl: foundRestaurant?.logoUrl || foundRestaurant?.logo || '',
        backgroundImageUrl: foundRestaurant?.backgroundImageUrl || '',
      };

      setRestaurantStatus(foundRestaurant?.status || 'draft');

      let storedSettings: any = null;
      try {
        const rawId = localStorage.getItem(`iGO_settings_${restaurantId}`);
        const rawSlug = localStorage.getItem(`iGO_settings_${slug}`);
        const raw = rawId || rawSlug;
        if (raw) {
          storedSettings = JSON.parse(raw);
        }
      } catch (e) {}

      if (storedSettings) {
        const isDashboardFormat = storedSettings.profile && storedSettings.deliveryConfig;
        const profile = isDashboardFormat ? storedSettings.profile : storedSettings;

        if (profile.name) infoData.name = profile.name;
        if (profile.logoUrl) infoData.logoUrl = profile.logoUrl;
        if (profile.backgroundImageUrl) infoData.backgroundImageUrl = profile.backgroundImageUrl;
        if (profile.description) infoData.description = profile.description;
        if (profile.phone) infoData.phone = profile.phone;
        if (profile.email) infoData.email = profile.email;
        if (profile.website) infoData.website = profile.website;
        if (profile.address) infoData.address = profile.address;
        if (profile.city) infoData.city = profile.city;
        if (profile.province) infoData.province = profile.province;
        if (profile.cap) infoData.cap = profile.cap;
        if (profile.vatNumber) infoData.vatNumber = profile.vatNumber;
      }

      setInfo(infoData);

      // Restore Payment config
      const paymentConfigData: PaymentConfig = {
        card_delivery: true,
        card_pickup: true,
        cash_delivery: true,
        cash_pickup: true,
      };
      if (storedSettings?.paymentMethods) {
        const pm = storedSettings.paymentMethods;
        paymentConfigData.card_delivery = pm.card_delivery ?? pm.card ?? true;
        paymentConfigData.card_pickup = pm.card_pickup ?? pm.card ?? true;
        paymentConfigData.cash_delivery = pm.cash_delivery ?? pm.cash ?? true;
        paymentConfigData.cash_pickup = pm.cash_pickup ?? pm.cash ?? true;
      } else if (foundRestaurant?.paymentMethods) {
        const pm = foundRestaurant.paymentMethods;
        paymentConfigData.card_delivery = pm.card_delivery ?? pm.card ?? true;
        paymentConfigData.card_pickup = pm.card_pickup ?? pm.card ?? true;
        paymentConfigData.cash_delivery = pm.cash_delivery ?? pm.cash ?? true;
        paymentConfigData.cash_pickup = pm.cash_pickup ?? pm.cash ?? true;
      }
      setPaymentConfig(paymentConfigData);

      // Restore Table booking
      const tableBookingData: TableBookingConfig = {
        enabled: false,
        maxGuests: 8,
        slotDuration: 90,
        advanceBookingDays: 30,
        serviceEnabled: true,
      };
      if (storedSettings?.tableBooking) {
        const tb = storedSettings.tableBooking;
        tableBookingData.enabled = tb.enabled ?? false;
        tableBookingData.maxGuests = tb.maxGuests ?? 8;
        tableBookingData.slotDuration = tb.slotDuration ?? 90;
        tableBookingData.advanceBookingDays = tb.advanceBookingDays ?? 30;
        tableBookingData.serviceEnabled = tb.serviceEnabled ?? true;
      } else if (foundRestaurant?.tableBooking) {
        const tb = foundRestaurant.tableBooking;
        tableBookingData.enabled = tb.enabled ?? false;
        tableBookingData.maxGuests = tb.maxGuests ?? 8;
        tableBookingData.slotDuration = tb.slotDuration ?? 90;
        tableBookingData.advanceBookingDays = tb.advanceBookingDays ?? 30;
        tableBookingData.serviceEnabled = tb.serviceEnabled ?? true;
      }
      setTableBooking(tableBookingData);

      // Restore Scheduled orders config
      const scheduledOrdersData: ScheduledOrdersConfig = {
        enabled: true,
        pickup: { minNoticeValue: 30, minNoticeUnit: 'minuti', maxNoticeDays: 4 },
        delivery: { minNoticeValue: 1, minNoticeUnit: 'ore', maxNoticeDays: 4, timeWindowMinutes: 15 },
        onPremise: { minNoticeValue: 30, minNoticeUnit: 'minuti', maxNoticeDays: 1 },
        hideAsap: false,
        pickupExpanded: true,
        deliveryExpanded: true,
        onPremiseExpanded: true,
        altroExpanded: true,
      };
      if (storedSettings?.scheduledOrders) {
        const so = storedSettings.scheduledOrders;
        scheduledOrdersData.enabled = so.enabled ?? true;
        if (so.pickup) scheduledOrdersData.pickup = { ...scheduledOrdersData.pickup, ...so.pickup };
        if (so.delivery) scheduledOrdersData.delivery = { ...scheduledOrdersData.delivery, ...so.delivery };
        if (so.onPremise) scheduledOrdersData.onPremise = { ...scheduledOrdersData.onPremise, ...so.onPremise };
        scheduledOrdersData.hideAsap = so.hideAsap ?? false;
      } else if (foundRestaurant?.scheduledOrders) {
        const so = foundRestaurant.scheduledOrders;
        scheduledOrdersData.enabled = so.enabled ?? true;
        if (so.pickup) scheduledOrdersData.pickup = { ...scheduledOrdersData.pickup, ...so.pickup };
        if (so.delivery) scheduledOrdersData.delivery = { ...scheduledOrdersData.delivery, ...so.delivery };
        if (so.onPremise) scheduledOrdersData.onPremise = { ...scheduledOrdersData.onPremise, ...so.onPremise };
        scheduledOrdersData.hideAsap = so.hideAsap ?? false;
      }
      setScheduledOrders(scheduledOrdersData);

      // Restore Zones
      let zonesData: DeliveryZone[] = [
        {
          id: 'z-1',
          name: 'Zona Centro',
          radius: 3,
          minOrder: 0,
          deliveryFee: 2.5,
          freeDeliveryThreshold: 35,
          enabled: true,
        },
      ];
      try {
        const storedZones = localStorage.getItem(`iGO_zones_${restaurantId}`);
        if (storedZones) {
          zonesData = JSON.parse(storedZones);
        } else if (foundRestaurant?.zones) {
          zonesData = foundRestaurant.zones;
        }
      } catch (e) {}
      setZones(zonesData);

      // Restore hours
      let hoursData: Record<string, DayHours> = defaultDayHours();
      if (foundRestaurant?.hours) {
        const loaded = foundRestaurant.hours;
        DAYS.forEach((d) => {
          if (loaded[d]) {
            hoursData[d] = {
              ...loaded[d],
              lunchEnabled: loaded[d].lunchEnabled !== false,
              dinnerEnabled: loaded[d].dinnerEnabled !== false,
            };
          }
        });
      }
      setHours(hoursData);

      // Restore service-specific hours
      const defaultServiceHoursObj = (): ServiceHours => ({
        useCustom: false,
        hours: defaultDayHours(),
      });

      let pickupHoursData: ServiceHours = defaultServiceHoursObj();
      let deliveryHoursData: ServiceHours = defaultServiceHoursObj();
      let bookingHoursData: ServiceHours = defaultServiceHoursObj();

      try {
        const storedHoursStr = localStorage.getItem(`iGO_service_hours_${restaurantId}`);
        let rawServiceHours: any = null;
        if (storedHoursStr) {
          const parsed = JSON.parse(storedHoursStr);
          rawServiceHours = parsed.serviceHours;
        } else if (foundRestaurant?.serviceHours) {
          rawServiceHours = foundRestaurant.serviceHours;
        }

        if (rawServiceHours) {
          const convertToWizardFormat = (daysRecord: any): Record<string, DayHours> => {
            const h = defaultDayHours();
            DAYS.forEach((d) => {
              const dayData = daysRecord?.[d];
              if (dayData) {
                h[d] = {
                  open: dayData.enabled ?? dayData.open ?? true,
                  lunch: dayData.lunch ? { from: dayData.lunch.from || '12:00', to: dayData.lunch.to || '14:30' } : { from: '12:00', to: '14:30' },
                  dinner: dayData.dinner ? { from: dayData.dinner.from || '19:00', to: dayData.dinner.to || '22:30' } : { from: '19:00', to: '22:30' },
                  lunchEnabled: dayData.lunchEnabled !== false,
                  dinnerEnabled: dayData.dinnerEnabled !== false,
                };
              }
            });
            return h;
          };

          if (rawServiceHours.pickup) {
            pickupHoursData = {
              useCustom: true,
              hours: convertToWizardFormat(rawServiceHours.pickup),
            };
          }
          if (rawServiceHours.delivery) {
            deliveryHoursData = {
              useCustom: true,
              hours: convertToWizardFormat(rawServiceHours.delivery),
            };
          }
          if (rawServiceHours.reservation) {
            bookingHoursData = {
              useCustom: true,
              hours: convertToWizardFormat(rawServiceHours.reservation),
            };
          }
        }
      } catch (e) {}

      setPickupHours(pickupHoursData);
      setDeliveryHours(deliveryHoursData);
      setBookingHours(bookingHoursData);

      // Restore Menu and options
      let menuItemsData: MenuItemDraft[] = [];
      let categoriesData: string[] = [...DEFAULT_CATEGORIES];

      try {
        const storedMenu = localStorage.getItem(`iGO_menu_items_${slug}`) || localStorage.getItem(`iGO_menu_items_${restaurantId}`);
        if (storedMenu) {
          menuItemsData = JSON.parse(storedMenu);
        } else if (foundRestaurant?.menuItems && Array.isArray(foundRestaurant.menuItems)) {
          menuItemsData = foundRestaurant.menuItems;
        }

        if (foundRestaurant?.menuCategories && Array.isArray(foundRestaurant.menuCategories)) {
          categoriesData = foundRestaurant.menuCategories;
        } else if (menuItemsData.length > 0) {
          const uniqueCats = Array.from(new Set(menuItemsData.map((item) => item.category)));
          if (uniqueCats.length > 0) {
            categoriesData = uniqueCats;
          }
        }
      } catch (e) {}

      setMenuCategories(categoriesData);

      const groupMap = new Map<string, WizardOptionGroup>();
      menuItemsData.forEach((item) => {
        if (item.optionGroups && Array.isArray(item.optionGroups)) {
          item.optionGroups.forEach((group) => {
            if (!groupMap.has(group.id)) {
              groupMap.set(group.id, {
                id: group.id,
                name: group.name,
                choices: group.choices ? group.choices.map((c) => ({
                  id: c.id,
                  name: c.name,
                  price: typeof c.price === 'string' ? parseFloat(c.price) || 0 : c.price,
                })) : [],
                appliedTo: [],
              });
            }
            const existingGroup = groupMap.get(group.id)!;
            if (!existingGroup.appliedTo.includes(item.id)) {
              existingGroup.appliedTo.push(item.id);
            }
          });
        }
      });

      const mappedWizardGroups = Array.from(groupMap.values());
      setOptionGroups(mappedWizardGroups);

      const mappedWizardItems: MenuItemWizardDraft[] = menuItemsData.map((item) => {
        const mode: 'always' | 'hidden' | 'time_range' | 'date_range' =
          item.visibility === 'scheduled' ? 'time_range' : item.visibility;
        const timeFrom = item.visibilitySchedule?.from || '10:00';
        const timeTo = item.visibilitySchedule?.to || '15:00';

        const visibility = {
          mode,
          timeFrom,
          timeTo,
          days: [...DAYS],
          dateFrom: '',
          dateFromTime: '10:00',
          dateTo: '',
          dateToTime: '15:00',
        };

        const itemOptionGroupIds = item.optionGroups ? item.optionGroups.map((g) => g.id) : [];

        const hasPromo = item.originalPrice !== undefined && item.originalPrice !== null && Number(item.originalPrice) > 0;
        const draftPrice = hasPromo ? item.originalPrice!.toString() : item.price.toString();
        const draftOriginalPrice = hasPromo ? item.price.toString() : '';

        return {
          id: item.id,
          name: item.name,
          category: item.category,
          price: draftPrice,
          originalPrice: draftOriginalPrice,
          description: item.description || '',
          available: item.available,
          imageUrl: (item as any).image || item.imageUrl || '',
          allergens: item.allergens || [],
          imageFile: null,
          optionGroups: itemOptionGroupIds,
          visibility,
        };
      });

      setMenuItems(mappedWizardItems);
      setIsHydrated(true);
    } catch (err) {
      console.error('Error hydrating configuration page:', err);
    }
  }, [restaurantId]);

  // --- SAVE LOGIC ---
  const handleSave = () => {
    try {
      const slugify = (text: string) => {
        return text
          .toString()
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-')
          .replace(/[^\w\-]+/g, '')
          .replace(/\-\-+/g, '-');
      };
      const slug = slugify(info.name);

      // 1. Wizard items to domain items
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
            choices: matchedGroup.choices.map((c) => ({
              id: c.id,
              name: c.name,
              price: c.price.toString(),
            })),
          };
        }).filter((g): g is OptionGroup => g !== null);

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
          allergens: item.allergens || [],
          orders: 0,
          visibility,
          visibilitySchedule,
          optionGroups: mappedOptionGroups,
        };
      });

      // 2. Wizard service hours to service hours storage format
      const convertServiceHoursToStorage = (wizardSvc: ServiceHours) => {
        const result: Record<string, any> = {};
        DAYS.forEach((d) => {
          const dayData = wizardSvc.useCustom ? wizardSvc.hours[d] : hours[d];
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
        pickup: convertServiceHoursToStorage(pickupHours),
        delivery: convertServiceHoursToStorage(deliveryHours),
        reservation: convertServiceHoursToStorage(bookingHours),
      };

      const serviceHoursDataToSave = {
        serviceHours: serviceHoursObj,
        serviceSuspended: {
          pickup: false,
          delivery: false,
          reservation: false,
        },
      };

      // Save service hours
      localStorage.setItem(`iGO_service_hours_${restaurantId}`, JSON.stringify(serviceHoursDataToSave));

      // Save zones
      localStorage.setItem(`iGO_zones_${restaurantId}`, JSON.stringify(zones));

      // Save settings
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
          paypal: false,
        },
        orderModes: {
          delivery: zones.some((z) => z.enabled),
          pickup: true,
          table: tableBooking.enabled,
        },
        tableBooking,
        scheduledOrders,
      };
      localStorage.setItem(`iGO_settings_${restaurantId}`, JSON.stringify(settingsObj));
      localStorage.setItem(`iGO_settings_${slug}`, JSON.stringify(settingsObj));

      // Save menu items
      localStorage.setItem(`iGO_menu_items_${slug}`, JSON.stringify(domainMenuItems));
      localStorage.setItem(`iGO_menu_items_${restaurantId}`, JSON.stringify(domainMenuItems));

      // Save in restaurant lists
      const saveRestaurantInList = (key: string) => {
        try {
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          const idx = list.findIndex((r: any) => r.id === restaurantId);
          const updatedRestaurant = {
            ...(idx >= 0 ? list[idx] : {}),
            id: restaurantId,
            name: info.name,
            address: info.address,
            city: info.city,
            status: restaurantStatus,
            owner: info.name + ' Owner',
            email: info.email,
            phone: info.phone,
            createdAt: idx >= 0 ? (list[idx].createdAt || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
            menuItems: domainMenuItems.length,
            category: info.category,
            hours: hours,
            serviceHours: serviceHoursObj,
            zones: zones,
            paymentMethods: settingsObj.paymentMethods,
            tableBooking,
            scheduledOrders,
          };

          if (idx >= 0) {
            list[idx] = updatedRestaurant;
          } else {
            list.push(updatedRestaurant);
          }
          localStorage.setItem(key, JSON.stringify(list));
        } catch (e) {}
      };

      saveRestaurantInList('iGOdelivering_restaurants');
      saveRestaurantInList('gloriaorder_restaurants');

      // Dispatch change notifications
      window.dispatchEvent(new CustomEvent('iGO_settings_updated'));
      window.dispatchEvent(new CustomEvent('iGO_service_hours_updated', { detail: serviceHoursDataToSave }));
      window.dispatchEvent(new CustomEvent(`iGO_service_hours_${restaurantId}_updated`, { detail: serviceHoursDataToSave }));

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error('Error saving restaurant configuration:', e);
    }
  };

  // --- ACTIONS ---
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

  if (!isHydrated) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
              <span className="text-sm font-semibold text-foreground">{info.name || 'Configura'}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm text-muted-foreground">Configura</span>
            </div>
          }
          rightExtra={
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/restaurants/${restaurantId}/access`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border"
              >
                <Users size={15} />
                Accessi
              </Link>
              <button
                onClick={handleSave}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 cursor-pointer shadow-lg ${
                  saved
                    ? 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]/30 shadow-none'
                    : 'bg-primary text-white hover:bg-[#d43d22] shadow-primary/20'
                }`}
              >
                {saved ? <Check size={15} /> : <Save size={15} />}
                {saved ? 'Salvato!' : 'Salva modifiche'}
              </button>
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
            <div className="hidden sm:flex items-center gap-0 px-6 py-3 overflow-x-auto scrollbar-none">
              {steps.map((step, idx) => {
                const isCompleted = stepOrder.indexOf(step.id) < currentIndex;
                const isCurrent = step.id === currentStep;
                return (
                  <React.Fragment key={step.id}>
                    <button
                      onClick={() => setCurrentStep(step.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
                        isCurrent
                          ? 'bg-primary text-white shadow-sm shadow-primary/30'
                          : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          isCurrent
                            ? 'bg-white/25'
                            : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600'
                        }`}
                      >
                        {isCompleted ? <Check size={11} /> : idx + 1}
                      </span>
                      {step.label}
                    </button>
                    {idx < steps.length - 1 && (
                      <ChevronRight
                        size={14}
                        className="flex-shrink-0 mx-0.5 text-border"
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* ── Page Header / Status dropdown ── */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Configura Ristorante</h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-sm text-muted-foreground">{info.name || 'Ristorante'}</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      statusBadgeClass[restaurantStatus] || statusBadgeClass['draft']
                    }`}
                  >
                    {statusLabel[restaurantStatus] || restaurantStatus}
                  </span>
                </div>
              </div>
              {/* Status selector */}
              <div className="relative flex-shrink-0">
                <select
                  value={restaurantStatus}
                  onChange={(e) => setRestaurantStatus(e.target.value)}
                  className="px-3.5 py-2.5 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring pr-8 font-medium text-base"
                >
                  <option value="published">Pubblicato</option>
                  <option value="draft">Bozza</option>
                  <option value="suspended">Sospeso</option>
                </select>
              </div>
            </div>

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
                handlePublish={handleSave}
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
              {currentStep !== 'review' ? (
                <button
                  onClick={() => setCurrentStep(stepOrder[currentIndex + 1])}
                  className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all"
                >
                  Continua
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 ${
                    saved
                      ? 'bg-[var(--success-bg)] text-[var(--success)]'
                      : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'
                  }`}
                >
                  {saved ? <Check size={16} /> : <Save size={16} />}
                  {saved ? 'Modifiche Salvate!' : 'Salva Modifiche'}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
