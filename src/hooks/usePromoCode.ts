import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PromoCode, PromoType } from '@/types/promo';

export function usePromoCode(slugOrId: string) {
  const [promos, setPromos] = useState<PromoCode[]>([]);

  const loadPromos = async () => {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        slugOrId
      );

      const query = supabase.from('restaurants').select('id');
      const { data: restaurant } = isUuid
        ? await query.eq('id', slugOrId).maybeSingle()
        : await query.eq('slug', slugOrId).maybeSingle();

      if (!restaurant) return;

      const { data: promoData, error } = await supabase
        .from('promos')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('active', true);

      if (error) throw error;

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const visiblePromos: PromoCode[] = (promoData || [])
        .filter((p: any) => {
          if (p.start_date && todayStr < p.start_date) return false;
          if (p.end_date && todayStr > p.end_date) return false;
          return true;
        })
        .map((p: any) => ({
          id: p.id,
          code: p.code,
          type: p.type as PromoType,
          value: parseFloat(p.value),
          minOrderSubtotal: p.min_order_subtotal ? parseFloat(p.min_order_subtotal) : undefined,
          active: !!p.active,
          startDate: p.start_date || undefined,
          endDate: p.end_date || undefined,
          description: p.description || undefined,
          maxUses: p.max_uses || undefined,
          usedCount: p.used_count || 0,
          applicableDeliveryModes: p.applicable_delivery_modes || [],
        }));

      setPromos(visiblePromos);
    } catch (e) {
      console.error('Error loading promos in hook:', e);
      setPromos([]);
    }
  };

  useEffect(() => {
    loadPromos();
  }, [slugOrId]);

  const validatePromo = async (
    code: string,
    subtotal: number,
    email?: string,
    deliveryMode?: 'domicilio' | 'asporto' | 'tavolo',
    deliveryFee?: number
  ): Promise<{
    isValid: boolean;
    error?: string;
    discount?: number;
    promo?: PromoCode;
  }> => {
    const cleanCode = code.toUpperCase().trim();
    if (!cleanCode) {
      return { isValid: false, error: 'Inserisci un codice promozionale' };
    }

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        slugOrId
      );

      const query = supabase.from('restaurants').select('id');
      const { data: restaurant } = isUuid
        ? await query.eq('id', slugOrId).maybeSingle()
        : await query.eq('slug', slugOrId).maybeSingle();

      if (!restaurant) {
        return { isValid: false, error: 'Ristorante non trovato' };
      }

      const { data: promo, error } = await supabase
        .from('promos')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('code', cleanCode)
        .maybeSingle();

      if (error || !promo) {
        return { isValid: false, error: 'Codice promozionale non valido' };
      }

      if (!promo.active) {
        return { isValid: false, error: 'Questo codice non è attivo' };
      }

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      if (promo.start_date && todayStr < promo.start_date) {
        return { isValid: false, error: 'Questa promozione non è ancora attiva' };
      }
      if (promo.end_date && todayStr > promo.end_date) {
        return { isValid: false, error: 'Questa promozione è scaduta' };
      }

      // Max Uses Check
      if (
        promo.max_uses !== null &&
        promo.max_uses > 0 &&
        (promo.used_count || 0) >= promo.max_uses
      ) {
        return {
          isValid: false,
          error: 'Questo codice ha raggiunto il limite massimo di utilizzi',
        };
      }

      // Order Mode Check
      if (
        promo.applicable_delivery_modes &&
        promo.applicable_delivery_modes.length > 0 &&
        deliveryMode
      ) {
        if (!promo.applicable_delivery_modes.includes(deliveryMode)) {
          const modeLabels: Record<string, string> = {
            domicilio: 'Consegna a Domicilio',
            asporto: 'Asporto',
            tavolo: 'Ordine al Tavolo',
          };
          const allowedModesStr = promo.applicable_delivery_modes
            .map((m: string) => modeLabels[m] || m)
            .join(', ');
          return {
            isValid: false,
            error: `Questo codice è applicabile solo per: ${allowedModesStr}`,
          };
        }
      }

      // Threshold Check
      const minOrderVal = promo.min_order_subtotal ? parseFloat(promo.min_order_subtotal) : 0;
      if (minOrderVal > 0 && subtotal < minOrderVal) {
        return {
          isValid: false,
          error: `Ordine minimo richiesto per questa promo: € ${minOrderVal.toFixed(2)}`,
        };
      }

      // First Order Check
      if (promo.type === 'first_order') {
        if (!email || !email.trim()) {
          return {
            isValid: false,
            error: 'Inserisci il tuo indirizzo email nel form per verificare questa promo.',
          };
        }
        const cleanEmail = email.trim().toLowerCase();

        // Count orders for this email
        const { count, error: countError } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant.id)
          .eq('customer_email', cleanEmail);

        if (countError) {
          console.error('Error querying orders count:', countError);
        } else if (count && count > 0) {
          return {
            isValid: false,
            error:
              'Codice riservato solo al primo ordine. Risultano già altri ordini per questa email.',
          };
        }
      }

      let discount = 0;
      const promoValue = parseFloat(promo.value);
      if (promo.type === 'percentage' || promo.type === 'first_order') {
        discount = subtotal * (promoValue / 100);
      } else if (promo.type === 'free_delivery') {
        if (deliveryMode !== 'domicilio') {
          return {
            isValid: false,
            error: 'Il codice di consegna gratuita è applicabile solo per ordini a domicilio.',
          };
        }
        discount = deliveryFee || 0;
      } else {
        discount = Math.min(promoValue, subtotal);
      }

      const mappedPromo: PromoCode = {
        id: promo.id,
        code: promo.code,
        type: promo.type as PromoType,
        value: promoValue,
        minOrderSubtotal: minOrderVal || undefined,
        active: !!promo.active,
        startDate: promo.start_date || undefined,
        endDate: promo.end_date || undefined,
        description: promo.description || undefined,
        maxUses: promo.max_uses || undefined,
        usedCount: promo.used_count || 0,
        applicableDeliveryModes: promo.applicable_delivery_modes || [],
      };

      return {
        isValid: true,
        discount,
        promo: mappedPromo,
      };
    } catch (e: any) {
      console.error('Error validating promo code:', e);
      return { isValid: false, error: 'Errore interno durante la convalida del codice sconto' };
    }
  };

  return { validatePromo, promos, reloadPromos: loadPromos };
}
