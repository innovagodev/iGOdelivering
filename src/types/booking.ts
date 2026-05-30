export interface TableBooking {
  id: string;
  restaurantId?: string;
  name: string;
  phone: string;
  email?: string;
  guests: number;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
  createdAt?: string;
  preOrderItems?: any[];
  linkedOrderId?: string; // ← NUOVO: ID ordine generato quando confermata con pre-ordine
  preOrderTotal?: number; // ← NUOVO: totale calcolato del pre-ordine
}
