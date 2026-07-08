import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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

      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', isoString)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (e) {
      console.error('Error fetching orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    if (!restaurantId || restaurantId === 'r-001') return;

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
        async (payload) => {
          // Re-fetch to get complete order details with nested items
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);

      if (error) throw error;

      // Update local state immediately for fast response
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));

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
