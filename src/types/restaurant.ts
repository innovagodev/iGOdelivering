// Tipi globali per il dominio Menu & Ristorante

export type VisibilityType = 'always' | 'hidden' | 'scheduled';

export interface OptionChoice {
  id: string;
  name: string;
  price: string;
}

export interface OptionGroup {
  id: string;
  name: string;
  choices: OptionChoice[];
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  description: string;
  available: boolean;
  image: string;
  imageAlt: string;
  allergens: string[];
  dishTags?: string[];
  orders: number;
  visibility: VisibilityType;
  visibilitySchedule?: { from: string; to: string };
  optionGroups: OptionGroup[];
}

export interface MenuItemDraft {
  id: string;
  name: string;
  category: string;
  price: string;
  originalPrice?: string;
  description: string;
  available: boolean;
  imageUrl: string;
  allergens: string[];
  dishTags?: string[];
  visibility: VisibilityType;
  visibilitySchedule?: { from: string; to: string };
  optionGroups: OptionGroup[];
}

export interface DayHours {
  open: boolean;
  lunch: { from: string; to: string };
  dinner: { from: string; to: string };
  lunchEnabled?: boolean;
  dinnerEnabled?: boolean;
}

export interface ServiceHours {
  useCustom: boolean;
  hours: Record<string, DayHours>;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  logo?: string;
  status: 'active' | 'suspended' | 'pending';
  plan: 'starter' | 'pro' | 'enterprise';
  createdAt: string;
}
