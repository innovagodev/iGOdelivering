import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAllPages } from '@/lib/fetchAll';

export function useOrders(restaurantId: string) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!restaurantId || restaurantId === 'r-001') {
      setLoading(false);
      return;
    }
    try {
      // Limit order fetching to the last 14 days for optimal performance
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const isoString = fourteenDaysAgo.toISOString();

      // A pagine: una richiesta è tagliata a 1000 righe senza avviso, e un locale
      // molto attivo supera gli 1000 ordini in 14 giorni.
      const data = await fetchAllPages((from, to) =>
        supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', isoString)
          // Ordini online non (ancora) pagati: fuori dalla cucina e dai conteggi.
          // In attesa di pagamento o scaduti senza pagamento (migration 028/030).
          .not('payment_status', 'in', '(pending,failed)')
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to)
      );
      setOrders(data);
    } catch (e) {
      console.error('Error fetching orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    if (!restaurantId || restaurantId === 'r-001') return;

    // Più eventi ravvicinati (un ordine che passa da più stati) fanno una sola
    // rilettura: prima ognuno rileggeva da capo 14 giorni di ordini con le righe.
    let refetchTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (refetchTimer) return;
      refetchTimer = setTimeout(() => {
        refetchTimer = null;
        fetchOrders();
      }, 800);
    };

    // Subscribe to changes on orders table for this restaurant
    const channel = supabase
      .channel(`orders:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          // Rilettura per avere i dettagli completi con le righe, raggruppata
          scheduleRefetch();
        }
      )
      .subscribe();

    return () => {
      if (refetchTimer) clearTimeout(refetchTimer);
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      if (status === 'cancelled') {
        // L'annullamento passa dal server, che rimborsa il cliente se l'ordine
        // è stato pagato online (A10). Il database rifiuta comunque
        // l'annullamento diretto di un ordine pagato (migration 030).
        const res = await fetch('/api/order/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Annullamento non riuscito');
      } else if (
        status === 'preparing' &&
        orders.find((o) => o.id === orderId)?.payment_status === 'authorized'
      ) {
        // Pagamento solo autorizzato: l'accettazione cattura l'importo, lo fa il
        // server. Il database rifiuta il cambio di stato diretto (migration 032).
        const res = await fetch('/api/order/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          // Finestra scaduta: il pannello mostra subito l'ordine come perso.
          if (json.expired) fetchOrders();
          throw new Error(json.error || 'Accettazione non riuscita');
        }
      } else {
        const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
        if (error) throw error;
      }

      // Update local state immediately for fast response
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status,
                ...(status === 'preparing' && o.payment_status === 'authorized'
                  ? { payment_status: 'paid' }
                  : {}),
                ...(status === 'cancelled' && o.payment_status === 'authorized'
                  ? { payment_status: 'voided' }
                  : {}),
              }
            : o
        )
      );

      // Trigger order status email notification in the background
      if (status === 'preparing' || status === 'cancelled') {
        fetch('/api/order/send-status-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, status }),
        }).catch((err) => {
          console.error('[useOrders] Error calling send-status-email API:', err);
        });
      }
    } catch (e) {
      console.error(`Error updating order status to ${status}:`, e);
      throw e;
    }
  };

  return { orders, loading, refetch: fetchOrders, updateOrderStatus };
}
