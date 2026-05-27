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
  ChevronDown,
  QrCode,
  Printer,
  Download,
  Plus,
  Minus,
  Tag,
  Percent,
  Euro,
  Calendar,
  Edit2,
  Trash2,
  UserCheck,
  TrendingUp,
  Info,
  AlertCircle
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
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
  MenuItem,
  PromoCode,
  PromoType
} from '@/types';

import {
  DAYS,
  ALLERGENS_LIST,
  DEFAULT_CATEGORIES,
  TIME_UNITS,
  TIME_WINDOWS
} from '@/lib/constants';

import Toggle from '@/components/ui/Toggle';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

type WizardStep = 'info' | 'delivery' | 'hours' | 'scheduled' | 'payment' | 'menu' | 'tavoli' | 'promozioni' | 'review';

const steps: { id: WizardStep; label: string; description: string }[] = [
  { id: 'info', label: 'Informazioni', description: 'Dati anagrafici e contatti' },
  { id: 'delivery', label: 'Consegna', description: 'Zone e tariffe di consegna' },
  { id: 'hours', label: 'Orari', description: 'Orari di apertura e servizio' },
  { id: 'scheduled', label: 'Programmati', description: 'Ordini prenotati in anticipo' },
  { id: 'payment', label: 'Pagamento', description: 'Metodi di pagamento accettati' },
  { id: 'menu', label: 'Menu', description: 'Categorie, piatti e opzioni' },
  { id: 'tavoli', label: 'Tavoli & QR', description: 'Configurazione tavoli e QR code' },
  { id: 'promozioni', label: 'Promozioni', description: 'Codici sconto e offerte' },
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
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);

  // Promo Form states
  const [promoCode, setPromoCode] = useState('');
  const [promoType, setPromoType] = useState<PromoType>('percentage');
  const [promoValue, setPromoValue] = useState('10');
  const [promoMinOrder, setPromoMinOrder] = useState('15');
  const [promoStart, setPromoStart] = useState('');
  const [promoEnd, setPromoEnd] = useState('');
  const [promoActive, setPromoActive] = useState(true);
  const [promoDesc, setPromoDesc] = useState('');
  const [promoMaxUses, setPromoMaxUses] = useState('');
  const [promoCustomBanner, setPromoCustomBanner] = useState('');
  const [promoModes, setPromoModes] = useState<('domicilio' | 'asporto' | 'tavolo')[]>(['domicilio', 'asporto', 'tavolo']);

  const handleTogglePromo = (id: string) => {
    setPromos(promos.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  };

  const handleOpenAddPromoModal = () => {
    setEditingPromo(null);
    setPromoCode('');
    setPromoType('percentage');
    setPromoValue('10');
    setPromoMinOrder('0');
    setPromoStart('');
    setPromoEnd('');
    setPromoActive(true);
    setPromoDesc('');
    setPromoMaxUses('');
    setPromoCustomBanner('');
    setPromoModes(['domicilio', 'asporto', 'tavolo']);
    setShowPromoModal(true);
  };

  const handleOpenEditPromoModal = (promo: PromoCode) => {
    setEditingPromo(promo);
    setPromoCode(promo.code);
    setPromoType(promo.type);
    setPromoValue(promo.value.toString());
    setPromoMinOrder((promo.minOrderSubtotal || 0).toString());
    setPromoStart(promo.startDate || '');
    setPromoEnd(promo.endDate || '');
    setPromoActive(promo.active);
    setPromoDesc(promo.description || '');
    setPromoMaxUses(promo.maxUses !== undefined ? promo.maxUses.toString() : '');
    setPromoCustomBanner(promo.customBannerText || '');
    setPromoModes(promo.applicableDeliveryModes || ['domicilio', 'asporto', 'tavolo']);
    setShowPromoModal(true);
  };

  const handleDeletePromo = (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questo codice promozionale?')) {
      setPromos(promos.filter((p) => p.id !== id));
    }
  };

  const handlePromoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;

    const cleanCode = promoCode.trim().toUpperCase().replace(/\s+/g, '');

    const promoData: PromoCode = {
      id: editingPromo ? editingPromo.id : `promo-${Date.now()}`,
      code: cleanCode,
      type: promoType,
      value: promoType === 'free_delivery' ? 0 : parseFloat(promoValue) || 0,
      minOrderSubtotal: parseFloat(promoMinOrder) || undefined,
      active: promoActive,
      startDate: promoStart ? promoStart : undefined,
      endDate: promoEnd ? promoEnd : undefined,
      description: promoDesc.trim() ? promoDesc.trim() : undefined,
      maxUses: promoMaxUses ? parseInt(promoMaxUses, 10) : undefined,
      usedCount: editingPromo ? (editingPromo.usedCount || 0) : 0,
      customBannerText: promoCustomBanner.trim() ? promoCustomBanner.trim() : undefined,
      applicableDeliveryModes: promoModes.length > 0 ? promoModes : undefined,
    };

    if (editingPromo) {
      setPromos(promos.map((p) => (p.id === editingPromo.id ? promoData : p)));
    } else {
      setPromos([...promos, promoData]);
    }
    setShowPromoModal(false);
  };

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>('info');
  const [saved, setSaved] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [tableCount, setTableCount] = useState(0);
  const [tempTableCount, setTempTableCount] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
    onlinePaymentAccount: '',
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

  const restaurantSlug = info.name
    ? info.name
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '')
    : 'pizzeria-bella-napoli';


  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [localLogoUrl, setLocalLogoUrl] = useState<string>('');

  useEffect(() => {
    if (info.logoUrl) {
      if (info.logoUrl.startsWith('data:')) {
        setLocalLogoUrl(info.logoUrl);
      } else {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            try {
              setLocalLogoUrl(canvas.toDataURL('image/png'));
            } catch (e) {
              console.error('CORS issue with logo', e);
            }
          }
        };
        img.src = info.logoUrl;
      }
    } else {
      setLocalLogoUrl('');
    }
  }, [info.logoUrl]);

  const getCanvasDataUrl = (num: number) => {
    const canvas = document.getElementById(`qr-canvas-${num}`) as HTMLCanvasElement;
    if (canvas) {
      try { return canvas.toDataURL("image/png"); } catch(e) {}
    }
    const origin = isHydrated && typeof window !== 'undefined' ? window.location.origin : 'https://igodelivering.it';
    const tableUrl = `${origin}/menu/${restaurantSlug}?tavolo=${num}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(tableUrl)}&ecc=H`;
  };

  // --- HELPERS ---
  const stepOrder: WizardStep[] = [
    'info', 'delivery', 'hours', 'scheduled', 'payment', 'menu', 'tavoli', 'promozioni', 'review',
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
        onlinePaymentAccount: '',
      };
      if (storedSettings?.paymentMethods) {
        const pm = storedSettings.paymentMethods;
        paymentConfigData.card_delivery = pm.card_delivery ?? pm.card ?? true;
        paymentConfigData.card_pickup = pm.card_pickup ?? pm.card ?? true;
        paymentConfigData.cash_delivery = pm.cash_delivery ?? pm.cash ?? true;
        paymentConfigData.cash_pickup = pm.cash_pickup ?? pm.cash ?? true;
        paymentConfigData.onlinePaymentAccount = pm.onlinePaymentAccount ?? '';
      } else if (foundRestaurant?.paymentMethods) {
        const pm = foundRestaurant.paymentMethods;
        paymentConfigData.card_delivery = pm.card_delivery ?? pm.card ?? true;
        paymentConfigData.card_pickup = pm.card_pickup ?? pm.card ?? true;
        paymentConfigData.cash_delivery = pm.cash_delivery ?? pm.cash ?? true;
        paymentConfigData.cash_pickup = pm.cash_pickup ?? pm.cash ?? true;
        paymentConfigData.onlinePaymentAccount = pm.onlinePaymentAccount ?? '';
      }
      setPaymentConfig(paymentConfigData);

      // Restore Table count
      try {
        const storedTables = localStorage.getItem(`iGO_tables_${slug}`);
        if (storedTables) {
          const count = parseInt(storedTables, 10);
          if (!isNaN(count)) {
            setTableCount(count);
            setTempTableCount(count);
          }
        }
      } catch (e) {}

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

      // Restore promos
      try {
        const storedPromos = localStorage.getItem(`iGO_promos_${restaurantId}`);
        if (storedPromos) {
          const parsed = JSON.parse(storedPromos).map((p: any) => ({
            ...p,
            type: p.type === 'fixed' ? 'fixed_amount' : p.type,
          }));
          setPromos(parsed);
        } else {
          setPromos([]);
        }
      } catch (e) {}

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
          onlinePaymentAccount: paymentConfig.onlinePaymentAccount,
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

      // Save tables count
      localStorage.setItem(`iGO_tables_${slug}`, tableCount.toString());

      // Save menu items
      localStorage.setItem(`iGO_menu_items_${slug}`, JSON.stringify(domainMenuItems));
      localStorage.setItem(`iGO_menu_items_${restaurantId}`, JSON.stringify(domainMenuItems));

      // Save promos
      localStorage.setItem(`iGO_promos_${restaurantId}`, JSON.stringify(promos));

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
            {currentStep === 'tavoli' && (
              <div className="space-y-6">
                <div className="bg-card rounded-xl border border-border shadow-card p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
                    <div>
                      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                        Configurazione Tavoli & QR Code
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Definisci il numero di tavoli per {info.name || 'questo ristorante'} e genera i relativi codici QR.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const restName = info.name || 'Ristorante';
                        const printWindow = window.open('', '_blank');
                        if (!printWindow) return;
                        
                        const logoHtml = `
                          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                            <div style="font-size: 12px; font-weight: 700; color: #1e293b; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;">${restName}</div>
                          </div>
                        `;

                        let cardsHtml = '';
                        for (let i = 1; i <= tableCount; i++) {
                          const qrDataUrl = getCanvasDataUrl(i);
                          cardsHtml += `
                            <div class="card">
                              ${logoHtml}
                              <div class="qr-wrapper">
                                <img class="qr-image" src="${qrDataUrl}" alt="QR Code" />
                              </div>
                              <div>
                                <div class="table-badge">TAVOLO ${i}</div>
                                <div class="footer-text" style="margin-top: 4px;">Inquadra e Ordina</div>
                              </div>
                            </div>
                          `;
                        }
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Stampa QR Code - Tutti i Tavoli</title>
                              <style>
                                body {
                                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                                  margin: 0;
                                  padding: 0;
                                  background-color: #fff;
                                }
                                .grid {
                                  display: grid;
                                  grid-template-columns: repeat(3, 1fr);
                                  gap: 24px;
                                  padding: 24px;
                                  box-sizing: border-box;
                                }
                                .card {
                                  border: 1px solid #cbd5e1;
                                  border-radius: 12px;
                                  padding: 20px;
                                  text-align: center;
                                  width: 250px;
                                  height: 250px;
                                  display: flex;
                                  flex-direction: column;
                                  align-items: center;
                                  justify-content: space-between;
                                  box-sizing: border-box;
                                  page-break-inside: avoid;
                                  break-inside: avoid;
                                  margin: 0 auto;
                                  box-shadow: none;
                                }
                                .qr-wrapper {
                                  position: relative;
                                  display: inline-block;
                                  width: 155px;
                                  height: 155px;
                                  margin: 0 auto;
                                }
                                .qr-image {
                                  width: 155px;
                                  height: 155px;
                                  display: block;
                                }
                                .table-badge {
                                  background-color: #f97316;
                                  color: white;
                                  font-size: 13px;
                                  font-weight: 800;
                                  padding: 3px 12px;
                                  border-radius: 9999px;
                                  letter-spacing: 0.05em;
                                  display: inline-block;
                                }
                                .footer-text {
                                  font-size: 9px;
                                  color: #64748b;
                                  font-weight: 600;
                                  text-transform: uppercase;
                                  letter-spacing: 0.05em;
                                }
                                @media print {
                                  @page {
                                    size: A4 landscape;
                                    margin: 10mm;
                                  }
                                  body { padding: 0; display: block; }
                                  .grid { 
                                    display: grid; 
                                    grid-template-columns: repeat(3, 1fr); 
                                    grid-template-rows: repeat(2, auto);
                                    gap: 20px; 
                                    padding: 0;
                                  }
                                  .card { border: 1px solid #cbd5e1 !important; box-shadow: none !important; }
                                }
                              </style>
                            </head>
                            <body>
                              <div class="grid">${cardsHtml}</div>
                              <script>
                                window.onload = function() {
                                  setTimeout(function() { window.print(); window.close(); }, 1000);
                                };
                              </script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }}
                      className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-primary/95 transition-all shadow-xs"
                    >
                      <Printer size={13} />
                      Stampa Tutti i QR
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        Numero di Tavoli:
                      </label>
                      <div className="flex items-center border border-border rounded-lg bg-muted overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setTempTableCount((c) => Math.max(0, c - 1))}
                          className="p-2 hover:bg-border text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={150}
                          value={tempTableCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) setTempTableCount(Math.min(150, Math.max(0, val)));
                          }}
                          className="w-12 text-center text-sm font-bold bg-transparent border-0 focus:ring-0 focus:outline-none p-1"
                        />
                        <button
                          type="button"
                          onClick={() => setTempTableCount((c) => Math.min(150, c + 1))}
                          className="p-2 hover:bg-border text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTableCount(tempTableCount);
                          localStorage.setItem(`iGO_tables_${restaurantSlug}`, tempTableCount.toString());
                          setSaveSuccess(true);
                          setTimeout(() => setSaveSuccess(false), 2000);
                        }}
                        className="px-4 py-2 bg-zinc-950 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer"
                      >
                        Salva
                      </button>
                      {saveSuccess && (
                        <span className="flex items-center gap-0.5 text-xs text-[var(--success)] font-semibold">
                          <Check size={12} />
                          Applicato!
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {tableCount === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 bg-card rounded-2xl border border-dashed border-border text-center space-y-3">
                    <div className="p-3 bg-muted rounded-full text-muted-foreground">
                      <QrCode size={32} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Nessun tavolo configurato</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        Imposta il numero di tavoli sopra per iniziare a generare i codici QR.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: tableCount }, (_, i) => i + 1).map((num) => {
                    const origin = isHydrated && typeof window !== 'undefined' ? window.location.origin : 'https://igodelivering.it';
                    const tableUrl = `${origin}/menu/${restaurantSlug}?tavolo=${num}`;
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(tableUrl)}&ecc=H`;
                    return (
                      <div
                        key={`admin-table-qr-${num}`}
                        className="bg-card rounded-xl border border-border shadow-card p-4 flex flex-col items-center justify-between text-center space-y-4 group hover:border-primary/30 transition-colors"
                      >
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm text-foreground">Tavolo {num}</h4>
                          <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]" title={tableUrl}>
                            {tableUrl}
                          </p>
                        </div>

                        <div className="p-3 bg-muted rounded-xl border border-border/60 relative flex items-center justify-center min-h-[148px]">
                          <QRCodeCanvas
                            id={`qr-canvas-${num}`}
                            value={tableUrl}
                            size={512}
                            level="H"
                            includeMargin={true}
                            style={{ width: "132px", height: "132px" }}
                          />
                        </div>

                        <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                          <button
                            type="button"
                            onClick={() => {
                              const canvas = document.getElementById(`qr-canvas-${num}`) as HTMLCanvasElement;
                              if (canvas) {
                                try {
                                  const url = canvas.toDataURL("image/png");
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `qr-tavolo-${num}-${restaurantSlug}.png`;
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                  return;
                                } catch (e) {
                                  console.error("Canvas export failed", e);
                                }
                              }
                              fetch(qrUrl)
                                .then((res) => res.blob())
                                .then((blob) => {
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `qr-tavolo-${num}-${restaurantSlug}.png`;
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                  window.URL.revokeObjectURL(url);
                                })
                                .catch(() => {
                                  window.open(qrUrl, '_blank');
                                });
                            }}
                            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-secondary text-foreground hover:bg-muted rounded-lg text-xs font-semibold transition-colors border border-border"
                          >
                            <Download size={12} className="text-muted-foreground" />
                            Scarica
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const restName = info.name || 'Ristorante';
                              const printWindow = window.open('', '_blank');
                              if (!printWindow) return;
                              
                              const logoHtml = `
                                <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                                  <div style="font-size: 14px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;">${restName}</div>
                                </div>
                              `;

                              printWindow.document.write(`
                                <html>
                                  <head>
                                    <title>Stampa QR Code - Tavolo ${num}</title>
                                    <style>
                                      body {
                                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        height: 100vh;
                                        margin: 0;
                                        background-color: #fff;
                                      }
                                      .card {
                                        border: 1px solid #cbd5e1;
                                        border-radius: 12px;
                                        padding: 24px;
                                        text-align: center;
                                        width: 280px;
                                        height: 280px;
                                        display: flex;
                                        flex-direction: column;
                                        align-items: center;
                                        justify-content: space-between;
                                        box-sizing: border-box;
                                        box-shadow: none;
                                      }
                                      .qr-wrapper {
                                        position: relative;
                                        display: inline-block;
                                        width: 170px;
                                        height: 170px;
                                        margin: 0 auto;
                                      }
                                      .qr-image {
                                        width: 170px;
                                        height: 170px;
                                        display: block;
                                      }
                                      .table-badge {
                                        background-color: #f97316;
                                        color: white;
                                        font-size: 15px;
                                        font-weight: 800;
                                        padding: 4px 14px;
                                        border-radius: 9999px;
                                        letter-spacing: 0.05em;
                                        display: inline-block;
                                      }
                                      .footer-text {
                                        font-size: 10px;
                                        color: #64748b;
                                        font-weight: 600;
                                        text-transform: uppercase;
                                        letter-spacing: 0.05em;
                                      }
                                      @media print {
                                        body { height: auto; }
                                        @page { size: portrait; margin: 0; }
                                        .card { border: 1px solid #cbd5e1 !important; box-shadow: none !important; }
                                      }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="card">
                                      ${logoHtml}
                                      <div class="qr-wrapper">
                                        <img class="qr-image" src="${getCanvasDataUrl(num)}" alt="QR Code" />
                                      </div>
                                      <div>
                                        <div class="table-badge">TAVOLO ${num}</div>
                                        <div class="footer-text" style="margin-top: 6px;">Inquadra e Ordina</div>
                                      </div>
                                    </div>
                                    <script>
                                      window.onload = function() {
                                        setTimeout(function() { window.print(); window.close(); }, 800);
                                      };
                                    </script>
                                  </body>
                                </html>
                              `);
                              printWindow.document.close();
                            }}
                            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-secondary text-foreground hover:bg-muted rounded-lg text-xs font-semibold transition-colors border border-border"
                          >
                            <Printer size={12} className="text-muted-foreground" />
                            Stampa
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
            {currentStep === 'promozioni' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-foreground font-sans">Gestione Promozioni & Codici Sconto</h2>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      Definisci i codici promozionali, le soglie d'ordine e le offerte di spedizione gratuita per questo ristorante.
                    </p>
                  </div>
                  <button
                    onClick={handleOpenAddPromoModal}
                    className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-[#d43d22] transition-colors cursor-pointer w-full sm:w-auto"
                  >
                    <Plus size={16} />
                    Aggiungi Codice
                  </button>
                </div>

                <div className="bg-card border border-border rounded-xl p-4 flex gap-3 shadow-card">
                  <Info size={20} className="text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <h4 className="font-semibold text-foreground">Campagne Promo professionali!</h4>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      I codici sconto possono essere a percentuale, importo fisso, primo ordine o consegna gratuita. Puoi configurare scadenze temporali, limiti massimi di utilizzo e canali d'ordine specifici (es. solo domicilio).
                    </p>
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                  {promos.length === 0 ? (
                    <div className="py-12 text-center">
                      <AlertCircle size={32} className="text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-semibold text-foreground">
                        Nessuna promozione configurata
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Clicca su &quot;Aggiungi Codice&quot; per crearne una.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <th className="px-6 py-4">Stato</th>
                            <th className="px-6 py-4">Codice</th>
                            <th className="px-6 py-4">Valore Sconto</th>
                            <th className="px-6 py-4 hidden lg:table-cell">Ordine Minimo</th>
                            <th className="px-6 py-4">Descrizione / Validità</th>
                            <th className="px-6 py-4 text-center">Azioni</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-sm">
                          {promos.map((promo) => (
                            <tr
                              key={promo.id}
                              className={`hover:bg-muted/30 transition-colors ${!promo.active ? 'opacity-65' : ''}`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Toggle
                                  checked={promo.active}
                                  onChange={() => handleTogglePromo(promo.id)}
                                  size="sm"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-bold text-foreground bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-lg text-xs tracking-wider font-mono">
                                  {promo.code}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-semibold text-foreground whitespace-nowrap">
                                {promo.type === 'percentage' && (
                                  <Badge variant="primary" icon={<Percent size={11} />}>
                                    {promo.value}% di sconto
                                  </Badge>
                                )}
                                {promo.type === 'first_order' && (
                                  <Badge variant="warning" icon={<UserCheck size={11} />}>
                                    {promo.value}% 1° Ordine
                                  </Badge>
                                )}
                                {promo.type === 'fixed_amount' && (
                                  <Badge variant="success" icon={<Euro size={11} />}>
                                    € {promo.value.toFixed(2)} fisso
                                  </Badge>
                                )}
                                {promo.type === 'threshold_based' && (
                                  <Badge variant="info" icon={<TrendingUp size={11} />}>
                                    € {promo.value.toFixed(2)} a Soglia
                                  </Badge>
                                )}
                                {promo.type === 'free_delivery' && (
                                  <Badge variant="primary" icon={<Euro size={11} />}>
                                    Consegna Gratuita
                                  </Badge>
                                )}
                              </td>
                              <td className="px-6 py-4 font-medium tabular-nums whitespace-nowrap hidden lg:table-cell">
                                {promo.minOrderSubtotal
                                  ? `€ ${promo.minOrderSubtotal.toFixed(2)}`
                                  : 'Nessuno'}
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-foreground font-semibold line-clamp-1">
                                  {promo.description || 'Nessuna descrizione'}
                                </p>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground font-medium">
                                  {(promo.startDate || promo.endDate) && (
                                    <span className="flex items-center gap-1">
                                      <Calendar size={11} />
                                      {promo.startDate
                                        ? `Dal ${new Date(promo.startDate).toLocaleDateString('it')}`
                                        : ''}
                                      {promo.endDate
                                        ? ` al ${new Date(promo.endDate).toLocaleDateString('it')}`
                                        : ' (Senza scadenza)'}
                                    </span>
                                  )}
                                  {promo.maxUses !== undefined && promo.maxUses > 0 && (
                                    <span className="font-bold text-primary">
                                      Uso: {promo.usedCount || 0}/{promo.maxUses}
                                    </span>
                                  )}
                                  {promo.applicableDeliveryModes && promo.applicableDeliveryModes.length > 0 && (
                                    <span className="italic bg-secondary px-1.5 py-0.5 rounded text-[10px] font-bold">
                                      Canali: {promo.applicableDeliveryModes.join(', ')}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleOpenEditPromoModal(promo)}
                                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                    title="Modifica"
                                  >
                                    <Edit2 size={15} />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePromo(promo.id)}
                                    className="p-1.5 rounded-lg hover:bg-[var(--danger-bg)] text-muted-foreground hover:text-[var(--danger)] transition-colors cursor-pointer"
                                    title="Elimina"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 'review' && (
              <ReviewStep
                info={info}
                zones={zones}
                hours={hours}
                menuItems={menuItems}
                menuCategories={menuCategories}
                promos={promos}
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
      {/* Add/Edit Promo Modal */}
      <Modal
        open={showPromoModal}
        onClose={() => setShowPromoModal(false)}
        title={editingPromo ? 'Modifica Codice Sconto' : 'Crea Codice Sconto'}
        size="md"
      >
        <form onSubmit={handlePromoSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Codice Sconto *
            </label>
            <input
              type="text"
              required
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Es. SCONTO20, ESTATEDICI"
              className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring uppercase font-bold tracking-wider"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Tipo Sconto *
            </label>
            <select
              value={promoType}
              onChange={(e) => setPromoType(e.target.value as any)}
              className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring font-medium"
            >
              <option value="percentage">Percentuale (%)</option>
              <option value="fixed_amount">Fisso (€)</option>
              <option value="threshold_based">A Soglia (€)</option>
              <option value="first_order">Primo Ordine (%)</option>
              <option value="free_delivery">Consegna Gratuita</option>
            </select>
          </div>

          {promoType !== 'free_delivery' && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Valore Sconto *
              </label>
              <div className="relative">
                {promoType === 'percentage' || promoType === 'first_order' ? (
                  <Percent
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                ) : (
                  <Euro
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                )}
                <input
                  type="number"
                  min="0.1"
                  step={promoType === 'percentage' || promoType === 'first_order' ? '1' : '0.5'}
                  required
                  value={promoValue}
                  onChange={(e) => setPromoValue(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Spesa Minima Ordine (€)
            </label>
            <div className="relative">
              <Euro
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="number"
                min="0"
                step="1"
                required={promoType === 'threshold_based'}
                value={promoMinOrder}
                onChange={(e) => setPromoMinOrder(e.target.value)}
                placeholder={promoType === 'threshold_based' ? 'Inserisci spesa minima' : '0 per nessuna spesa minima'}
                className="w-full pl-9 pr-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Inizio Validità
            </label>
            <input
              type="date"
              value={promoStart}
              onChange={(e) => setPromoStart(e.target.value)}
              className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Fine Validità
            </label>
            <input
              type="date"
              value={promoEnd}
              onChange={(e) => setPromoEnd(e.target.value)}
              className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Descrizione
            </label>
            <textarea
              value={promoDesc}
              onChange={(e) => setPromoDesc(e.target.value)}
              placeholder="Es. Offerta di primavera, riservata a clienti registrati..."
              className="w-full px-3.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring h-16 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Limite Utilizzi Totale (Opzionale)
            </label>
            <input
              type="number"
              min="1"
              value={promoMaxUses}
              onChange={(e) => setPromoMaxUses(e.target.value)}
              placeholder="Nessun limite"
              className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Canali d'ordine abilitati
            </label>
            <div className="flex flex-wrap gap-4 mt-2 bg-muted/30 border border-border/50 p-3.5 rounded-xl">
              {[
                { id: 'domicilio', label: 'Domicilio' },
                { id: 'asporto', label: 'Asporto' },
                { id: 'tavolo', label: 'Tavolo' },
              ].map((mode) => {
                const isSelected = promoModes.includes(mode.id as any);
                return (
                  <label key={mode.id} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        if (isSelected) {
                          setPromoModes(promoModes.filter((m) => m !== mode.id));
                        } else {
                          setPromoModes([...promoModes, mode.id as any]);
                        }
                      }}
                      className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                    />
                    <span className="text-sm text-foreground font-medium">{mode.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Testo personalizzato per il Banner in Vetrina (Opzionale)
            </label>
            <textarea
              value={promoCustomBanner}
              onChange={(e) => setPromoCustomBanner(e.target.value)}
              placeholder="Es. 🎉 Usa il codice WELCOME10 per ricevere il 10% di sconto sul primo ordine!"
              className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring h-16 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Toggle checked={promoActive} onChange={setPromoActive} size="sm" />
            <span className="text-sm font-semibold text-foreground">
              Attiva subito questo codice
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setShowPromoModal(false)}
              className="px-4 py-2 bg-muted hover:bg-border text-foreground text-sm font-bold rounded-xl transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary hover:bg-[#d43d22] text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
            >
              {editingPromo ? 'Salva Modifiche' : 'Crea Codice'}
            </button>
          </div>
        </form>
      </Modal>
          </div>
        </main>
      </div>
    </div>
  );
}
