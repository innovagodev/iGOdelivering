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
  /** Non confermata entro la scadenza: nel pannello conta come cancellata ma si legge "Scaduta". */
  expired?: boolean;
  /** Scadenza per confermare (migration 034). */
  acceptDeadline?: string;
  notes?: string;
  createdAt?: string;
  preOrderItems?: any[];
  linkedOrderId?: string; // ← NUOVO: ID ordine generato quando confermata con pre-ordine
  preOrderTotal?: number; // ← NUOVO: totale calcolato del pre-ordine
}
