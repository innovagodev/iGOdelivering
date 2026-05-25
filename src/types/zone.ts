export interface DeliveryZoneConfig {
  id: string;
  name: string;
  radius: number; // in km
  minOrder: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  enabled: boolean;
  caps?: string; // Comma separated CAPs
  coordinates?: {
    lat: number;
    lng: number;
  };
}
