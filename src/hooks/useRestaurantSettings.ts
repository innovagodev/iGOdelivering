import { useState, useEffect } from 'react';
import { RestaurantSettings } from '@/types/settings';

export interface UnifiedSettings extends RestaurantSettings {
  rating: number;
  reviews: number;
  deliveryTime: string;
  orderModes: {
    delivery: boolean;
    pickup: boolean;
    table: boolean;
  };
  paymentMethods: {
    card_delivery: boolean;
    card_pickup: boolean;
    cash_delivery: boolean;
    cash_pickup: boolean;
    cash: boolean;
    card: boolean;
    paypal: boolean;
  };
}

interface BaseRestaurant {
  name: string;
  tagline: string;
  address: string;
  rating: number;
  reviews: number;
  deliveryTime: string;
  minOrder: number;
  deliveryFee: number;
  phone: string;
  email?: string;
  image: string;
  imageAlt: string;
  logoUrl: string;
  freeDeliveryActive?: boolean;
  freeDeliveryThreshold?: number;
  paymentMethods?: {
    cash_delivery: boolean;
    cash_pickup: boolean;
    card_delivery: boolean;
    card_pickup: boolean;
    cash: boolean;
    card: boolean;
    paypal: boolean;
  };
  orderModes?: {
    delivery: boolean;
    pickup: boolean;
    table: boolean;
  };
  openingHours?: { start: string; end: string }[];
  deliveryHours?: { start: string; end: string }[];
}

const getRestaurantId = (slug: string): string => {
  if (typeof window === 'undefined') return 'r-001';
  if (slug.startsWith('r-')) return slug;
  if (slug === 'pizzeria-bella-napoli') return 'r-001';
  if (slug === 'trattoria-da-mario') return 'r-002';
  if (slug === 'sushi-zen') return 'r-003';
  if (slug === 'osteria-del-porto') return 'r-004';
  if (slug === 'burger-house') return 'r-005';

  try {
    const storedStr =
      localStorage.getItem('iGOdelivering_restaurants') ||
      localStorage.getItem('gloriaorder_restaurants');
    if (storedStr) {
      const restaurants = JSON.parse(storedStr);
      const slugify = (text: string) =>
        text
          .toString()
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]+/g, '')
          .replace(/--+/g, '-');
      const matched = restaurants.find((r: any) => slugify(r.name) === slug || r.id === slug);
      if (matched) return matched.id;
    }
  } catch (e) {
    console.error('Error resolving restaurant ID', e);
  }
  return 'r-001';
};

const getBaseRestaurantBySlug = (slug: string): BaseRestaurant => {
  const normalizedSlug = (slug || '').toLowerCase();

  if (normalizedSlug === 'pizzeria-bella-napoli' || normalizedSlug === 'r-001') {
    return {
      name: 'Pizzeria Bella Napoli',
      tagline: 'Autentica pizza napoletana dal 1987',
      address: 'Via Roma 24, Milano',
      rating: 4.8,
      reviews: 312,
      deliveryTime: '25–40 min',
      minOrder: 12,
      deliveryFee: 2.5,
      phone: '+39 02 1234567',
      image: 'https://images.unsplash.com/photo-1579751626657-72bc17010498',
      imageAlt: 'Pizza margherita appena sfornata da forno a legna in una pizzeria napoletana',
      logoUrl: '/assets/images/logo_pizzeria.png',
      freeDeliveryActive: false,
      freeDeliveryThreshold: 0,
      paymentMethods: {
        cash_delivery: true,
        cash_pickup: true,
        card_delivery: true,
        card_pickup: true,
        cash: true,
        card: true,
        paypal: true,
      },
      orderModes: {
        delivery: true,
        pickup: true,
        table: true,
      },
      openingHours: [{ start: '00:00', end: '23:59' }],
      deliveryHours: [{ start: '00:00', end: '23:59' }],
    };
  } else if (normalizedSlug === 'sushi-zen' || normalizedSlug === 'r-003') {
    return {
      name: 'Sushi Zen',
      tagline: 'Tradizione e purezza giapponese',
      address: 'Corso Magenta 12, Milano',
      rating: 4.9,
      reviews: 184,
      deliveryTime: '30–50 min',
      minOrder: 20,
      deliveryFee: 3.5,
      phone: '+39 02 7654321',
      image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c',
      imageAlt: 'Splendido set di sushi e sashimi assortito servito su ardesia scura',
      logoUrl: '/assets/images/logo_sushi.png',
      freeDeliveryActive: false,
      freeDeliveryThreshold: 0,
      paymentMethods: {
        cash_delivery: true,
        cash_pickup: true,
        card_delivery: true,
        card_pickup: true,
        cash: true,
        card: true,
        paypal: false,
      },
      orderModes: {
        delivery: true,
        pickup: true,
        table: true,
      },
    };
  } else if (normalizedSlug === 'burger-house' || normalizedSlug === 'r-005') {
    return {
      name: 'Burger House',
      tagline: 'Smash burger gourmet e birre artigianali',
      address: 'Via Torino 45, Milano',
      rating: 4.7,
      reviews: 245,
      deliveryTime: '20–35 min',
      minOrder: 10,
      deliveryFee: 2.0,
      phone: '+39 02 9876543',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
      imageAlt: 'Un hamburger gourmet gigante con formaggio fuso, bacon e cipolla caramellata',
      logoUrl: '/assets/images/logo_burger.png',
      freeDeliveryActive: false,
      freeDeliveryThreshold: 0,
      paymentMethods: {
        cash_delivery: true,
        cash_pickup: true,
        card_delivery: true,
        card_pickup: true,
        cash: true,
        card: true,
        paypal: true,
      },
      orderModes: {
        delivery: true,
        pickup: true,
        table: true,
      },
    };
  }

  // Fallback
  return {
    name: 'Ristorante Partner',
    tagline: 'Benvenuto nel nostro ordinatore digitale',
    address: 'Via Garibaldi 10, Milano',
    rating: 4.6,
    reviews: 42,
    deliveryTime: '30–45 min',
    minOrder: 15,
    deliveryFee: 2.9,
    phone: '+39 02 0000000',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
    imageAlt: 'Sala interna di un ristorante moderno ed accogliente',
    logoUrl: '',
    freeDeliveryActive: false,
    freeDeliveryThreshold: 0,
    paymentMethods: {
      cash_delivery: true,
      cash_pickup: true,
      card_delivery: true,
      card_pickup: true,
      cash: true,
      card: true,
      paypal: true,
    },
    orderModes: {
      delivery: true,
      pickup: true,
      table: true,
    },
  };
};

export function useRestaurantSettings(slugOrId: string) {
  const [settings, setSettings] = useState<UnifiedSettings>(() => {
    const base = getBaseRestaurantBySlug(slugOrId);
    return {
      ...base,
      freeDeliveryActive: base.freeDeliveryActive ?? false,
      freeDeliveryThreshold: base.freeDeliveryThreshold ?? 0,
      orderModes: base.orderModes || { delivery: true, pickup: true, table: true },
      paymentMethods: {
        card_delivery: base.paymentMethods?.card_delivery ?? true,
        card_pickup: base.paymentMethods?.card_pickup ?? true,
        cash_delivery: base.paymentMethods?.cash_delivery ?? true,
        cash_pickup: base.paymentMethods?.cash_pickup ?? true,
        cash: base.paymentMethods?.cash ?? true,
        card: base.paymentMethods?.card ?? true,
        paypal: base.paymentMethods?.paypal ?? true,
      },
      openingHours: base.openingHours || [{ start: '00:00', end: '23:59' }],
      deliveryHours: base.deliveryHours || [{ start: '00:00', end: '23:59' }],
    };
  });
  const [loading, setLoading] = useState(true);

  const loadSettings = () => {
    if (typeof window === 'undefined') return;
    try {
      const restaurantId = getRestaurantId(slugOrId);
      const base = getBaseRestaurantBySlug(slugOrId);

      // Try reading iGO_settings_[restaurantId] or iGO_settings_[slugOrId]
      const rawId = localStorage.getItem(`iGO_settings_${restaurantId}`);
      const rawSlug = localStorage.getItem(`iGO_settings_${slugOrId}`);
      const raw = rawId || rawSlug;

      if (raw) {
        const parsed = JSON.parse(raw);

        // Map from Dashboard SettingsData if applicable
        const isDashboardFormat = parsed.profile && parsed.deliveryConfig;

        const profile = isDashboardFormat ? parsed.profile : parsed;
        const deliveryConfig = isDashboardFormat ? parsed.deliveryConfig : parsed;
        const paymentMethodsData = parsed.paymentMethods || {};

        const unified: UnifiedSettings = {
          name: profile.name || base.name,
          tagline: profile.tagline || base.tagline,
          address: profile.address || base.address,
          phone: profile.phone || base.phone,
          email: profile.email || base.email,
          logoUrl: profile.logoUrl || base.logoUrl,
          image: base.image,
          imageAlt: base.imageAlt,
          rating: base.rating,
          reviews: base.reviews,
          deliveryTime: base.deliveryTime,
          minOrder:
            deliveryConfig.minOrder !== undefined
              ? parseFloat(deliveryConfig.minOrder)
              : base.minOrder,
          deliveryFee:
            deliveryConfig.deliveryFee !== undefined
              ? parseFloat(deliveryConfig.deliveryFee)
              : deliveryConfig.fixedFee !== undefined
                ? parseFloat(deliveryConfig.fixedFee)
                : base.deliveryFee,
          freeDeliveryActive:
            deliveryConfig.freeDeliveryActive !== undefined
              ? !!deliveryConfig.freeDeliveryActive
              : base.freeDeliveryActive || false,
          freeDeliveryThreshold:
            deliveryConfig.freeDeliveryThreshold !== undefined
              ? parseFloat(deliveryConfig.freeDeliveryThreshold)
              : base.freeDeliveryThreshold || 0,
          orderModes: {
            delivery: parsed.orderModes?.delivery !== false,
            pickup: parsed.orderModes?.pickup !== false,
            table: parsed.orderModes?.table !== false,
          },
          paymentMethods: {
            card_delivery: paymentMethodsData.card_delivery !== false,
            card_pickup: paymentMethodsData.card_pickup !== false,
            cash_delivery: paymentMethodsData.cash_delivery !== false,
            cash_pickup: paymentMethodsData.cash_pickup !== false,
            cash: paymentMethodsData.cash !== false,
            card: paymentMethodsData.card !== false,
            paypal: paymentMethodsData.paypal !== false,
          },
          openingHours: parsed.openingHours ||
            base.openingHours || [{ start: '00:00', end: '23:59' }],
          deliveryHours: parsed.deliveryHours ||
            base.deliveryHours || [{ start: '00:00', end: '23:59' }],
        };

        setSettings(unified);
      } else {
        // Just use base restaurant settings mapped to UnifiedSettings
        setSettings({
          ...base,
          freeDeliveryActive: base.freeDeliveryActive ?? false,
          freeDeliveryThreshold: base.freeDeliveryThreshold ?? 0,
          orderModes: base.orderModes || { delivery: true, pickup: true, table: true },
          paymentMethods: {
            card_delivery: base.paymentMethods?.card_delivery ?? true,
            card_pickup: base.paymentMethods?.card_pickup ?? true,
            cash_delivery: base.paymentMethods?.cash_delivery ?? true,
            cash_pickup: base.paymentMethods?.cash_pickup ?? true,
            cash: base.paymentMethods?.cash ?? true,
            card: base.paymentMethods?.card ?? true,
            paypal: base.paymentMethods?.paypal ?? true,
          },
          openingHours: base.openingHours || [{ start: '00:00', end: '23:59' }],
          deliveryHours: base.deliveryHours || [{ start: '00:00', end: '23:59' }],
        });
      }
    } catch (e) {
      console.error('Error loading settings in hook:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();

    // Listen for custom settings updated events
    const handleUpdate = () => {
      loadSettings();
    };

    window.addEventListener('iGO_settings_updated', handleUpdate);
    return () => {
      window.removeEventListener('iGO_settings_updated', handleUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugOrId]);

  return { settings, loading };
}
