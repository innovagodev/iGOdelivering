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
  cash_delivery: boolean;
  cash_pickup: boolean;
  cash?: boolean;
  card?: boolean;
  paypal?: boolean;
  onlinePaymentAccount?: string;
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

// Legacy flat interface kept for client-side / hook backwards compatibility
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
    cash_delivery?: boolean;
    cash_pickup?: boolean;
  };
  openingHours?: { start: string; end: string }[];
  deliveryHours?: { start: string; end: string }[];
  scheduledOrders?: ScheduledOrdersConfig;
}
