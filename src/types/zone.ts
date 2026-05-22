export interface DeliveryZoneConfig {
  id: string;
  name: string;
  radius: number; // in km
  minOrder: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  enabled: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
}
