'use client';
import React, { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import {
  ArrowLeft,
  ChevronRight,
  Check,
  ChevronLeft as ChevronLeftIcon,
  Zap,
  AlertCircle,
} from 'lucide-react';
import type { PaymentConfig } from '@/components/admin/restaurant-wizard/PaymentStep';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/storage-upload';

// Wizard step components — dynamically imported so each step is a separate chunk
const RestaurantInfoStep = dynamic(
  () => import('@/components/admin/restaurant-wizard/RestaurantInfoStep'),
  { ssr: false }
);
const DeliveryZonesStep = dynamic(
  () => import('@/components/admin/restaurant-wizard/DeliveryZonesStep'),
  { ssr: false }
);
const HoursStep = dynamic(() => import('@/components/admin/restaurant-wizard/HoursStep'), {
  ssr: false,
});
const ScheduledOrdersStep = dynamic(
  () => import('@/components/admin/restaurant-wizard/ScheduledOrdersStep'),
  { ssr: false }
);
const PaymentStep = dynamic(() => import('@/components/admin/restaurant-wizard/PaymentStep'), {
  ssr: false,
});
const MenuStep = dynamic(() => import('@/components/admin/restaurant-wizard/MenuStep'), {
  ssr: false,
});
const ReviewStep = dynamic(() => import('@/components/admin/restaurant-wizard/ReviewStep'), {
  ssr: false,
});
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
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(
    null
  );
  const [savedRestaurantId, setSavedRestaurantId] = useState<string | null>(null);
  const [isSavedDraft, setIsSavedDraft] = useState(false);
  const [restaurantStatus, setRestaurantStatus] = useState<'draft' | 'published'>('draft');

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bgImageFile, setBgImageFile] = useState<File | null>(null);

  const [info, setInfo] = useState<RestaurantInfo>({
    name: '',
    category: '',
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

  const [serviceSuspended, setServiceSuspended] = useState({
    pickup: false,
    delivery: false,
    reservation: false,
  });

  const [temporaryClosure, setTemporaryClosure] = useState({
    enabled: false,
    from: '',
    to: '',
    message: '',
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
    card_table: false,
    cash_delivery: true,
    cash_pickup: true,
    cash_table: false,
    stripe_enabled: false,
    stripe_connected: false,
    stripe_account_label: '',
    stripe_delivery: true,
    stripe_pickup: true,
    stripe_table: true,
    paypal_enabled: false,
    paypal_connected: false,
    paypal_email: '',
    paypal_delivery: true,
    paypal_pickup: true,
    paypal_table: true,
    iban_enabled: false,
    onlinePaymentAccount: '',
    ibanHolder: '',
  });
  const [menuCategories, setMenuCategories] = useState<{ name: string; name_en?: string }[]>([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryNameEn, setNewCategoryNameEn] = useState('');
  const [optionGroups, setOptionGroups] = useState<WizardOptionGroup[]>([]);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupNameEn, setNewGroupNameEn] = useState('');
  const [newGroupDefaultOption, setNewGroupDefaultOption] = useState('');
  const [newGroupDefaultOptionEn, setNewGroupDefaultOptionEn] = useState('');
  const [newGroupChoices, setNewGroupChoices] = useState<WizardOptionChoice[]>([
    { id: 'c-1', name: '', price: 0 },
  ]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupNameEn, setEditGroupNameEn] = useState('');
  const [editGroupDefaultOption, setEditGroupDefaultOption] = useState('');
  const [editGroupDefaultOptionEn, setEditGroupDefaultOptionEn] = useState('');
  const [editGroupChoices, setEditGroupChoices] = useState<WizardOptionChoice[]>([]);
  const [editGroupMinSelections, setEditGroupMinSelections] = useState(0);
  const [editGroupMaxSelections, setEditGroupMaxSelections] = useState<number | null>(null);
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
    customizationEnabled: true,
    notesEnabled: true,
  });
  const [showAddItem, setShowAddItem] = useState(false);
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // --- HELPERS ---
  const stepOrder: WizardStep[] = [
    'info',
    'delivery',
    'hours',
    'scheduled',
    'payment',
    'menu',
    'review',
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
    setMenuCategories((p) => [
      ...p,
      { name: newCategoryName.trim(), name_en: newCategoryNameEn.trim() || undefined },
    ]);
    setNewCategoryName('');
    setNewCategoryNameEn('');
    setShowNewCategory(false);
  };
  const addMenuItem = () => {
    if (!newItem.name || !newItem.price) return;
    setMenuItems((p) => {
      const exists = p.some((item) => item.id === newItem.id);
      if (exists) {
        return p.map((item) => (item.id === newItem.id ? { ...newItem } : item));
      } else {
        return [...p, { ...newItem, id: newItem.id || crypto.randomUUID() }];
      }
    });
    setShowAddItem(false);
    setNewItem({
      id: '',
      name: '',
      category: menuCategories[0]?.name || 'Pizza',
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
    if (f) {
      setLogoFile(f);
      setInfo((p) => ({ ...p, logoUrl: URL.createObjectURL(f) }));
    }
  };
  const handleBgImageFile = (e: any) => {
    const f = e.target.files?.[0];
    if (f) {
      setBgImageFile(f);
      setInfo((p) => ({ ...p, backgroundImageUrl: URL.createObjectURL(f) }));
    }
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
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  };

  const sendPublicationEmail = async (restaurantId: string) => {
    try {
      const response = await fetch('/api/admin/send-activation-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ restaurantId }),
      });
      if (!response.ok) {
        const errData = await response.json();
        console.error('Failed to send activation email:', errData.error);
      } else {
        console.log('Activation email sent successfully.');
      }
    } catch (err) {
      console.error('Error triggering activation email:', err);
    }
  };

  const validateInfoStep = (): { isValid: boolean; message: string } => {
    if (!info.name.trim()) {
      return { isValid: false, message: 'Il "Nome Ristorante" è obbligatorio.' };
    }
    if (!info.category.trim()) {
      return { isValid: false, message: 'La "Categoria" è obbligatoria.' };
    }
    if (!info.address.trim()) {
      return { isValid: false, message: 'La "Via / Piazza" dell\'indirizzo è obbligatoria.' };
    }
    if (!info.city.trim()) {
      return { isValid: false, message: 'La "Città" dell\'indirizzo è obbligatoria.' };
    }
    if (!info.phone.trim()) {
      return { isValid: false, message: 'Il "Telefono" di contatto è obbligatorio.' };
    }
    if (!info.email.trim()) {
      return { isValid: false, message: 'L\'"Email" di contatto è obbligatoria.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(info.email.trim())) {
      return { isValid: false, message: 'Inserisci un indirizzo email valido.' };
    }
    return { isValid: true, message: '' };
  };

  const saveRestaurant = async (status: 'draft' | 'published') => {
    const validation = validateInfoStep();
    if (!validation.isValid) {
      showFeedback(validation.message, 'error');
      return;
    }
    let dbRestaurantId = savedRestaurantId;
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
      serviceSuspended,
      temporaryClosure,
    };

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
        card_table: paymentConfig.card_table,
        cash_delivery: paymentConfig.cash_delivery,
        cash_pickup: paymentConfig.cash_pickup,
        cash_table: paymentConfig.cash_table,
        cash: paymentConfig.cash_delivery || paymentConfig.cash_pickup || paymentConfig.cash_table,
        card: paymentConfig.card_delivery || paymentConfig.card_pickup || paymentConfig.card_table,
        stripe_enabled: paymentConfig.stripe_enabled,
        stripe_connected: paymentConfig.stripe_connected,
        stripe_account_label: paymentConfig.stripe_account_label,
        stripe_delivery: paymentConfig.stripe_delivery,
        stripe_pickup: paymentConfig.stripe_pickup,
        stripe_table: paymentConfig.stripe_table,
        paypal_enabled: paymentConfig.paypal_enabled,
        paypal_connected: paymentConfig.paypal_connected,
        paypal_email: paymentConfig.paypal_email,
        paypal_delivery: paymentConfig.paypal_delivery,
        paypal_pickup: paymentConfig.paypal_pickup,
        paypal_table: paymentConfig.paypal_table,
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

    // Upload files to Supabase storage if selected
    let logoUrlToSave = info.logoUrl || null;
    let backgroundUrlToSave = info.backgroundImageUrl || null;

    try {
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${slug}-${Date.now()}-logo.${fileExt}`;
        logoUrlToSave = await uploadImage(logoFile, 'restaurant-logos', fileName);
      }
      if (bgImageFile) {
        const fileExt = bgImageFile.name.split('.').pop();
        const fileName = `${slug}-${Date.now()}-banner.${fileExt}`;
        backgroundUrlToSave = await uploadImage(bgImageFile, 'restaurant-banners', fileName);
      }
    } catch (uploadErr) {
      console.error('Error uploading logo/banner to Supabase Storage:', uploadErr);
      showFeedback('Errore nel caricamento delle immagini (Logo/Sfondo).', 'error');
      return;
    }

    const restaurantPayload = {
      name: info.name,
      slug: slug,
      email: info.email,
      phone: info.phone,
      address: info.address,
      city: info.city,
      province: info.province,
      cap: info.cap,
      vat_number: info.vatNumber || null,
      category: info.category || null,
      description: info.description || null,
      logo_url: logoUrlToSave,
      background_url: backgroundUrlToSave,
      status: status,
      delivery_enabled: zones.some((z) => z.enabled),
      pickup_enabled: true,
      table_enabled: tableBooking.enabled,
      delivery_fee: zones[0]?.deliveryFee || 0,
      min_order: zones[0]?.minOrder || 0,
      free_delivery_threshold: zones[0]?.freeDeliveryThreshold || 0,
      free_delivery_active: (zones[0]?.freeDeliveryThreshold || 0) > 0,
      card_delivery: !!paymentConfig.card_delivery,
      card_pickup: !!paymentConfig.card_pickup,
      card_table: !!paymentConfig.card_table,
      cash_delivery: !!paymentConfig.cash_delivery,
      cash_pickup: !!paymentConfig.cash_pickup,
      cash_table: !!paymentConfig.cash_table,
      paypal_enabled: !!paymentConfig.paypal_enabled,
      paypal_connected: !!paymentConfig.paypal_connected,
      paypal_email: paymentConfig.paypal_email || null,
      paypal_delivery: !!paymentConfig.paypal_delivery,
      paypal_pickup: !!paymentConfig.paypal_pickup,
      paypal_table: !!paymentConfig.paypal_table,
      stripe_enabled: !!paymentConfig.stripe_enabled,
      stripe_connected: !!paymentConfig.stripe_connected,
      stripe_account_label: paymentConfig.stripe_account_label || null,
      stripe_delivery: !!paymentConfig.stripe_delivery,
      stripe_pickup: !!paymentConfig.stripe_pickup,
      stripe_table: !!paymentConfig.stripe_table,
      iban_enabled: !!paymentConfig.iban_enabled,
      online_payment_account: paymentConfig.onlinePaymentAccount || null,
      iban_holder: paymentConfig.ibanHolder || null,
      scheduled_orders: scheduledOrders,
      hours_config: serviceHoursDataToSave,
    };

    try {
      if (info.category) {
        const categoryName = info.category.trim();
        const { error: catErr } = await supabase
          .from('restaurant_categories')
          .insert({ name: categoryName });
        if (catErr && catErr.code !== '23505') {
          console.warn('Non-fatal error inserting restaurant category:', catErr);
        }
      }

      if (dbRestaurantId) {
        const { error } = await supabase
          .from('restaurants')
          .update(restaurantPayload)
          .eq('id', dbRestaurantId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('restaurants')
          .insert(restaurantPayload)
          .select('id')
          .single();
        if (error) throw error;
        if (data) {
          dbRestaurantId = data.id;
          setSavedRestaurantId(data.id);
        }
      }
    } catch (e: any) {
      console.error('Error saving restaurant to Supabase:', e);
      showFeedback(
        'Errore durante il salvataggio su database: ' + (e.message || JSON.stringify(e)),
        'error'
      );
      return;
    }

    // ── Sync to Supabase: delivery_zones, menu_categories, menu_items ──
    if (dbRestaurantId) {
      try {
        // 1. Delivery Zones — upsert (delete existing then re-insert for simplicity on re-save)
        await supabase.from('delivery_zones').delete().eq('restaurant_id', dbRestaurantId);
        if (zones.length > 0) {
          const zonesPayload = zones.map((z) => ({
            restaurant_id: dbRestaurantId,
            name: z.name,
            radius_km: z.radius,
            min_order: z.minOrder,
            delivery_fee: z.deliveryFee,
            free_delivery_threshold: z.freeDeliveryThreshold,
            enabled: z.enabled,
          }));
          const { error: zonesErr } = await supabase.from('delivery_zones').insert(zonesPayload);
          if (zonesErr) {
            console.error('Error saving zones to Supabase:', zonesErr);
            throw new Error('Errore nel salvataggio delle zone di consegna: ' + zonesErr.message);
          }
        }

        // 2. Menu Categories — upsert
        if (menuCategories.length > 0) {
          await supabase.from('menu_categories').delete().eq('restaurant_id', dbRestaurantId);
          const catsPayload = menuCategories.map((cat, idx) => ({
            restaurant_id: dbRestaurantId,
            name: cat.name,
            name_en: cat.name_en || null,
            sort_order: idx,
          }));
          const { data: savedCats, error: catsErr } = await supabase
            .from('menu_categories')
            .insert(catsPayload)
            .select('id, name');
          if (catsErr) {
            console.error('Error saving categories to Supabase:', catsErr);
            throw new Error('Errore nel salvataggio delle categorie menu: ' + catsErr.message);
          }

          // 3. Menu Items
          if (menuItems.length > 0 && savedCats) {
            await supabase.from('menu_items').delete().eq('restaurant_id', dbRestaurantId);
            const catMap = Object.fromEntries(savedCats.map((c: any) => [c.name, c.id]));

            const itemsPayload = await Promise.all(
              menuItems.map(async (item) => {
                const isPromoActive = !!item.originalPrice && parseFloat(item.originalPrice) > 0;
                const listPrice = parseFloat(item.price) || 0;
                const promoPrice = isPromoActive ? parseFloat(item.originalPrice!) : undefined;

                let imageUrl = item.imageUrl || null;
                if (item.imageFile) {
                  try {
                    const fileExt = item.imageFile.name.split('.').pop();
                    const fileName = `${dbRestaurantId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
                    imageUrl = await uploadImage(item.imageFile, 'dish-images', fileName);
                  } catch (err) {
                    console.error('Error uploading dish image:', err);
                  }
                }

                let visibility: 'always' | 'hidden' | 'scheduled' = 'always';
                if (item.visibility.mode === 'hidden') {
                  visibility = 'hidden';
                } else if (
                  item.visibility.mode === 'time_range' ||
                  item.visibility.mode === 'date_range'
                ) {
                  visibility = 'scheduled';
                }

                const mappedOptionGroups = item.optionGroups
                  .map((groupId: string) => {
                    const matchedGroup = optionGroups.find((g) => g.id === groupId);
                    if (!matchedGroup) return null;
                    return {
                      id: matchedGroup.id,
                      name: matchedGroup.name,
                      name_en: matchedGroup.name_en ?? undefined,
                      minSelections: matchedGroup.minSelections ?? 0,
                      maxSelections: matchedGroup.maxSelections ?? null,
                      defaultOption: matchedGroup.defaultOption,
                      defaultOptionEn: matchedGroup.defaultOptionEn,
                      choices: matchedGroup.choices.map((c) => ({
                        id: c.id,
                        name: c.name,
                        name_en: c.name_en ?? undefined,
                        price: c.price.toString(),
                      })),
                    };
                  })
                  .filter(Boolean);

                if (item.singleSupplements && item.singleSupplements.length > 0) {
                  mappedOptionGroups.push({
                    id: 'supplementi-singoli',
                    name: 'Supplementi Singoli',
                    name_en: undefined,
                    minSelections: 0,
                    maxSelections: null,
                    defaultOption: undefined,
                    defaultOptionEn: undefined,
                    choices: (item.singleSupplements as any[]).map((c) => ({
                      id: c.id,
                      name: c.name,
                      name_en: c.name_en ?? undefined,
                      price: c.price.toString(),
                    })),
                  });
                }

                return {
                  restaurant_id: dbRestaurantId,
                  category_id: catMap[item.category] || null,
                  category_name: item.category,
                  name: item.name,
                  name_en: item.name_en || null,
                  description: item.description || null,
                  description_en: item.description_en || null,
                  price: isPromoActive ? promoPrice! : listPrice,
                  original_price: isPromoActive ? listPrice : null,
                  image_url: imageUrl,
                  image_alt: item.name,
                  allergens: item.allergens,
                  allergens_en: item.allergens_en || [],
                  dish_tags: item.dishTags || [],
                  dish_tags_en: item.dishTagsEn || [],
                  ingredients: item.ingredients || [],
                  ingredients_en: item.ingredients_en || [],
                  available: item.available,
                  visibility,
                  visibility_from: item.visibility.timeFrom || null,
                  visibility_to: item.visibility.timeTo || null,
                  option_groups: mappedOptionGroups,
                  customization_enabled: item.customizationEnabled ?? true,
                  notes_enabled: item.notesEnabled ?? true,
                  sort_order: 0,
                };
              })
            );

            const { error: itemsErr } = await supabase.from('menu_items').insert(itemsPayload);
            if (itemsErr) {
              console.error('Error saving menu items to Supabase:', itemsErr);
              throw new Error('Errore nel salvataggio dei piatti menu: ' + itemsErr.message);
            }
          }
        }
      } catch (e: any) {
        console.error('Error syncing menu/zones to Supabase:', e);
        showFeedback(e.message || 'Errore durante la sincronizzazione del menu/zone.', 'error');
        return;
      }
    }

    setRestaurantStatus(status);
    setIsSavedDraft(true);

    if (status === 'published') {
      if (dbRestaurantId) {
        await sendPublicationEmail(dbRestaurantId);
      }
      setPublished(true);
    } else {
      showFeedback('Bozza salvata con successo!');
    }
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
        <PublishedSuccess
          restaurantName={info.name}
          email={info.email}
          restaurantId={savedRestaurantId || ''}
        />
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
            <div className="flex items-center gap-1.5 min-w-0">
              <Link
                href="/admin/restaurants"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors flex-shrink-0"
              >
                <ArrowLeft size={15} />
                <span className="hidden md:inline">Ristoranti</span>
              </Link>
              <span className="text-muted-foreground flex-shrink-0">/</span>
              <span className="text-sm font-semibold text-foreground truncate max-w-[120px] sm:max-w-none">
                Nuovo Ristorante
              </span>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto overscroll-contain relative">
          {feedback && (
            <div
              className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 text-sm font-semibold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 ${
                feedback.type === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-foreground text-background'
              }`}
            >
              {feedback.type === 'error' ? <AlertCircle size={14} /> : <Zap size={14} />}
              {feedback.message}
            </div>
          )}
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
                serviceSuspended={serviceSuspended}
                setServiceSuspended={setServiceSuspended}
                temporaryClosure={temporaryClosure}
                setTemporaryClosure={setTemporaryClosure}
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
                newCategoryNameEn={newCategoryNameEn}
                setNewCategoryNameEn={setNewCategoryNameEn}
                addNewCategory={addNewCategory}
                optionGroups={optionGroups}
                showAddGroup={showAddGroup}
                setShowAddGroup={(show) => {
                  setShowAddGroup(show);
                  if (!show) {
                    setNewGroupName('');
                    setNewGroupNameEn('');
                    setNewGroupDefaultOption('');
                    setNewGroupDefaultOptionEn('');
                    setNewGroupChoices([{ id: `c-${Date.now()}`, name: '', price: 0 }]);
                  }
                }}
                newGroupName={newGroupName}
                setNewGroupName={setNewGroupName}
                newGroupNameEn={newGroupNameEn}
                setNewGroupNameEn={setNewGroupNameEn}
                newGroupDefaultOption={newGroupDefaultOption}
                setNewGroupDefaultOption={setNewGroupDefaultOption}
                newGroupDefaultOptionEn={newGroupDefaultOptionEn}
                setNewGroupDefaultOptionEn={setNewGroupDefaultOptionEn}
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
                      name_en: newGroupNameEn.trim() || undefined,
                      choices: newGroupChoices.filter((c) => c.name.trim()),
                      appliedTo: [],
                      minSelections: minSel ?? 0,
                      maxSelections: maxSel !== undefined ? maxSel : null,
                      defaultOption: newGroupDefaultOption.trim() || undefined,
                      defaultOptionEn: newGroupDefaultOptionEn.trim() || undefined,
                    },
                  ]);
                  setNewGroupName('');
                  setNewGroupNameEn('');
                  setNewGroupDefaultOption('');
                  setNewGroupDefaultOptionEn('');
                  setNewGroupChoices([{ id: `c-${Date.now()}`, name: '', price: 0 }]);
                  setShowAddGroup(false);
                }}
                removeWizardOptionGroup={(id) =>
                  setOptionGroups((p) => p.filter((g) => g.id !== id))
                }
                 editingGroupId={editingGroupId}
                startEditGroup={(g) => {
                  setEditingGroupId(g.id);
                  setEditGroupName(g.name);
                  setEditGroupNameEn(g.name_en ?? '');
                  setEditGroupChoices(g.choices.map((c) => ({ ...c })));
                  setEditGroupMinSelections(g.minSelections ?? 0);
                  setEditGroupMaxSelections(g.maxSelections ?? null);
                  setEditGroupDefaultOption(g.defaultOption ?? '');
                  setEditGroupDefaultOptionEn(g.defaultOptionEn ?? '');
                }}
                editGroupName={editGroupName}
                setEditGroupName={setEditGroupName}
                editGroupNameEn={editGroupNameEn}
                setEditGroupNameEn={setEditGroupNameEn}
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
                        ? {
                            ...g,
                            name: editGroupName,
                            name_en: editGroupNameEn.trim() || undefined,
                            choices: editGroupChoices,
                            minSelections: editGroupMinSelections,
                            maxSelections: editGroupMaxSelections,
                            defaultOption: editGroupDefaultOption.trim() || undefined,
                            defaultOptionEn: editGroupDefaultOptionEn.trim() || undefined,
                          }
                        : g
                    )
                  );
                  setEditingGroupId(null);
                  setEditGroupName('');
                  setEditGroupNameEn('');
                  setEditGroupDefaultOption('');
                  setEditGroupDefaultOptionEn('');
                }}
                cancelEditGroup={() => {
                  setEditingGroupId(null);
                  setEditGroupName('');
                  setEditGroupNameEn('');
                  setEditGroupDefaultOption('');
                  setEditGroupDefaultOptionEn('');
                }}
                editGroupMinSelections={editGroupMinSelections}
                setEditGroupMinSelections={setEditGroupMinSelections}
                editGroupMaxSelections={editGroupMaxSelections}
                setEditGroupMaxSelections={setEditGroupMaxSelections}
                editGroupDefaultOption={editGroupDefaultOption}
                setEditGroupDefaultOption={setEditGroupDefaultOption}
                editGroupDefaultOptionEn={editGroupDefaultOptionEn}
                setEditGroupDefaultOptionEn={setEditGroupDefaultOptionEn}
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
                menuCategories={menuCategories.map((c) => c.name)}
                handlePublish={() => saveRestaurant('published')}
                handleSaveDraft={() => saveRestaurant('draft')}
                isSavedDraft={isSavedDraft}
                previewUrl={`/menu/${slugify(info.name)}`}
                restaurantStatus={restaurantStatus}
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
                  onClick={() => {
                    if (currentStep === 'info') {
                      const validation = validateInfoStep();
                      if (!validation.isValid) {
                        showFeedback(validation.message, 'error');
                        return;
                      }
                    }
                    setCurrentStep(stepOrder[currentIndex + 1]);
                  }}
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
