/**
 * Forma delle righe della pagina admin "Utenti", condivisa fra la route
 * `/api/admin/utenti` (che le costruisce) e la pagina (che le mostra).
 */

/**
 * - `invited`: ristorante pubblicato, link di attivazione valido, password non ancora creata.
 * - `invite_expired`: come sopra, ma il link è scaduto o non esiste: serve un nuovo invito.
 * - `active` / `suspended`: ristorante pubblicato / sospeso.
 * - `pending`: account attivato ma ristorante ancora in bozza.
 */
export type AccountState = 'active' | 'suspended' | 'pending' | 'invited' | 'invite_expired';

export interface AdminUserRow {
  /** Id dell'utente; per chi non ha ancora attivato l'account, quello del ristorante. */
  id: string;
  /** null = il titolare non ha ancora creato la password (nessun utente Auth). */
  userId: string | null;
  name: string;
  email: string;
  restaurantId: string | null;
  restaurantName: string;
  slug: string | null;
  account: AccountState;
  /** Ultimo login. null = mai entrato. */
  lastLogin: string | null;
  /** Ultimo ordine conteggiabile negli ultimi 90 giorni; null = nessuno. */
  lastOrderAt: string | null;
  /** Ordini conteggiabili degli ultimi 30 giorni. */
  orders30: number;
}

/** Giorni senza ordini oltre i quali un ristorante attivo risulta "inattivo". */
export const IDLE_DAYS = 14;
