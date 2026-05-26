import { useState, useEffect } from 'react';
import { PromoCode } from '@/types/promo';
import { getRestaurantId } from '@/lib/restaurant-utils';
import { STORAGE_KEYS } from '@/lib/storage-keys';

export function usePromoCode(slugOrId: string) {
  const [promos, setPromos] = useState<PromoCode[]>([]);

  const loadPromos = () => {
    if (typeof window === 'undefined') return;
    try {
      const restaurantId = getRestaurantId(slugOrId);
      const raw = localStorage.getItem(STORAGE_KEYS.promos(restaurantId));
      let allCodes: PromoCode[] = [];
      if (raw) {
        allCodes = JSON.parse(raw).map((p: any) => ({
          ...p,
          type: p.type === 'fixed' ? 'fixed_amount' : p.type,
        }));
      } else {
        // Use defaults if empty
        allCodes = [
          {
            id: 'promo-1',
            code: 'WELCOME10',
            type: 'first_order',
            value: 10,
            minOrderSubtotal: 15,
            active: true,
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            description: 'Sconto del 10% per i nuovi clienti con spesa minima di 15€',
          },
          {
            id: 'promo-2',
            code: 'PIZZA5',
            type: 'threshold_based',
            value: 5,
            minOrderSubtotal: 30,
            active: true,
            startDate: '2026-05-01',
            endDate: '2026-08-31',
            description: 'Sconto fisso di 5€ su ordini superiori a 30€',
          }
        ];
      }

      // Dynamic visibility: filter out inactive and expired promos
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const visiblePromos = allCodes.filter((p) => {
        if (!p.active) return false;
        if (p.startDate && todayStr < p.startDate) return false;
        if (p.endDate && todayStr > p.endDate) return false;
        return true;
      });

      setPromos(visiblePromos);
    } catch (e) {
      console.error('Error loading promos in hook:', e);
      setPromos([]);
    }
  };

  useEffect(() => {
    loadPromos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugOrId]);

  const validatePromo = (
    code: string,
    subtotal: number,
    email?: string
  ): {
    isValid: boolean;
    error?: string;
    discount?: number;
    promo?: PromoCode;
  } => {
    const cleanCode = code.toUpperCase().trim();
    if (!cleanCode) {
      return { isValid: false, error: 'Inserisci un codice promozionale' };
    }

    // Load full list of codes from localStorage to perform robust validations (e.g. check if expired)
    let allPromos: PromoCode[] = [];
    try {
      const restaurantId = getRestaurantId(slugOrId);
      const raw = localStorage.getItem(STORAGE_KEYS.promos(restaurantId));
      if (raw) {
        allPromos = JSON.parse(raw).map((p: any) => ({
          ...p,
          type: p.type === 'fixed' ? 'fixed_amount' : p.type,
        }));
      }
    } catch (e) {
      console.error('Error loading raw promos in validatePromo:', e);
    }

    // Include standard default codes if not already loaded from storage
    if (cleanCode === 'WELCOME10' && !allPromos.some((p) => p.code === 'WELCOME10')) {
      allPromos.push({
        id: 'promo-1',
        code: 'WELCOME10',
        type: 'first_order',
        value: 10,
        minOrderSubtotal: 15,
        active: true,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        description: 'Sconto del 10% per i nuovi clienti con spesa minima di 15€',
      });
    }
    if (cleanCode === 'PIZZA5' && !allPromos.some((p) => p.code === 'PIZZA5')) {
      allPromos.push({
        id: 'promo-2',
        code: 'PIZZA5',
        type: 'threshold_based',
        value: 5,
        minOrderSubtotal: 30,
        active: true,
        startDate: '2026-05-01',
        endDate: '2026-08-31',
        description: 'Sconto fisso di 5€ su ordini superiori a 30€',
      });
    }

    const found = allPromos.find((p) => p.code === cleanCode);
    if (!found) {
      return { isValid: false, error: 'Codice promozionale non valido' };
    }

    if (!found.active) {
      return { isValid: false, error: 'Questo codice non è attivo' };
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (found.startDate && todayStr < found.startDate) {
      return { isValid: false, error: 'Questa promozione non è ancora attiva' };
    }
    if (found.endDate && todayStr > found.endDate) {
      return { isValid: false, error: 'Questa promozione è scaduta' };
    }

    // Threshold Check (Sconto a Soglia)
    if (found.minOrderSubtotal && subtotal < found.minOrderSubtotal) {
      return {
        isValid: false,
        error: `Ordine minimo richiesto per questa promo: € ${found.minOrderSubtotal.toFixed(2)}`,
      };
    }

    // First Order Check
    if (found.type === 'first_order') {
      if (!email || !email.trim()) {
        return {
          isValid: false,
          error: 'Inserisci il tuo indirizzo email nel form per verificare questa promo.',
        };
      }
      const cleanEmail = email.trim().toLowerCase();
      try {
        const restaurantId = getRestaurantId(slugOrId);
        const rawOrders = localStorage.getItem(STORAGE_KEYS.orders(restaurantId));
        if (rawOrders) {
          const orders = JSON.parse(rawOrders);
          const hasOrdered = orders.some((o: any) => o.email && o.email.trim().toLowerCase() === cleanEmail);
          if (hasOrdered) {
            return {
              isValid: false,
              error: 'Codice riservato solo al primo ordine. Risultano già altri ordini per questa email.',
            };
          }
        }
      } catch (e) {
        console.error('Error validating first order promo email:', e);
      }
    }

    let discount = 0;
    if (found.type === 'percentage' || found.type === 'first_order') {
      discount = subtotal * (found.value / 100);
    } else {
      discount = Math.min(found.value, subtotal);
    }

    return {
      isValid: true,
      discount,
      promo: found,
    };
  };

  return { validatePromo, promos, reloadPromos: loadPromos };
}
