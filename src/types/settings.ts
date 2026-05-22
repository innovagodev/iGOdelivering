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
  };
  openingHours?: { start: string; end: string }[];
  deliveryHours?: { start: string; end: string }[];
}
