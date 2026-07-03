'use client';
import React, { useState, useEffect } from 'react';
import {
  Clock,
  ChefHat,
  CheckCheck,
  AlertCircle,
  User,
  X,
  Check,
  MapPin,
  Utensils,
  Search,
  Bike,
  ShoppingBag,
  Printer,
  Calendar,
  Mail,
  Phone,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import { useOrders } from '@/hooks/useOrders';
import { supabase } from '@/lib/supabase';
import { useAudioNotification } from '@/components/ristoratore/AudioNotificationProvider';

type OrderStatus = 'pending' | 'accepted' | 'completed';

interface OrderItem {
  name: string;
  qty: number;
}

interface LiveOrder {
  id: string;
  orderNumber?: string;
  customer: string;
  phone?: string;
  items: OrderItem[];
  total: number;
  type: 'delivery' | 'takeaway' | 'table';
  minutesAgo: number;
  timestamp?: string;
  address?: string;
  tableNumber?: string;
  isBookingPreOrder?: boolean;
  status?: string;
  deliveryTime?: string;
  deliveryDate?: string;
  scheduledAt?: string | null;
}


const columns: {
  key: OrderStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgClass: string;
}[] = [
  {
    key: 'pending',
    label: 'Da Accettare',
    icon: <AlertCircle size={14} />,
    color: 'text-amber-600 border-amber-500 bg-amber-50 dark:bg-amber-950/20',
    bgClass: 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800/80',
  },
  {
    key: 'accepted',
    label: 'In Corso',
    icon: <ChefHat size={14} />,
    color: 'text-blue-600 border-blue-500 bg-blue-50 dark:bg-blue-950/20',
    bgClass: 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800/80',
  },
  {
    key: 'completed',
    label: 'Completati',
    icon: <CheckCheck size={14} />,
    color: 'text-emerald-600 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20',
    bgClass: 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800/80',
  },
];

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'danger';
}

export default function LiveOrderKanban() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || '';

  const { orders, updateOrderStatus, loading } = useOrders(restaurantId);
  const { isMuted, setIsMuted } = useAudioNotification();

  const [searchQuery, setSearchQuery] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'delivery' | 'takeaway' | 'table'>(
    'all'
  );
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [ticker, setTicker] = useState(0);
  const [activeMobileTab, setActiveMobileTab] = useState<OrderStatus>('pending');

  // Set up live ticking interval to refresh dynamic prep timers
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker((t) => t + 1);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const getOrderStatus = (o: any): string => {
    if (o.status === 'expired') return 'expired';
    // Gli ordini programmati non scadono mai automaticamente dopo 3 minuti
    if (o.scheduled_at) {
      return o.status || 'pending';
    }
    if (o.status === 'new' || o.status === 'pending') {
      const mins = Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(o.created_at || o.timestamp || o.createdAt).getTime()) / 60000
        )
      );
      if (mins >= 3) return 'expired';
    }
    return o.status || 'pending';
  };

  const mapFlatOrder = (o: any): LiveOrder => {
    const mins = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(o.created_at || o.timestamp || o.createdAt).getTime()) / 60000
      )
    );

    // Map array of items
    const items = Array.isArray(o.order_items)
      ? o.order_items.map((i: any) => ({
          name: i.name,
          qty: i.qty || 1,
        }))
      : Array.isArray(o.items)
        ? o.items.map((i: any) => ({
            name: i.name,
            qty: i.qty || 1,
          }))
        : [];

    const enriched = { ...o };
    if (enriched.scheduled_at && !enriched.deliveryTime) {
      const d = new Date(enriched.scheduled_at);
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      enriched.deliveryTime = `${hours}:${minutes}`;
      enriched.deliveryDate = enriched.scheduled_at.split('T')[0];
    }

    return {
      id: enriched.id || 'ord-unknown',
      orderNumber: enriched.order_number || enriched.id || 'ord-unknown',
      customer:
        enriched.customer_name ||
        enriched.customerName ||
        (enriched.customer && enriched.customer.name) ||
        enriched.email ||
        'Cliente',
      phone: enriched.customer_phone || (enriched.customer && enriched.customer.phone) || '',
      items,
      total: parseFloat(enriched.total) || 0,
      type: enriched.type === 'domicilio' ? 'delivery' : enriched.type === 'asporto' ? 'takeaway' : 'table',
      minutesAgo: mins,
      timestamp: enriched.created_at || enriched.timestamp || enriched.createdAt || new Date().toISOString(),
      address: enriched.customer_address || (enriched.customer && enriched.customer.address) || enriched.address || '',
      tableNumber: enriched.table_number || enriched.tableNumber,
      isBookingPreOrder: enriched.type === 'prenotazione_tavolo' || (enriched.id && enriched.id.startsWith('PRE-')),
      status: getOrderStatus(enriched),
      deliveryTime: enriched.deliveryTime || '',
      deliveryDate: enriched.deliveryDate || '',
      scheduledAt: enriched.scheduled_at || null,
    };
  };

  const showToast = (message: string, type: 'success' | 'danger') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const formatMinutesAgo = (mins: number) => {
    if (mins < 1) return 'ora';
    if (mins < 60) return `${mins}m fa`;
    if (mins < 1440) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m fa` : `${h}h fa`;
    }
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    return h > 0 ? `${d}g ${h}h fa` : `${d}g fa`;
  };

  const acceptOrder = async (orderId: string) => {
    const found = orders.find((o) => o.id === orderId);
    if (!found) return;
    try {
      await updateOrderStatus(orderId, 'preparing');
      const orderCode = found.order_number || found.id.replace('ord-', '').toUpperCase();
      showToast(
        `Ordine #${orderCode} di ${found.customer_name || found.customerName || 'Cliente'} accettato`,
        'success'
      );
    } catch (e) {
      showToast(`Errore durante l'accettazione dell'ordine`, 'danger');
    }
  };

  const completeOrder = async (orderId: string) => {
    const found = orders.find((o) => o.id === orderId);
    if (!found) return;
    try {
      await updateOrderStatus(orderId, 'delivered');
      const orderCode = found.order_number || found.id.replace('ord-', '').toUpperCase();
      showToast(`Ordine #${orderCode} completato`, 'success');
    } catch (e) {
      showToast(`Errore durante il completamento dell'ordine`, 'danger');
    }
  };

  const rejectOrder = async (status: OrderStatus, orderId: string) => {
    const found = orders.find((o) => o.id === orderId);
    if (!found) return;
    try {
      await updateOrderStatus(orderId, 'cancelled');
      const orderCode = found.order_number || found.id.replace('ord-', '').toUpperCase();
      showToast(`Ordine #${orderCode} rifiutato`, 'danger');
    } catch (e) {
      showToast(`Errore durante il rifiuto dell'ordine`, 'danger');
    }
  };

  const filteredOrders = (colKey: OrderStatus) => {
    return orders
      .filter((o) => {
        const orderStatus = o.status;
        if (colKey === 'pending') return orderStatus === 'new' || orderStatus === 'pending' || orderStatus === 'expired';
        if (colKey === 'accepted')
          return (
            orderStatus === 'accepted' ||
            orderStatus === 'preparing' ||
            orderStatus === 'ready' ||
            orderStatus === 'delivering'
          );
        if (colKey === 'completed')
          return orderStatus === 'completed' || orderStatus === 'delivered';
        return false;
      })
      .map(mapFlatOrder)
      .filter((order) => {
        const matchesSearch =
          order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = orderTypeFilter === 'all' || order.type === orderTypeFilter;
        
        let matchesStatus = true;
        if (statusFilter === 'active') {
          matchesStatus = order.status !== 'expired';
        } else if (statusFilter === 'expired') {
          matchesStatus = order.status === 'expired';
        }

        return matchesSearch && matchesType && matchesStatus;
      });
  };

  const handlePrintSingleOrder = (orderId: string) => {
    const baseOrder = orders.find((o) => o.id === orderId);
    if (!baseOrder) return;
    const rawOrder = { ...baseOrder };
    if (rawOrder.scheduled_at && !rawOrder.deliveryTime) {
      const d = new Date(rawOrder.scheduled_at);
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      rawOrder.deliveryTime = `${hours}:${minutes}`;
      rawOrder.deliveryDate = rawOrder.scheduled_at.split('T')[0];
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const restName = user?.restaurantName || 'iGOdelivering';

    const itemsHtml = (rawOrder.items || [])
      .map((item: any) => {
        const customNotes =
          item.addedIngredients?.length > 0 || item.removedIngredients?.length > 0
            ? `<div style="font-size: 11px; color: #555; margin-left: 10px; margin-top: 2px;">` +
              item.addedIngredients
                ?.map((i: any) => '+' + i.name)
                .concat(item.removedIngredients?.map((i: string) => '-' + i))
                .join(', ') +
              `</div>`
            : '';
        const itemNote = item.note
          ? `<div style="font-size: 11px; color: #ef4444; font-style: italic; margin-left: 10px; margin-top: 2px;">Nota: ${item.note}</div>`
          : '';

        return `
        <div style="border-bottom: 1px dashed #eee; padding: 6px 0; font-size: 14px;">
          <div style="display: flex; justify-content: space-between;">
            <strong>${item.qty}x ${item.name}</strong>
            <strong>€ ${((item.price || item.originalPrice || 0) * item.qty).toFixed(2)}</strong>
          </div>
          ${customNotes}
          ${itemNote}
        </div>
      `;
      })
      .join('');

    const formattedType =
      rawOrder.type === 'domicilio'
        ? 'CONSEGNA A DOMICILIO'
        : rawOrder.type === 'asporto'
          ? 'ASPORTO (RITIRO)'
          : `AL TAVOLO ${rawOrder.tableNumber || ''}`;

    const scheduledTime = rawOrder.deliveryTime
      ? `<div style="font-size: 15px; margin-top: 5px; color: #d97706; font-weight: bold; border: 1px solid #f59e0b; padding: 4px; border-radius: 4px; text-align: center;">
          PROGRAMMATO PER: ${
            rawOrder.deliveryDate
              ? `${new Date(rawOrder.deliveryDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} `
              : ''
          }
          ${rawOrder.deliveryTime === 'asap' ? 'IL PRIMA POSSIBILE' : `alle ${rawOrder.deliveryTime}`}
         </div>`
      : '';

    const kitchenNotes = rawOrder.notes
      ? `<div style="margin-top: 10px; padding: 8px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 4px; font-size: 12px; color: #b45309;">
          <strong>NOTA CUCINA:</strong> ${rawOrder.notes}
         </div>`
      : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Comanda ${rawOrder.id}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; padding: 10px; color: #000; }
            h2, h3 { text-align: center; margin: 5px 0; }
            .divider { border-top: 2px dashed #000; margin: 10px 0; }
            .footer { text-align: center; font-size: 10px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h2>${restName}</h2>
          <h3>COMANDA CUCINA</h3>
          <div style="text-align: center; font-size: 11px;">ID: ${rawOrder.order_number || rawOrder.id.replace('ord-', '').toUpperCase()}</div>
          <div style="text-align: center; font-size: 11px;">Data: ${new Date(rawOrder.timestamp || rawOrder.createdAt).toLocaleString('it-IT')}</div>
          
          <div class="divider"></div>
          
          <div style="font-weight: bold; font-size: 14px; text-align: center;">
            ${formattedType}
          </div>
          ${scheduledTime}
          
          <div class="divider"></div>
          
          <div>
            ${itemsHtml}
          </div>
          
          ${kitchenNotes}
          
          <div class="divider"></div>
          
          <div style="font-size: 13px;">
            <div><strong>Cliente:</strong> ${rawOrder.customerName || (rawOrder.customer && rawOrder.customer.name) || 'Cliente'}</div>
            ${(rawOrder.customer_phone || rawOrder.customer?.phone) ? `<div><strong>Tel:</strong> ${rawOrder.customer_phone || rawOrder.customer?.phone}</div>` : ''}
            ${rawOrder.type === 'domicilio' && rawOrder.customer?.address ? `<div><strong>Indirizzo:</strong> ${rawOrder.customer.address}</div>` : ''}
          </div>
          
          <div class="divider"></div>
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
            <span>TOTALE ORDINE:</span>
            <span>€ ${(rawOrder.total || 0).toFixed(2)}</span>
          </div>
          
          <div class="footer">
            Generato da iGOdelivering<br>
            *** Grazie per il tuo ordine ***
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintAllAcceptedOrders = (colOrders: LiveOrder[]) => {
    if (colOrders.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const restName = user?.restaurantName || 'iGOdelivering';

    const slipsHtml = colOrders
      .map((flatOrder, index) => {
        const rawOrder = orders.find((o) => o.id === flatOrder.id) || flatOrder;

        const itemsHtml = (rawOrder.items || [])
          .map((item: any) => {
            const customNotes =
              item.addedIngredients?.length > 0 || item.removedIngredients?.length > 0
                ? `<div style="font-size: 11px; color: #555; margin-left: 10px; margin-top: 2px;">` +
                  item.addedIngredients
                    ?.map((i: any) => '+' + i.name)
                    .concat(item.removedIngredients?.map((i: string) => '-' + i))
                    .join(', ') +
                  `</div>`
                : '';
            const itemNote = item.note
              ? `<div style="font-size: 11px; color: #ef4444; font-style: italic; margin-left: 10px; margin-top: 2px;">Nota: ${item.note}</div>`
              : '';

            return `
          <div style="border-bottom: 1px dashed #eee; padding: 6px 0; font-size: 14px;">
            <div style="display: flex; justify-content: space-between;">
              <strong>${item.qty}x ${item.name}</strong>
              <strong>€ ${((item.price || item.originalPrice || 0) * item.qty).toFixed(2)}</strong>
            </div>
            ${customNotes}
            ${itemNote}
          </div>
        `;
          })
          .join('');

        const formattedType =
          rawOrder.type === 'domicilio'
            ? 'CONSEGNA A DOMICILIO'
            : rawOrder.type === 'asporto'
              ? 'ASPORTO (RITIRO)'
              : `AL TAVOLO ${rawOrder.tableNumber || ''}`;

        const scheduledTime = rawOrder.deliveryTime
          ? `<div style="font-size: 15px; margin-top: 5px; color: #d97706; font-weight: bold; border: 1px solid #f59e0b; padding: 4px; border-radius: 4px; text-align: center;">
              PROGRAMMATO PER: ${
                rawOrder.deliveryDate
                  ? `${new Date(rawOrder.deliveryDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} `
                  : ''
              }
              ${rawOrder.deliveryTime === 'asap' ? 'IL PRIMA POSSIBILE' : `alle ${rawOrder.deliveryTime}`}
             </div>`
          : '';

        const kitchenNotes = rawOrder.notes
          ? `<div style="margin-top: 10px; padding: 8px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 4px; font-size: 12px; color: #b45309;">
              <strong>NOTA CUCINA:</strong> ${rawOrder.notes}
             </div>`
          : '';

        return `
        <div style="page-break-after: always; padding: 10px 0;">
          <h2 style="text-align: center; margin: 5px 0;">${restName}</h2>
          <h3 style="text-align: center; margin: 5px 0;">COMANDA IN CORSO (#${index + 1}/${colOrders.length})</h3>
          <div style="text-align: center; font-size: 11px;">ID: ${rawOrder.order_number || rawOrder.id.replace('ord-', '').toUpperCase()}</div>
          <div style="text-align: center; font-size: 11px;">Data: ${new Date(rawOrder.timestamp || rawOrder.createdAt).toLocaleString('it-IT')}</div>
          
          <div class="divider" style="border-top: 2px dashed #000; margin: 10px 0;"></div>
          
          <div style="font-weight: bold; font-size: 14px; text-align: center;">
            ${formattedType}
          </div>
          ${scheduledTime}
          
          <div class="divider" style="border-top: 2px dashed #000; margin: 10px 0;"></div>
          
          <div>
            ${itemsHtml}
          </div>
          
          ${kitchenNotes}
          
          <div class="divider" style="border-top: 2px dashed #000; margin: 10px 0;"></div>
          
          <div style="font-size: 13px;">
            <div><strong>Cliente:</strong> ${rawOrder.customerName || (rawOrder.customer && rawOrder.customer.name) || 'Cliente'}</div>
            ${(rawOrder.customer_phone || rawOrder.customer?.phone) ? `<div><strong>Tel:</strong> ${rawOrder.customer_phone || rawOrder.customer?.phone}</div>` : ''}
            ${rawOrder.type === 'domicilio' && rawOrder.customer?.address ? `<div><strong>Indirizzo:</strong> ${rawOrder.customer.address}</div>` : ''}
          </div>
          
          <div class="divider" style="border-top: 2px dashed #000; margin: 10px 0;"></div>
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
            <span>TOTALE ORDINE:</span>
            <span>€ ${(rawOrder.total || 0).toFixed(2)}</span>
          </div>
        </div>
      `;
      })
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Comande In Corso - ${restName}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; padding: 10px; color: #000; }
            .divider { border-top: 2px dashed #000; margin: 10px 0; }
            @media print {
              .no-print { display: none; }
              div { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${slipsHtml}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const renderActions = (colKey: OrderStatus, order: LiveOrder) => {
    if (order.status === 'expired') {
      return (
        <div className="mt-3 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              rejectOrder('pending', order.id);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:hover:bg-slate-900 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <X size={12} />
            Rifiuta
          </button>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await updateOrderStatus(order.id, 'preparing');
                const orderCode = order.orderNumber || order.id.replace('ord-', '').toUpperCase();
                showToast(`Ordine #${orderCode} riattivato in preparazione`, 'success');
              } catch (err) {
                showToast(`Errore durante la riattivazione dell'ordine`, 'danger');
              }
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-750 transition-colors cursor-pointer"
          >
            <Check size={12} />
            Recupera
          </button>
        </div>
      );
    }

    if (colKey === 'pending') {
      return (
        <div className="mt-3 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              rejectOrder('pending', order.id);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:hover:bg-slate-900 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <X size={12} />
            Rifiuta
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              acceptOrder(order.id);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <Check size={12} />
            Accetta
          </button>
        </div>
      );
    }

    if (colKey === 'accepted') {
      return (
        <div className="mt-3 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              rejectOrder('accepted', order.id);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:hover:bg-slate-900 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <X size={12} />
            Annulla
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              completeOrder(order.id);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <CheckCheck size={12} />
            Completa
          </button>
        </div>
      );
    }

    if (colKey === 'completed') {
      return (
        <div className="mt-2.5 flex justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              rejectOrder('completed', order.id);
            }}
            className="text-[10px] text-muted-foreground hover:text-red-500 font-medium transition-colors cursor-pointer"
          >
            Rimuovi dalla vista
          </button>
        </div>
      );
    }

    return null;
  };

  const getOrderTypeBadge = (
    type: LiveOrder['type'],
    tableNumber?: string,
    isBookingPreOrder?: boolean
  ) => {
    if (isBookingPreOrder) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50">
          <Calendar size={11} className="text-purple-500" /> Prenotazione
        </span>
      );
    }
    switch (type) {
      case 'delivery':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            <Bike size={11} className="text-slate-500" /> Domicilio
          </span>
        );
      case 'takeaway':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            <ShoppingBag size={11} className="text-slate-500" /> Asporto
          </span>
        );
      case 'table':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50">
            <Utensils size={11} className="text-blue-500" /> Tavolo {tableNumber || '-'}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-card border border-border shadow-xs rounded-lg p-4 relative">
      {/* Toast notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-3 py-2 rounded shadow-md text-xs font-semibold text-white animate-fade-in ${
              toast.type === 'success'
                ? 'bg-slate-900 dark:bg-slate-100 dark:text-slate-900'
                : 'bg-red-600'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              Pannello Ordini Live
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gestione ordinazioni in tempo reale
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Connesso
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/65 px-2.5 py-1 rounded border border-border text-xs">
            <span className="font-medium text-muted-foreground select-none">Suoni notifica</span>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                !isMuted ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-200 dark:bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white dark:bg-slate-900 transition-transform duration-200 ${
                  !isMuted ? 'translate-x-[14px]' : 'translate-x-[2px]'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Cerca per cliente o ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-8 pr-3 text-base rounded border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
          <Search className="absolute left-2.5 top-3 h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="w-full sm:w-44">
          <select
            value={orderTypeFilter}
            onChange={(e) => setOrderTypeFilter(e.target.value as any)}
            className="w-full h-9 px-2 text-base rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            <option value="all">Tutti i canali</option>
            <option value="delivery">Domicilio</option>
            <option value="takeaway">Asporto</option>
            <option value="table">Tavolo</option>
          </select>
        </div>
        <div className="w-full sm:w-44">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full h-9 px-2 text-base rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            <option value="all">Tutti gli stati</option>
            <option value="active">Solo Attivi</option>
            <option value="expired">Solo Persi</option>
          </select>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="flex md:hidden border border-border rounded-xl p-1 bg-muted/30 mb-4 gap-1">
        {columns.map((col) => {
          const count = filteredOrders(col.key).length;
          const isActive = activeMobileTab === col.key;
          return (
            <button
              key={`tab-${col.key}`}
              type="button"
              onClick={() => setActiveMobileTab(col.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-bold rounded-lg transition-all ${
                isActive
                  ? 'bg-card text-foreground shadow-xs border border-border/80'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              }`}
            >
              {col.label}
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => {
          const isMobileHidden = activeMobileTab !== col.key;
          const colOrders = filteredOrders(col.key);
          return (
            <div
              key={`col-${col.key}`}
              className={`flex flex-col gap-2.5 border rounded-lg p-3 ${col.bgClass} ${
                isMobileHidden ? 'hidden md:flex' : 'flex'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-850 pb-2 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 dark:text-slate-400">{col.icon}</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {col.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {col.key === 'accepted' && colOrders.length > 0 && (
                    <button
                      onClick={() => handlePrintAllAcceptedOrders(colOrders)}
                      className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                      title="Stampa tutte le comande in corso"
                    >
                      <Printer size={12} /> Stampa Tutto
                    </button>
                  )}
                  <span className="bg-slate-200/75 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {colOrders.length}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 flex-1 min-h-[450px]">
                {colOrders.length === 0 && (
                  <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded py-10 text-center text-xs text-muted-foreground bg-background/50">
                    Nessun ordine
                  </div>
                )}
                {colOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`bg-white dark:bg-slate-950 border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 cursor-pointer hover:scale-[1.01] duration-150 group ${
                      order.status === 'expired'
                        ? 'opacity-55 border-rose-500/80 bg-rose-500/5 dark:border-rose-500/30 dark:bg-rose-500/5 border-dashed border-2 hover:opacity-100 hover:border-rose-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Header: ID, Customer Name and Badges */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-900 pb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          {order.status === 'expired' && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500 text-white dark:bg-rose-950/40 dark:text-rose-450 border border-rose-500/20 uppercase flex-shrink-0 animate-pulse">
                              Scaduto
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">
                            #{order.orderNumber}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate">
                          {order.customer}
                        </h4>
                        {order.phone && (
                          <div className="mt-1">
                            <a
                              href={`tel:${order.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100/60 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40 transition-colors"
                              title="Chiama cliente"
                            >
                              <Phone size={10} />
                              {order.phone}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintSingleOrder(order.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
                          title="Stampa comanda"
                        >
                          <Printer size={13} />
                        </button>
                        {getOrderTypeBadge(order.type, order.tableNumber, order.isBookingPreOrder)}
                      </div>
                    </div>

                    {/* Middle: Items List */}
                    <div className="py-0.5">
                      <ul className="space-y-1.5">
                        {order.items.map((item, idx) => (
                          <li
                            key={`${order.id}-item-${idx}`}
                            className="text-xs text-slate-700 dark:text-slate-400 flex justify-between items-center"
                          >
                            <span className="truncate font-semibold">{item.name}</span>
                            <span className="font-extrabold text-slate-900 dark:text-slate-200 ml-2 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] flex-shrink-0">
                              ×{item.qty}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Service/Additional info */}
                    {order.isBookingPreOrder && (
                      <div className="bg-purple-500/5 border border-purple-200/30 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-[10px] text-purple-700 dark:text-purple-300 font-semibold mt-0.5">
                        <Calendar size={10} />
                        <span>Pre-ordine tavolo</span>
                      </div>
                    )}

                    {order.type === 'table' && !order.isBookingPreOrder && order.tableNumber && (
                      <div className="bg-blue-500/5 border border-blue-200/30 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-[10px] text-blue-700 dark:text-blue-300 font-semibold mt-0.5">
                        <Utensils size={10} />
                        <span>Servire al Tavolo {order.tableNumber}</span>
                      </div>
                    )}

                    {order.address && (
                      <div className="flex items-start gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-900">
                        <MapPin size={11} className="mt-0.5 flex-shrink-0 text-slate-400" />
                        <span className="line-clamp-1 font-medium">{order.address}</span>
                      </div>
                    )}

                    {order.scheduledAt && order.deliveryTime && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-300 font-bold mt-0.5 animate-pulse">
                        <Clock size={10} className="text-amber-500" />
                        <span>
                          PROGRAMMATO: {order.deliveryDate ? `${new Date(order.deliveryDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} ` : ''}
                          alle {order.deliveryTime}
                        </span>
                      </div>
                    )}

                    {/* Footer: Elapsed Time and Total Price */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-900 mt-1">
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1 font-medium">
                          <Clock size={11} />
                          <span className="tabular-nums">{formatMinutesAgo(order.minutesAgo)}</span>
                        </div>
                      </div>
                      <span className="text-sm font-black tabular-nums text-slate-900 dark:text-slate-100">
                        € {order.total.toFixed(2)}
                      </span>
                    </div>

                    {renderActions(col.key, order)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Right Sidebar Drawer Modal */}
      {(() => {
        const selectedOrder = orders.find((o) => o.id === selectedOrderId);
        if (!selectedOrderId || !selectedOrder) return null;

        const selectedOrderStatus = getOrderStatus(selectedOrder);

        return (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300 cursor-pointer"
              onClick={() => setSelectedOrderId(null)}
            />

            <div className="relative w-full sm:w-[480px] h-full bg-white dark:bg-slate-950 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">
                      #{selectedOrder.order_number || selectedOrder.id.replace('ord-', '').toUpperCase()}
                    </span>
                    {selectedOrderStatus === 'new' || selectedOrderStatus === 'pending' ? (
                      <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/20">
                        Da Accettare
                      </span>
                    ) : selectedOrderStatus === 'expired' ? (
                      <span className="bg-rose-500 text-white dark:bg-rose-950/40 dark:text-rose-450 text-[10px] font-extrabold px-2 py-0.5 rounded border border-rose-500/20 animate-pulse">
                        Scaduto
                      </span>
                    ) : selectedOrderStatus === 'accepted' ||
                      selectedOrderStatus === 'preparing' ||
                      selectedOrderStatus === 'delivering' ? (
                      <span className="bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/20">
                        In Corso
                      </span>
                    ) : selectedOrderStatus === 'completed' ||
                      selectedOrderStatus === 'delivered' ? (
                      <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                        Completato
                      </span>
                    ) : (
                      <span className="bg-rose-500/10 text-rose-700 dark:text-rose-450 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-500/20">
                        Rifiutato
                      </span>
                    )}
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {selectedOrder.customerName ||
                      selectedOrder.customer?.name ||
                      'Dettaglio Ordine'}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedOrderId(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Canale / Tipo Ordine & Data */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-100 dark:border-slate-900/60">
                  <div>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider mb-1">
                      Tipo Canale
                    </span>
                    <div className="flex items-center gap-1.5">
                      {selectedOrder.type === 'domicilio' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <Bike size={13} className="text-slate-500" /> Domicilio
                        </span>
                      ) : selectedOrder.type === 'asporto' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <ShoppingBag size={13} className="text-slate-500" /> Asporto
                        </span>
                      ) : selectedOrder.type === 'prenotazione_tavolo' ||
                        selectedOrder.id.startsWith('PRE-') ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-400">
                          <Calendar size={13} className="text-purple-500" /> Prenotazione
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                          <Utensils size={13} className="text-blue-500" /> Tavolo{' '}
                          {selectedOrder.tableNumber || ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider mb-1">
                      Ricevuto Il
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block tabular-nums">
                      {new Date(selectedOrder.timestamp || selectedOrder.createdAt).toLocaleString(
                        'it-IT',
                        {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </span>
                  </div>

                  {selectedOrder.deliveryTime && (
                    <div className="col-span-2 border-t border-slate-100 dark:border-slate-900/60 pt-2 mt-1">
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider mb-0.5">
                        Orario Consegna/Ritiro
                      </span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        {selectedOrder.deliveryTime === 'asap'
                          ? 'IL PRIMA POSSIBILE (ASAP)'
                          : `ALLE ${selectedOrder.deliveryTime}`}
                        {selectedOrder.deliveryDate &&
                          ` del ${new Date(selectedOrder.deliveryDate).toLocaleDateString('it-IT')}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Informazioni Cliente */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Dettaglio Cliente
                  </h3>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <User size={13} />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-none mb-0.5">
                          Nominativo
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {selectedOrder.customerName || selectedOrder.customer?.name || 'Cliente'}
                        </span>
                      </div>
                    </div>

                    {(selectedOrder.customer_phone || selectedOrder.customer?.phone) && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400">
                          <Phone size={13} />
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-none mb-0.5">
                            Telefono
                          </span>
                          <a
                            href={`tel:${selectedOrder.customer_phone || selectedOrder.customer?.phone}`}
                            className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400 block"
                          >
                            {selectedOrder.customer_phone || selectedOrder.customer?.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedOrder.customer?.email &&
                      selectedOrder.customer.email !== 'mock@example.com' &&
                      selectedOrder.customer.email !== 'prenotazione@internal.it' && (
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400">
                            <Mail size={13} />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-none mb-0.5">
                              Email
                            </span>
                            <a
                              href={`mailto:${selectedOrder.customer.email}`}
                              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline block truncate max-w-[280px]"
                            >
                              {selectedOrder.customer.email}
                            </a>
                          </div>
                        </div>
                      )}

                    {selectedOrder.type === 'domicilio' &&
                      (selectedOrder.address || selectedOrder.customer?.address) && (
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400 mt-0.5">
                            <MapPin size={13} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-none mb-0.5">
                              Indirizzo Consegna
                            </span>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block leading-tight">
                              {selectedOrder.address || selectedOrder.customer?.address}
                            </span>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.address || selectedOrder.customer?.address || '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-600 hover:underline dark:text-blue-400 mt-1 cursor-pointer"
                            >
                              Mappa Google <ExternalLink size={9} />
                            </a>
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* Note Cucina / Ordine */}
                {selectedOrder.notes && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2">
                    <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 block mb-0.5">
                        Note dalla Cucina
                      </span>
                      <p className="text-xs text-amber-900 dark:text-amber-300 italic leading-tight">
                        &quot;{selectedOrder.notes}&quot;
                      </p>
                    </div>
                  </div>
                )}

                {/* Dettagli Piatti / Carrello */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Riepilogo Piatti
                  </h3>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <div className="divide-y divide-slate-100 dark:divide-slate-900">
                      {(selectedOrder.items || []).map((item: any, idx: number) => {
                        const customNotes =
                          item.addedIngredients?.length > 0 || item.removedIngredients?.length > 0
                            ? item.addedIngredients
                                ?.map((i: any) => '+' + i.name)
                                .concat(item.removedIngredients?.map((i: string) => '-' + i))
                                .join(', ')
                            : '';
                        const itemNote = item.note;

                        return (
                          <div
                            key={idx}
                            className="p-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/35 transition-colors"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                                    {item.qty}x
                                  </span>
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {item.name}
                                  </span>
                                </div>
                                {customNotes && (
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                    <strong>Personalizzazioni:</strong> {customNotes}
                                  </div>
                                )}
                                {itemNote && (
                                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium italic mt-0.5 leading-snug flex items-center gap-1">
                                    <MessageSquare size={10} /> {itemNote}
                                  </div>
                                )}
                              </div>
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums flex-shrink-0">
                                € {((item.price || item.originalPrice || 0) * item.qty).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Totali */}
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-3 border-t border-slate-100 dark:border-slate-900 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        TOTALE COMPLESSIVO
                      </span>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                        € {(selectedOrder.total || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visual Mockup Thermal Receipt Comanda */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-sans font-bold">
                      Scontrino Comanda
                    </h3>
                    <button
                      onClick={() => handlePrintSingleOrder(selectedOrder.id)}
                      className="text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-sans"
                    >
                      <Printer size={10} /> Stampa Comanda
                    </button>
                  </div>

                  <div className="bg-[#fcfbf9] text-black border border-amber-100/50 shadow-inner rounded-xl p-4 font-mono text-[11px] select-none max-w-sm mx-auto relative overflow-hidden dark:bg-[#faf9f6] dark:text-black">
                    <div className="absolute top-0 inset-x-0 h-1 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 to-transparent" />

                    <div className="text-center space-y-0.5">
                      <div className="text-xs font-bold tracking-widest uppercase">
                        {user?.restaurantName || 'iGOdelivering'}
                      </div>
                      <div className="text-[9px] uppercase font-bold text-slate-600">
                        COMANDA CUCINA
                      </div>
                      <div className="text-[8px] text-slate-500">
                        ID: {selectedOrder.order_number || selectedOrder.id.replace('ord-', '').toUpperCase()}
                      </div>
                      <div className="text-[8px] text-slate-500">
                        {new Date(
                          selectedOrder.timestamp || selectedOrder.createdAt
                        ).toLocaleString('it-IT')}
                      </div>
                    </div>

                    <div className="border-t border-dashed border-black/35 my-2" />

                    <div className="text-center font-bold text-[11px] tracking-wide py-0.5 border-y border-dashed border-black/35 my-1.5">
                      {selectedOrder.type === 'domicilio'
                        ? 'CONSEGNA A DOMICILIO'
                        : selectedOrder.type === 'asporto'
                          ? 'ASPORTO (RITIRO)'
                          : selectedOrder.type === 'prenotazione_tavolo' ||
                              selectedOrder.id.startsWith('PRE-')
                            ? 'PRENOTAZIONE TAVOLO'
                            : `AL TAVOLO ${selectedOrder.tableNumber || ''}`}
                    </div>

                    {selectedOrder.deliveryTime && (
                      <div className="text-center font-bold text-[10px] bg-black/5 p-1 rounded my-1.5 border border-black/10">
                        ORARIO:{' '}
                        {selectedOrder.deliveryTime === 'asap'
                          ? 'IL PRIMA POSSIBILE'
                          : `ALLE ${selectedOrder.deliveryTime}`}
                      </div>
                    )}

                    <div className="border-t border-dashed border-black/35 my-1.5" />

                    <div className="space-y-2 my-2">
                      {(selectedOrder.items || []).map((item: any, idx: number) => {
                        const itemCustomStr =
                          item.addedIngredients?.length > 0 || item.removedIngredients?.length > 0
                            ? item.addedIngredients
                                ?.map((i: any) => '+' + i.name)
                                .concat(item.removedIngredients?.map((i: string) => '-' + i))
                                .join(', ')
                            : '';
                        return (
                          <div key={idx} className="space-y-0.5">
                            <div className="flex justify-between font-bold">
                              <span>
                                {item.qty}x {item.name}
                              </span>
                              <span>
                                € {((item.price || item.originalPrice || 0) * item.qty).toFixed(2)}
                              </span>
                            </div>
                            {itemCustomStr && (
                              <div className="text-[9px] text-slate-700 pl-3 leading-tight">
                                * {itemCustomStr}
                              </div>
                            )}
                            {item.note && (
                              <div className="text-[9px] text-red-600 pl-3 font-bold italic leading-tight">
                                NOTA: {item.note}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {selectedOrder.notes && (
                      <div className="bg-black/5 p-1.5 border border-black/10 rounded text-[9px] leading-tight my-1.5">
                        <strong>NOTA CUCINA:</strong> {selectedOrder.notes}
                      </div>
                    )}

                    <div className="border-t border-dashed border-black/35 my-2" />

                    <div className="space-y-0.5 text-[10px] text-slate-700">
                      <div>
                        <strong>Cliente:</strong>{' '}
                        {selectedOrder.customerName || selectedOrder.customer?.name || 'Cliente'}
                      </div>
                      {(selectedOrder.customer_phone || selectedOrder.customer?.phone) && (
                        <div>
                          <strong>Tel:</strong> {selectedOrder.customer_phone || selectedOrder.customer?.phone}
                        </div>
                      )}
                      {selectedOrder.type === 'domicilio' &&
                        (selectedOrder.address || selectedOrder.customer?.address) && (
                          <div className="leading-tight">
                            <strong>Indirizzo:</strong>{' '}
                            {selectedOrder.address || selectedOrder.customer?.address}
                          </div>
                        )}
                    </div>

                    <div className="border-t-2 border-dashed border-black my-2" />

                    <div className="flex justify-between font-extrabold text-[12px]">
                      <span>TOTALE CUCINA:</span>
                      <span>€ {(selectedOrder.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Action Bar / Footer */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex gap-2.5">
                <button
                  onClick={() => handlePrintSingleOrder(selectedOrder.id)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center cursor-pointer"
                  title="Stampa comanda"
                >
                  <Printer size={16} />
                </button>

                {selectedOrderStatus === 'new' || selectedOrderStatus === 'pending' ? (
                  <>
                    <button
                      onClick={() => {
                        rejectOrder('pending', selectedOrder.id);
                        setSelectedOrderId(null);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-700 dark:border-slate-850 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-all font-bold text-xs cursor-pointer flex items-center justify-center gap-1"
                    >
                      <X size={14} /> Rifiuta
                    </button>
                    <button
                      onClick={() => {
                        acceptOrder(selectedOrder.id);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-all font-bold text-xs cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Check size={14} /> Accetta
                    </button>
                  </>
                ) : selectedOrderStatus === 'expired' ? (
                  <>
                    <button
                      onClick={() => {
                        rejectOrder('pending', selectedOrder.id);
                        setSelectedOrderId(null);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-700 dark:border-slate-850 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-all font-bold text-xs cursor-pointer flex items-center justify-center gap-1"
                    >
                      <X size={14} /> Rifiuta
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await updateOrderStatus(selectedOrder.id, 'preparing');
                          const orderCode = selectedOrder.order_number || selectedOrder.id.replace('ord-', '').toUpperCase();
                          showToast(`Ordine #${orderCode} riattivato in preparazione`, 'success');
                          setSelectedOrderId(null);
                        } catch (err) {
                          showToast(`Errore durante la riattivazione dell'ordine`, 'danger');
                        }
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-550 text-white dark:bg-emerald-600 dark:hover:bg-emerald-750 transition-all font-bold text-xs cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                    >
                      <ChefHat size={14} /> Riattiva in Preparazione
                    </button>
                  </>
                ) : selectedOrderStatus === 'accepted' ||
                  selectedOrderStatus === 'preparing' ||
                  selectedOrderStatus === 'delivering' ? (
                  <>
                    <button
                      onClick={() => {
                        rejectOrder('accepted', selectedOrder.id);
                        setSelectedOrderId(null);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-700 dark:border-slate-850 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-all font-bold text-xs cursor-pointer flex items-center justify-center gap-1"
                    >
                      <X size={14} /> Annulla
                    </button>
                    <button
                      onClick={() => {
                        completeOrder(selectedOrder.id);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-all font-bold text-xs cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                    >
                      <CheckCheck size={14} /> Completa
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      rejectOrder('completed', selectedOrder.id);
                      setSelectedOrderId(null);
                    }}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-850 dark:hover:bg-slate-900 dark:text-slate-300 transition-all font-semibold text-xs cursor-pointer"
                  >
                    Rimuovi dalla vista
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
