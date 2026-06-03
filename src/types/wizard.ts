import { MenuItemDraft as GlobalMenuItemDraft } from './restaurant';

export interface RestaurantInfo {
  name: string;
  category: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  province: string;
  cap: string;
  vatNumber: string;
  logoUrl: string;
  backgroundImageUrl: string;
}

export interface TableBookingConfig {
  enabled: boolean;
  maxGuests: number;
  slotDuration: number;
  advanceBookingDays: number;
  serviceEnabled: boolean;
}

export interface DishVisibility {
  mode: 'always' | 'hidden' | 'time_range' | 'date_range';
  timeFrom: string;
  timeTo: string;
  days: string[];
  dateFrom: string;
  dateFromTime: string;
  dateTo: string;
  dateToTime: string;
}

export interface MenuItemWizardDraft extends Omit<
  GlobalMenuItemDraft,
  'optionGroups' | 'visibility'
> {
  imageFile: File | null;
  optionGroups: string[];
  visibility: DishVisibility;
  singleSupplements?: { id: string; name: string; price: number }[];
}

export interface DeliveryZone {
  id: string;
  name: string;
  radius: number;
  minOrder: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  enabled: boolean;
}

export interface ScheduledOrdersConfig {
  enabled: boolean;
  pickup: { minNoticeValue: number; minNoticeUnit: string; maxNoticeDays: number };
  delivery: {
    minNoticeValue: number;
    minNoticeUnit: string;
    maxNoticeDays: number;
    timeWindowMinutes: number;
  };
  onPremise: { minNoticeValue: number; minNoticeUnit: string; maxNoticeDays: number };
  hideAsap: boolean;
  pickupExpanded: boolean;
  deliveryExpanded: boolean;
  onPremiseExpanded: boolean;
  altroExpanded: boolean;
}

export interface WizardOptionChoice {
  id: string;
  name: string;
  price: number;
}
export interface WizardOptionGroup {
  id: string;
  name: string;
  choices: WizardOptionChoice[];
  appliedTo: string[];
  minSelections?: number;
  maxSelections?: number | null;
}
