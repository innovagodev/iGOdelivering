import { Restaurant } from '@/types';

/**
 * Service per la gestione dei dati dei ristoranti
 * Qui andranno le chiamate reali a Supabase
 */
export const RestaurantService = {
  /**
   * Recupera tutti i ristoranti (per Superadmin)
   */
  async getAll(): Promise<Restaurant[]> {
    // Per ora restituiamo un array vuoto o mock
    // In futuro: return (await supabase.from('restaurants').select('*')).data;
    return [];
  },

  /**
   * Recupera un ristorante tramite slug (per Vetrina Cliente)
   */
  async getBySlug(slug: string): Promise<Restaurant | null> {
    return null;
  },

  /**
   * Crea un nuovo ristorante
   */
  async create(data: Partial<Restaurant>): Promise<Restaurant | null> {
    return null;
  },
};
