import { ScheduledOrdersConfig } from './wizard';

export interface RestaurantProfile {
  name: string;
  logoUrl: string;
  category: string;
  address: string;
  phone: string;
  email: string;
  tagline: string;
  description?: string;
}

export interface RestaurantOrderModes {
  delivery: boolean;
  pickup: boolean;
  table: boolean;
}

export interface RestaurantDeliveryConfig {
  fixedFee: number;
  minOrder: number;
  freeDeliveryThreshold: number;
  freeDeliveryActive: boolean;
}

export interface RestaurantPaymentMethods {
  card_delivery: boolean;
  card_pickup: boolean;
  card_table: boolean;
  cash_delivery: boolean;
  cash_pickup: boolean;
  cash_table: boolean;
  cash?: boolean;
  card?: boolean;
  // Stripe Connect OAuth
  stripe_enabled?: boolean;
  stripe_connected?: boolean; // true = account Stripe collegato via OAuth
  stripe_account_id?: string; // acct_xxx — ID pubblico account Stripe (non sensibile)
  stripe_account_label?: string; // Nome leggibile account (es. email ristorante)
  stripe_delivery?: boolean;
  stripe_pickup?: boolean;
  stripe_table?: boolean;
  // PayPal OAuth
  paypal_enabled?: boolean;
  paypal_connected?: boolean; // true = account PayPal collegato via OAuth
  paypal_merchant_id?: string; // ID pubblico account PayPal (non sensibile)
  paypal_email?: string; // Email account PayPal (per UI)
  paypal_delivery?: boolean;
  paypal_pickup?: boolean;
  paypal_table?: boolean;
  // IBAN (dato pubblico, nessun OAuth)
  iban_enabled?: boolean;
  onlinePaymentAccount?: string; // Codice IBAN
  ibanHolder?: string; // Intestatario conto
}

export interface RestaurantSettingsFull {
  profile: RestaurantProfile;
  orderModes: RestaurantOrderModes;
  deliveryConfig: RestaurantDeliveryConfig;
  paymentMethods: RestaurantPaymentMethods;
  openingHours?: { start: string; end: string }[];
  deliveryHours?: { start: string; end: string }[];
  scheduledOrders?: ScheduledOrdersConfig;
}

export interface RestaurantSettings {
  name: string;
  tagline?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  image?: string;
  imageAlt?: string;
  minOrder?: number;
  deliveryFee?: number;
  freeDeliveryActive?: boolean;
  freeDeliveryThreshold?: number;
  paymentMethods?: {
    cash: boolean;
    card: boolean;
    paypal: boolean;
    card_delivery?: boolean;
    card_pickup?: boolean;
    card_table?: boolean;
    cash_delivery?: boolean;
    cash_pickup?: boolean;
    cash_table?: boolean;
    // Stripe Connect
    stripe_enabled?: boolean;
    stripe_connected?: boolean;
    stripe_account_id?: string;
    stripe_account_label?: string;
    stripe_delivery?: boolean;
    stripe_pickup?: boolean;
    stripe_table?: boolean;
    // PayPal OAuth
    paypal_enabled?: boolean;
    paypal_connected?: boolean;
    paypal_merchant_id?: string;
    paypal_email?: string;
    paypal_delivery?: boolean;
    paypal_pickup?: boolean;
    paypal_table?: boolean;
    // IBAN
    iban_enabled?: boolean;
    onlinePaymentAccount?: string;
    ibanHolder?: string;
  };
  openingHours?: { start: string; end: string }[];
  deliveryHours?: { start: string; end: string }[];
  scheduledOrders?: ScheduledOrdersConfig;
}
