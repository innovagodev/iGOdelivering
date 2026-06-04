import { useState, useEffect } from 'react';
import { RestaurantSettings } from '@/types/settings';
import { ScheduledOrdersConfig } from '@/types/wizard';
import { getRestaurantId, isMockRestaurant, slugify } from '@/lib/restaurant-utils';
import { STORAGE_KEYS } from '@/lib/storage-keys';

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
    stripe_enabled?: boolean;
    stripe_connected?: boolean;
    stripe_account_label?: string;
    stripe_account_id?: string;
    paypal_enabled?: boolean;
    paypal_connected?: boolean;
    paypal_email?: string;
    paypal_merchant_id?: string;
    iban_enabled?: boolean;
    onlinePaymentAccount?: string;
    ibanHolder?: string;
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
    card_delivery: boolean;
    card_pickup: boolean;
    cash_delivery: boolean;
    cash_pickup: boolean;
    cash: boolean;
    card: boolean;
    paypal: boolean;
    stripe_enabled?: boolean;
    stripe_connected?: boolean;
    stripe_account_label?: string;
    stripe_account_id?: string;
    paypal_enabled?: boolean;
    paypal_connected?: boolean;
    paypal_email?: string;
    paypal_merchant_id?: string;
    iban_enabled?: boolean;
    onlinePaymentAccount?: string;
    ibanHolder?: string;
  };
  orderModes?: {
    delivery: boolean;
    pickup: boolean;
    table: boolean;
  };
  openingHours?: { start: string; end: string }[];
  deliveryHours?: { start: string; end: string }[];
  scheduledOrders?: ScheduledOrdersConfig;
}

const getBaseRestaurantBySlug = (slug: string): BaseRestaurant => {
  const normalizedSlug = (slug || '').toLowerCase();

  if (!isMockRestaurant(slug)) {
    // Look up in localStorage restaurants list if not mock
    if (typeof window !== 'undefined') {
      try {
        const storedStr = localStorage.getItem(STORAGE_KEYS.RESTAURANTS);
        if (storedStr) {
          const restaurants = JSON.parse(storedStr);
          const matched = restaurants.find(
            (r: any) =>
              (r.name && slugify(r.name) === normalizedSlug) ||
              r.id === normalizedSlug ||
              (r.email && r.email.toLowerCase() === normalizedSlug)
          );
          if (matched) {
            return {
              name: matched.name,
              tagline: '',
              address: '',
              rating: 5.0,
              reviews: 0,
              deliveryTime: '',
              minOrder: 0,
              deliveryFee: 0,
              phone: matched.phone || '',
              email: matched.email || '',
              image: '',
              imageAlt: '',
              logoUrl: '',
              freeDeliveryActive: false,
              freeDeliveryThreshold: 0,
              paymentMethods: {
                cash_delivery: false,
                cash_pickup: false,
                card_delivery: false,
                card_pickup: false,
                cash: false,
                card: false,
                paypal: false,
              },
              orderModes: {
                delivery: false,
                pickup: false,
                table: false,
              },
            };
          }
        }
      } catch (e) {
        console.error('Error looking up dynamic restaurant in hook:', e);
      }
    }

    // Fallback blank settings for custom restaurants
    const formattedName = slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      name: formattedName || 'Nuovo Ristorante',
      tagline: '',
      address: '',
      rating: 5.0,
      reviews: 0,
      deliveryTime: '',
      minOrder: 0,
      deliveryFee: 0,
      phone: '',
      email: '',
      image: '',
      imageAlt: '',
      logoUrl: '',
      freeDeliveryActive: false,
      freeDeliveryThreshold: 0,
      paymentMethods: {
        cash_delivery: false,
        cash_pickup: false,
        card_delivery: false,
        card_pickup: false,
        cash: false,
        card: false,
        paypal: false,
      },
      orderModes: {
        delivery: false,
        pickup: false,
        table: false,
      },
    };
  }

  if (normalizedSlug === 'pizzeria-bella-napoli' || normalizedSlug === 'r-001') {

    return {
      name: 'Pizzeria Bella Napoli',
      tagline: 'Autentica pizza napoletana dal 1987',
      address: 'Via Roma 24, Milano',
      rating: 4.8,
      reviews: 312,
      deliveryTime: '25–40 min',
      minOrder: 0,
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
      openingHours: [
        { start: '11:30', end: '14:30' },
        { start: '19:00', end: '22:30' },
      ],
      deliveryHours: [
        { start: '11:30', end: '14:30' },
        { start: '19:00', end: '22:30' },
      ],
    };
  } else if (normalizedSlug === 'sushi-zen' || normalizedSlug === 'r-003') {
    return {
      name: 'Sushi Zen',
      tagline: 'Tradizione e purezza giapponese',
      address: 'Corso Magenta 12, Milano',
      rating: 4.9,
      reviews: 184,
      deliveryTime: '30–50 min',
      minOrder: 0,
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
      minOrder: 0,
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
    minOrder: 0,
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
        stripe_enabled: base.paymentMethods?.stripe_enabled ?? (isMockRestaurant(slugOrId) && !!base.paymentMethods?.card),
        stripe_connected: base.paymentMethods?.stripe_connected ?? (isMockRestaurant(slugOrId) && !!base.paymentMethods?.card),
        stripe_account_label: base.paymentMethods?.stripe_account_label ?? (isMockRestaurant(slugOrId) && !!base.paymentMethods?.card ? 'account_demo@stripe.com' : ''),
        stripe_account_id: base.paymentMethods?.stripe_account_id ?? (isMockRestaurant(slugOrId) && !!base.paymentMethods?.card ? 'acct_demo' : ''),
        paypal_enabled: base.paymentMethods?.paypal_enabled ?? (isMockRestaurant(slugOrId) && !!base.paymentMethods?.paypal),
        paypal_connected: base.paymentMethods?.paypal_connected ?? (isMockRestaurant(slugOrId) && !!base.paymentMethods?.paypal),
        paypal_email: base.paymentMethods?.paypal_email ?? (isMockRestaurant(slugOrId) && !!base.paymentMethods?.paypal ? 'account_demo@paypal.com' : ''),
        paypal_merchant_id: base.paymentMethods?.paypal_merchant_id ?? (isMockRestaurant(slugOrId) && !!base.paymentMethods?.paypal ? 'merch_demo' : ''),
        iban_enabled: base.paymentMethods?.iban_enabled ?? false,
        onlinePaymentAccount: base.paymentMethods?.onlinePaymentAccount ?? '',
        ibanHolder: base.paymentMethods?.ibanHolder ?? '',
      },
      openingHours: base.openingHours || [
        { start: '11:30', end: '14:30' },
        { start: '19:00', end: '22:30' },
      ],
      deliveryHours: base.deliveryHours || [
        { start: '11:30', end: '14:30' },
        { start: '19:00', end: '22:30' },
      ],
      scheduledOrders: base.scheduledOrders,
    };
  });
  const [loading, setLoading] = useState(true);

  const loadSettings = () => {
    if (typeof window === 'undefined') return;
    try {
      const restaurantId = getRestaurantId(slugOrId);
      const base = getBaseRestaurantBySlug(slugOrId);

      // Try reading iGO_settings_[restaurantId] or iGO_settings_[slugOrId]
      const rawId = localStorage.getItem(STORAGE_KEYS.settings(restaurantId));
      const rawSlug = localStorage.getItem(STORAGE_KEYS.settings(slugOrId));
      const raw = rawId || rawSlug;

      if (raw) {
        const parsed = JSON.parse(raw);

        const profile = parsed.profile || parsed;
        const deliveryConfig = parsed.deliveryConfig || parsed;
        const paymentMethodsData = parsed.paymentMethods || {};

        const unified: UnifiedSettings = {
          name: profile.name || base.name,
          tagline: profile.tagline || profile.description || base.tagline,
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
            card: paymentMethodsData.stripe_enabled ? !!paymentMethodsData.stripe_connected : (paymentMethodsData.card !== false),
            paypal: paymentMethodsData.paypal_enabled ? !!paymentMethodsData.paypal_connected : (paymentMethodsData.paypal !== false),
            stripe_enabled: paymentMethodsData.stripe_enabled !== undefined
              ? !!paymentMethodsData.stripe_enabled
              : (isMockRestaurant(slugOrId) && paymentMethodsData.card !== false),
            stripe_connected: paymentMethodsData.stripe_connected !== undefined
              ? !!paymentMethodsData.stripe_connected
              : (isMockRestaurant(slugOrId) && paymentMethodsData.card !== false),
            stripe_account_id: paymentMethodsData.stripe_account_id || (isMockRestaurant(slugOrId) && paymentMethodsData.card !== false ? 'acct_demo' : ''),
            stripe_account_label: paymentMethodsData.stripe_account_label || (isMockRestaurant(slugOrId) && paymentMethodsData.card !== false ? 'account_demo@stripe.com' : ''),
            paypal_enabled: paymentMethodsData.paypal_enabled !== undefined
              ? !!paymentMethodsData.paypal_enabled
              : (isMockRestaurant(slugOrId) && paymentMethodsData.paypal !== false),
            paypal_connected: paymentMethodsData.paypal_connected !== undefined
              ? !!paymentMethodsData.paypal_connected
              : (isMockRestaurant(slugOrId) && paymentMethodsData.paypal !== false),
            paypal_merchant_id: paymentMethodsData.paypal_merchant_id || (isMockRestaurant(slugOrId) && paymentMethodsData.paypal !== false ? 'merch_demo' : ''),
            paypal_email: paymentMethodsData.paypal_email || (isMockRestaurant(slugOrId) && paymentMethodsData.paypal !== false ? 'account_demo@paypal.com' : ''),
            iban_enabled: !!paymentMethodsData.iban_enabled,
            onlinePaymentAccount: paymentMethodsData.onlinePaymentAccount || '',
            ibanHolder: paymentMethodsData.ibanHolder || '',
          },
          openingHours: parsed.openingHours ||
            base.openingHours || [
              { start: '11:30', end: '14:30' },
              { start: '19:00', end: '22:30' },
            ],
          deliveryHours: parsed.deliveryHours ||
            base.deliveryHours || [
              { start: '11:30', end: '14:30' },
              { start: '19:00', end: '22:30' },
            ],
          scheduledOrders: parsed.scheduledOrders || base.scheduledOrders,
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
            stripe_enabled: base.paymentMethods?.stripe_enabled ?? (isMockRestaurant(slugOrId) && !!base.paymentMethods?.card),
            stripe_connected: base.paymentMethods?.stripe_connected ?? (isMockRestaurant(slugOrId) && !!base.paymentMethods?.card),
            stripe_account_label: base.paymentMethods?.stripe_account_label ?? (isMockRestaurant(slugOrId) && !!base.paymentMethods?.card ? 'account_demo@stripe.com' : ''),
            stripe_account_id: base.paymentMethods?.stripe_account_id ?? (isMockRestaurant(slugOrId) && !!base.paymentMethods?.card ? 'acct_demo' : ''),
            paypal_enabled: base.paymentMethods?.paypal_enabled ?? (isMockRestaurant(slugOrId) && !!base.paymentMethods?.paypal),
            paypal_connected: base.paymentMethods?.paypal_connected ?? (isMockRestaurant(slugOrId) && !!base.paymentMethods?.paypal),
            paypal_email: base.paymentMethods?.paypal_email ?? (isMockRestaurant(slugOrId) && !!base.paymentMethods?.paypal ? 'account_demo@paypal.com' : ''),
            paypal_merchant_id: base.paymentMethods?.paypal_merchant_id ?? (isMockRestaurant(slugOrId) && !!base.paymentMethods?.paypal ? 'merch_demo' : ''),
            iban_enabled: base.paymentMethods?.iban_enabled ?? false,
            onlinePaymentAccount: base.paymentMethods?.onlinePaymentAccount ?? '',
            ibanHolder: base.paymentMethods?.ibanHolder ?? '',
          },
          openingHours: base.openingHours || [
            { start: '11:30', end: '14:30' },
            { start: '19:00', end: '22:30' },
          ],
          deliveryHours: base.deliveryHours || [
            { start: '11:30', end: '14:30' },
            { start: '19:00', end: '22:30' },
          ],
          scheduledOrders: base.scheduledOrders,
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
