import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { RestaurantSettings } from '@/types/settings';
import { ScheduledOrdersConfig } from '@/types/wizard';

export interface UnifiedSettings extends RestaurantSettings {
  id?: string;
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
  hours_config?: any;
}

const DEFAULT_SETTINGS: UnifiedSettings = {
  name: 'Caricamento...',
  tagline: '',
  address: '',
  phone: '',
  email: '',
  logoUrl: '',
  image: '',
  imageAlt: '',
  rating: 5.0,
  reviews: 0,
  deliveryTime: '20-40 min',
  minOrder: 0,
  deliveryFee: 0,
  freeDeliveryActive: false,
  freeDeliveryThreshold: 0,
  orderModes: { delivery: true, pickup: true, table: true },
  paymentMethods: {
    card_delivery: true,
    card_pickup: true,
    cash_delivery: true,
    cash_pickup: true,
    cash: true,
    card: true,
    paypal: false,
  },
  openingHours: [
    { start: '12:00', end: '14:30' },
    { start: '19:00', end: '22:30' },
  ],
  deliveryHours: [
    { start: '12:00', end: '14:30' },
    { start: '19:00', end: '22:30' },
  ],
};

export function useRestaurantSettings(slugOrId: string) {
  const [settings, setSettings] = useState<UnifiedSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    if (!slugOrId) return;
    setLoading(true);

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
      const query = supabase.from('restaurants').select('*, restaurant_hours(*)');
      
      const { data: restaurant, error } = isUuid
        ? await query.eq('id', slugOrId).maybeSingle()
        : await query.eq('slug', slugOrId).maybeSingle();

      if (error) throw error;

      if (restaurant) {
        // Map hours (deduplicating and sorting unique lunch & dinner slots)
        const rawHours = restaurant.restaurant_hours || [];
        let openingHours = DEFAULT_SETTINGS.openingHours;
        if (rawHours.length > 0) {
          const slotsMap = new Map<string, { start: string; end: string }>();
          rawHours.forEach((h: any) => {
            if (!h.is_open) return;
            if (h.lunch_enabled && h.lunch_from && h.lunch_to) {
              const start = h.lunch_from.slice(0, 5);
              const end = h.lunch_to.slice(0, 5);
              slotsMap.set(`${start}-${end}`, { start, end });
            }
            if (h.dinner_enabled && h.dinner_from && h.dinner_to) {
              const start = h.dinner_from.slice(0, 5);
              const end = h.dinner_to.slice(0, 5);
              slotsMap.set(`${start}-${end}`, { start, end });
            }
          });
          openingHours = slotsMap.size > 0
            ? Array.from(slotsMap.values()).sort((a, b) => a.start.localeCompare(b.start))
            : [];
        }

        const unified: UnifiedSettings = {
          id: restaurant.id,
          name: restaurant.name,
          tagline: restaurant.tagline || restaurant.description || '',
          address: restaurant.address || '',
          phone: restaurant.phone || '',
          email: restaurant.email || '',
          logoUrl: restaurant.logo_url || '',
          image: restaurant.background_url || '',
          imageAlt: restaurant.name,
          rating: 5.0,
          reviews: 0,
          deliveryTime: '20-40 min',
          minOrder: restaurant.min_order ? parseFloat(restaurant.min_order) : 0,
          deliveryFee: restaurant.delivery_fee ? parseFloat(restaurant.delivery_fee) : 0,
          freeDeliveryActive: !!restaurant.free_delivery_active,
          freeDeliveryThreshold: restaurant.free_delivery_threshold ? parseFloat(restaurant.free_delivery_threshold) : 0,
          orderModes: {
            delivery: !!restaurant.delivery_enabled,
            pickup: !!restaurant.pickup_enabled,
            table: !!restaurant.table_enabled,
          },
          paymentMethods: {
            card_delivery: !!restaurant.card_delivery,
            card_pickup: !!restaurant.card_pickup,
            cash_delivery: !!restaurant.cash_delivery,
            cash_pickup: !!restaurant.cash_pickup,
            cash: !!(restaurant.cash_delivery || restaurant.cash_pickup),
            card: !!(restaurant.card_delivery || restaurant.card_pickup),
            paypal: !!restaurant.paypal_enabled,
            paypal_enabled: !!restaurant.paypal_enabled,
            paypal_connected: !!restaurant.paypal_connected,
            paypal_email: restaurant.paypal_email || '',
            stripe_enabled: !!restaurant.stripe_enabled,
            stripe_connected: !!restaurant.stripe_connected,
            stripe_account_label: restaurant.stripe_account_label || '',
            iban_enabled: !!restaurant.iban_enabled,
            onlinePaymentAccount: restaurant.online_payment_account || '',
            ibanHolder: restaurant.iban_holder || '',
          },
          scheduledOrders: restaurant.scheduled_orders || undefined,
          openingHours,
          deliveryHours: openingHours,
          hours_config: restaurant.hours_config,
        };

        setSettings(unified);
      }
    } catch (e) {
      console.error('Error loading settings in hook:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [slugOrId]);

  return { settings, loading, refetch: loadSettings };
}
