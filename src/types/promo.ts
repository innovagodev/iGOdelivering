export type PromoType = 'percentage' | 'fixed_amount' | 'threshold_based' | 'first_order';

export interface PromoCode {
  id: string;
  code: string;
  type: PromoType;
  value: number;
  minOrderSubtotal?: number;
  active: boolean;
  startDate?: string;
  endDate?: string;
  description?: string;
}
