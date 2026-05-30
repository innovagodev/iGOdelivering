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

type OrderStatus = 'pending' | 'accepted' | 'completed';

interface OrderItem {
  name: string;
  qty: number;
}

interface LiveOrder {
  id: string;
  customer: string;
  items: OrderItem[];
  total: number;
  type: 'delivery' | 'takeaway' | 'table';
  minutesAgo: number;
  timestamp?: string;
  address?: string;
  tableNumber?: string;
  isBookingPreOrder?: boolean;
}

const initialOrders: Record<OrderStatus, LiveOrder[]> = {
  pending: [
    {
      id: 'ORD-3005-0001',
      customer: 'Marco Ferretti',
      items: [
        { name: 'Pizza Margherita', qty: 2 },
        { name: 'Coca-Cola', qty: 2 },
      ],
      total: 26.5,
      type: 'delivery',
      minutesAgo: 2,
      address: 'Via Roma 14, Milano',
    },
    {
      id: 'ASP-3005-0002',
      customer: 'Sara Conti',
      items: [
        { name: 'Spaghetti Carbonara', qty: 1 },
        { name: 'Tiramisù', qty: 1 },
      ],
      total: 19.8,
      type: 'takeaway',
      minutesAgo: 4,
    },
    {
      id: 'TAV5-3005-0003',
      customer: 'Luca Bianchi',
      items: [
        { name: 'Tagliata di manzo', qty: 1 },
        { name: 'Acqua nat.', qty: 2 },
      ],
      total: 34.0,
      type: 'table',
      minutesAgo: 6,
      tableNumber: '5',
    },
  ],
  accepted: [
    {
      id: 'ORD-3005-0004',
      customer: 'Giulia Marino',
      items: [
        { name: 'Pizza Diavola', qty: 1 },
        { name: 'Birra artigianale', qty: 1 },
      ],
      total: 21.0,
      type: 'delivery',
      minutesAgo: 10,
      address: 'Via Torino 8',
    },
    {
      id: 'ASP-3005-0005',
      customer: 'Davide Ricci',
      items: [{ name: 'Antipasto misto', qty: 2 }],
      total: 18.5,
      type: 'takeaway',
      minutesAgo: 12,
    },
  ],
  completed: [
    {
      id: 'ORD-3005-0006',
      customer: 'Antonio De Luca',
      items: [
        { name: "Penne all'arrabbiata", qty: 1 },
        { name: 'Dolce', qty: 1 },
      ],
      total: 22.0,
      type: 'delivery',
      minutesAgo: 35,
      address: 'Via Padova 120',
    },
    {
      id: 'TAV3-3005-0007',
      customer: 'Francesca N.',
      items: [{ name: 'Spigola al sale', qty: 1 }],
      total: 28.0,
      type: 'table',
      minutesAgo: 45,
      tableNumber: '3',
    },
  ],
};

const columns: { key: OrderStatus; label: string; icon: React.ReactNode; color: string; bgClass: string }[] = [
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
  const restaurantId = user?.restaurantId || 'r-001';

  const [orders, setOrders] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'delivery' | 'takeaway' | 'table'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [ticker, setTicker] = useState(0);

  // Set up live ticking interval to refresh dynamic prep timers
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker((t) => t + 1);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const renderKitchenTimer = (timestamp?: string) => {
    const timeVal = timestamp || new Date().toISOString();
    const mins = Math.max(0, Math.floor((Date.now() - new Date(timeVal).getTime()) / 60000));
    
    let colorClass = '';
    let pulseClass = '';
    let label = '';
    
    if (mins < 15) {
      colorClass = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20';
      pulseClass = 'bg-emerald-500';
      label = `${mins}m in prep`;
    } else if (mins <= 30) {
      colorClass = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse';
      pulseClass = 'bg-amber-500';
      label = `${mins}m in cucina`;
    } else {
      colorClass = 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/40 animate-pulse font-extrabold';
      pulseClass = 'bg-rose-600';
      label = `${mins}m RITARDO!`;
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold tracking-wide ${colorClass}`}>
        <span className="relative flex h-1.5 w-1.5">
          {mins >= 15 && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseClass}`}></span>
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${pulseClass}`}></span>
        </span>
        <Clock size={10} className="flex-shrink-0" />
        <span className="tabular-nums">{label}</span>
      </span>
    );
  };

  const seenOrderIdsRef = React.useRef<Set<string>>(new Set());
  const isFirstLoadRef = React.useRef(true);

  // Request browser notification permissions on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Synthesize double-chime notification sound using Web Audio API
  const playNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // First chime note (C5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = 523.25;
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.3);

      // Second chime note (E5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 659.25;
      gain2.gain.setValueAtTime(0, ctx.currentTime + 0.15);
      gain2.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.55);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.55);
    } catch (e) {
      console.error('Audio play failed', e);
    }
  };

  // Watch for new live orders to play audio & trigger browser push alert
  useEffect(() => {
    if (orders.length > 0) {
      if (isFirstLoadRef.current) {
        // Initialize seen IDs so we don't notify for past orders on load
        orders.forEach((o) => seenOrderIdsRef.current.add(o.id));
        isFirstLoadRef.current = false;
        return;
      }

      const pendingList = orders.filter((o) => o.status === 'new' || o.status === 'pending');
      let lastNewOrder: any = null;
      let hasNew = false;

      pendingList.forEach((o) => {
        if (!seenOrderIdsRef.current.has(o.id)) {
          seenOrderIdsRef.current.add(o.id);
          hasNew = true;
          lastNewOrder = o;
        }
      });

      if (hasNew && lastNewOrder) {
        playNotificationSound();
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification("Nuovo Ordine Ricevuto!", {
            body: `Nuovo ordine #${lastNewOrder.id.replace('ord-', '').toUpperCase()} da ${lastNewOrder.customerName || 'Cliente'} - € ${(lastNewOrder.total || 0).toFixed(2)}`,
            icon: '/favicon.ico',
          });
        }
      }
    }
  }, [orders, soundEnabled]);

  const mapFlatOrder = (o: any): LiveOrder => {
    const mins = Math.max(0, Math.floor((Date.now() - new Date(o.timestamp || o.createdAt).getTime()) / 60000));
    
    // Map array of items
    const items = Array.isArray(o.items) ? o.items.map((i: any) => ({
      name: i.name,
      qty: i.qty || 1,
    })) : [];

    return {
      id: o.id || 'ord-unknown',
      customer: o.customerName || (o.customer && o.customer.name) || o.email || 'Cliente',
      items,
      total: o.total || 0,
      type: o.type === 'domicilio' ? 'delivery' : o.type === 'asporto' ? 'takeaway' : 'table',
      minutesAgo: mins,
      timestamp: o.timestamp || o.createdAt || new Date().toISOString(),
      address: o.customer && o.customer.address ? o.customer.address : o.address,
      tableNumber: o.tableNumber,
      isBookingPreOrder: o.type === 'prenotazione_tavolo' || (o.id && o.id.startsWith('PRE-')),
    };
  };

  useEffect(() => {
    const loadAndMapOrders = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.orders(restaurantId));
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setOrders(parsed);
          } else {
            // Grouped object format migration if present
            const flatList: any[] = [];
            const grouped = parsed as any;
            if (grouped.pending) {
              grouped.pending.forEach((o: any) => flatList.push({ ...o, status: 'new' }));
            }
            if (grouped.accepted) {
              grouped.accepted.forEach((o: any) => flatList.push({ ...o, status: 'accepted' }));
            }
            if (grouped.completed) {
              grouped.completed.forEach((o: any) => flatList.push({ ...o, status: 'completed' }));
            }
            setOrders(flatList);
            localStorage.setItem(STORAGE_KEYS.orders(restaurantId), JSON.stringify(flatList));
          }
        } else {
          // Initialize mock orders as a flat list
          const flatList: any[] = [];
          Object.entries(initialOrders).forEach(([colKey, items]) => {
            items.forEach((item) => {
              flatList.push({
                id: item.id,
                customerName: item.customer,
                items: item.items,
                total: item.total,
                type: item.type === 'delivery' ? 'domicilio' : item.type === 'takeaway' ? 'asporto' : 'tavolo',
                timestamp: new Date(Date.now() - item.minutesAgo * 60000).toISOString(),
                customer: {
                  name: item.customer,
                  email: 'mock@example.com',
                  phone: '123',
                  address: item.address || '',
                },
                tableNumber: item.tableNumber,
                status: colKey === 'pending' ? 'new' : colKey === 'accepted' ? 'accepted' : 'completed',
              });
            });
          });
          setOrders(flatList);
          localStorage.setItem(STORAGE_KEYS.orders(restaurantId), JSON.stringify(flatList));
          window.dispatchEvent(new Event('iGO_orders_updated'));
        }
      } catch (e) {
        console.error('Error reading/migrating orders:', e);
      }
    };

    loadAndMapOrders();

    // Listen for order updates (checkout or other panels)
    window.addEventListener('iGO_orders_updated', loadAndMapOrders);
    return () => {
      window.removeEventListener('iGO_orders_updated', loadAndMapOrders);
    };
  }, [restaurantId]);

  const updateOrdersInStorage = (updatedList: any[]) => {
    setOrders(updatedList);
    try {
      localStorage.setItem(STORAGE_KEYS.orders(restaurantId), JSON.stringify(updatedList));
      window.dispatchEvent(new Event('iGO_orders_updated'));
    } catch (e) {
      console.error('Error writing orders:', e);
    }
  };

  const showToast = (message: string, type: 'success' | 'danger') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const acceptOrder = (orderId: string) => {
    const found = orders.find((o) => o.id === orderId);
    if (!found) return;
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status: 'accepted' } : o));
    updateOrdersInStorage(updated);
    showToast(`Ordine ${orderId} di ${found.customerName || 'Cliente'} accettato`, 'success');
  };

  const completeOrder = (orderId: string) => {
    const found = orders.find((o) => o.id === orderId);
    if (!found) return;
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status: 'completed' } : o));
    updateOrdersInStorage(updated);
    showToast(`Ordine ${orderId} completato`, 'success');
  };

  const rejectOrder = (status: OrderStatus, orderId: string) => {
    const found = orders.find((o) => o.id === orderId);
    if (!found) return;
    // Mark as rejected so the storefront can detect the status change
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status: 'rejected' } : o));
    updateOrdersInStorage(updated);
    showToast(`Ordine ${orderId} rifiutato`, 'danger');
  };

  const filteredOrders = (colKey: OrderStatus) => {
    return orders
      .filter((o) => {
        const orderStatus = o.status;
        if (colKey === 'pending') return orderStatus === 'new' || orderStatus === 'pending';
        if (colKey === 'accepted') return orderStatus === 'accepted' || orderStatus === 'preparing' || orderStatus === 'delivering';
        if (colKey === 'completed') return orderStatus === 'completed' || orderStatus === 'delivered';
        return false;
      })
      .map(mapFlatOrder)
      .filter((order) => {
        const matchesSearch =
          order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = orderTypeFilter === 'all' || order.type === orderTypeFilter;
        return matchesSearch && matchesType;
      });
  };

  const handlePrintSingleOrder = (orderId: string) => {
    const rawOrder = orders.find((o) => o.id === orderId);
    if (!rawOrder) return;

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
            <strong>€ ${( (item.price || item.originalPrice || 0) * item.qty ).toFixed(2)}</strong>
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
          <div style="text-align: center; font-size: 11px;">ID: ${rawOrder.id.replace('ord-', '').toUpperCase()}</div>
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
            ${rawOrder.customer?.phone ? `<div><strong>Tel:</strong> ${rawOrder.customer.phone}</div>` : ''}
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
              <strong>€ ${( (item.price || item.originalPrice || 0) * item.qty ).toFixed(2)}</strong>
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
          <div style="text-align: center; font-size: 11px;">ID: ${rawOrder.id.replace('ord-', '').toUpperCase()}</div>
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
            ${rawOrder.customer?.phone ? `<div><strong>Tel:</strong> ${rawOrder.customer.phone}</div>` : ''}
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
            className="flex items-center justify-center p-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-red-600 dark:border-slate-800 dark:hover:bg-slate-900 dark:text-slate-400 transition-colors cursor-pointer"
            title="Annulla ordine"
          >
            <X size={13} />
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

  const getOrderTypeBadge = (type: LiveOrder['type'], tableNumber?: string, isBookingPreOrder?: boolean) => {
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
              toast.type === 'success' ? 'bg-slate-900 dark:bg-slate-100 dark:text-slate-900' : 'bg-red-600'
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
            <p className="text-xs text-muted-foreground mt-0.5">Gestione ordinazioni in tempo reale</p>
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
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                soundEnabled ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-200 dark:bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white dark:bg-slate-900 transition-transform duration-200 ${
                  soundEnabled ? 'translate-x-[14px]' : 'translate-x-[2px]'
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
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => {
          const colOrders = filteredOrders(col.key);
          return (
            <div key={`col-${col.key}`} className={`flex flex-col gap-2.5 border rounded-lg p-3 ${col.bgClass}`}>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-850 pb-2 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 dark:text-slate-400">{col.icon}</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{col.label}</span>
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
                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all flex flex-col gap-2 cursor-pointer hover:scale-[1.01] duration-150 group"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-900 pb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">
                          #{order.id.replace('ord-', '').toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-slate-50 transition-colors truncate">
                          {order.customer}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintSingleOrder(order.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
                          title="Stampa comanda"
                        >
                          <Printer size={12} />
                        </button>
                        {getOrderTypeBadge(order.type, order.tableNumber, order.isBookingPreOrder)}
                      </div>
                    </div>

                    <div className="py-0.5">
                      <ul className="space-y-1">
                        {order.items.map((item, idx) => (
                          <li
                            key={`${order.id}-item-${idx}`}
                            className="text-xs text-slate-600 dark:text-slate-400 flex justify-between"
                          >
                            <span className="truncate">{item.name}</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-200 ml-2">
                              ×{item.qty}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {order.isBookingPreOrder && (
                      <div className="bg-purple-500/5 border border-purple-200/30 rounded px-2 py-1 flex items-center gap-1.5 text-[10px] text-purple-700 dark:text-purple-300 font-semibold mt-0.5">
                        <Calendar size={10} />
                        <span>Pre-ordine tavolo</span>
                      </div>
                    )}

                    {order.type === 'table' && !order.isBookingPreOrder && order.tableNumber && (
                      <div className="bg-blue-500/5 border border-blue-200/30 rounded px-2 py-1 flex items-center gap-1.5 text-[10px] text-blue-700 dark:text-blue-300 font-semibold mt-0.5">
                        <Utensils size={10} />
                        <span>Servire al Tavolo {order.tableNumber}</span>
                      </div>
                    )}

                    {order.address && (
                      <div className="flex items-start gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded border border-slate-100 dark:border-slate-900">
                        <MapPin size={10} className="mt-0.5 flex-shrink-0 text-slate-400" />
                        <span className="line-clamp-1">{order.address}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-900 mt-1">
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                        {col.key === 'accepted' ? (
                          renderKitchenTimer(order.timestamp)
                        ) : (
                          <>
                            <Clock size={10} />
                            <span className="tabular-nums">{order.minutesAgo}m fa</span>
                          </>
                        )}
                      </div>
                      <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
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
                      #{selectedOrder.id.replace('ord-', '').toUpperCase()}
                    </span>
                    {selectedOrder.status === 'new' || selectedOrder.status === 'pending' ? (
                      <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/20">Da Accettare</span>
                    ) : selectedOrder.status === 'accepted' || selectedOrder.status === 'preparing' || selectedOrder.status === 'delivering' ? (
                      <span className="bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/20">In Corso</span>
                    ) : selectedOrder.status === 'completed' || selectedOrder.status === 'delivered' ? (
                      <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20">Completato</span>
                    ) : (
                      <span className="bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-500/20">Rifiutato</span>
                    )}
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {selectedOrder.customerName || selectedOrder.customer?.name || 'Dettaglio Ordine'}
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
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider mb-1">Tipo Canale</span>
                    <div className="flex items-center gap-1.5">
                      {selectedOrder.type === 'domicilio' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <Bike size={13} className="text-slate-500" /> Domicilio
                        </span>
                      ) : selectedOrder.type === 'asporto' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <ShoppingBag size={13} className="text-slate-500" /> Asporto
                        </span>
                      ) : selectedOrder.type === 'prenotazione_tavolo' || selectedOrder.id.startsWith('PRE-') ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-400">
                          <Calendar size={13} className="text-purple-500" /> Prenotazione
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                          <Utensils size={13} className="text-blue-500" /> Tavolo {selectedOrder.tableNumber || ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider mb-1">Ricevuto Il</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block tabular-nums">
                      {new Date(selectedOrder.timestamp || selectedOrder.createdAt).toLocaleString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  
                  {selectedOrder.deliveryTime && (
                    <div className="col-span-2 border-t border-slate-100 dark:border-slate-900/60 pt-2 mt-1">
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider mb-0.5">Orario Consegna/Ritiro</span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        {selectedOrder.deliveryTime === 'asap' ? 'IL PRIMA POSSIBILE (ASAP)' : `ALLE ${selectedOrder.deliveryTime}`}
                        {selectedOrder.deliveryDate && ` del ${new Date(selectedOrder.deliveryDate).toLocaleDateString('it-IT')}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Informazioni Cliente */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Dettaglio Cliente</h3>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <User size={13} />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-none mb-0.5">Nominativo</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {selectedOrder.customerName || selectedOrder.customer?.name || 'Cliente'}
                        </span>
                      </div>
                    </div>
                    
                    {selectedOrder.customer?.phone && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400">
                          <Phone size={13} />
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-none mb-0.5">Telefono</span>
                          <a 
                            href={`tel:${selectedOrder.customer.phone}`} 
                            className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400 block"
                          >
                            {selectedOrder.customer.phone}
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {selectedOrder.customer?.email && selectedOrder.customer.email !== 'mock@example.com' && selectedOrder.customer.email !== 'prenotazione@internal.it' && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400">
                          <Mail size={13} />
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-none mb-0.5">Email</span>
                          <a 
                            href={`mailto:${selectedOrder.customer.email}`} 
                            className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline block truncate max-w-[280px]"
                          >
                            {selectedOrder.customer.email}
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedOrder.type === 'domicilio' && (selectedOrder.address || selectedOrder.customer?.address) && (
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400 mt-0.5">
                          <MapPin size={13} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-none mb-0.5">Indirizzo Consegna</span>
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
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 block mb-0.5">Note dalla Cucina</span>
                      <p className="text-xs text-amber-900 dark:text-amber-300 italic leading-tight">
                        &quot;{selectedOrder.notes}&quot;
                      </p>
                    </div>
                  </div>
                )}

                {/* Dettagli Piatti / Carrello */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Riepilogo Piatti</h3>
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
                          <div key={idx} className="p-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/35 transition-colors">
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
                                € {( (item.price || item.originalPrice || 0) * item.qty ).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Totali */}
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-3 border-t border-slate-100 dark:border-slate-900 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">TOTALE COMPLESSIVO</span>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                        € {(selectedOrder.total || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visual Mockup Thermal Receipt Comanda */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-sans font-bold">Scontrino Comanda</h3>
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
                      <div className="text-xs font-bold tracking-widest uppercase">{user?.restaurantName || 'iGOdelivering'}</div>
                      <div className="text-[9px] uppercase font-bold text-slate-600">COMANDA CUCINA</div>
                      <div className="text-[8px] text-slate-500">ID: {selectedOrder.id.replace('ord-', '').toUpperCase()}</div>
                      <div className="text-[8px] text-slate-500">{new Date(selectedOrder.timestamp || selectedOrder.createdAt).toLocaleString('it-IT')}</div>
                    </div>
                    
                    <div className="border-t border-dashed border-black/35 my-2" />
                    
                    <div className="text-center font-bold text-[11px] tracking-wide py-0.5 border-y border-dashed border-black/35 my-1.5">
                      {selectedOrder.type === 'domicilio'
                        ? 'CONSEGNA A DOMICILIO'
                        : selectedOrder.type === 'asporto'
                          ? 'ASPORTO (RITIRO)'
                          : selectedOrder.type === 'prenotazione_tavolo' || selectedOrder.id.startsWith('PRE-')
                            ? 'PRENOTAZIONE TAVOLO'
                            : `AL TAVOLO ${selectedOrder.tableNumber || ''}`}
                    </div>

                    {selectedOrder.deliveryTime && (
                      <div className="text-center font-bold text-[10px] bg-black/5 p-1 rounded my-1.5 border border-black/10">
                        ORARIO: {selectedOrder.deliveryTime === 'asap' ? 'IL PRIMA POSSIBILE' : `ALLE ${selectedOrder.deliveryTime}`}
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
                              <span>{item.qty}x {item.name}</span>
                              <span>€ {( (item.price || item.originalPrice || 0) * item.qty ).toFixed(2)}</span>
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
                      <div><strong>Cliente:</strong> {selectedOrder.customerName || selectedOrder.customer?.name || 'Cliente'}</div>
                      {selectedOrder.customer?.phone && <div><strong>Tel:</strong> {selectedOrder.customer.phone}</div>}
                      {selectedOrder.type === 'domicilio' && (selectedOrder.address || selectedOrder.customer?.address) && (
                        <div className="leading-tight"><strong>Indirizzo:</strong> {selectedOrder.address || selectedOrder.customer?.address}</div>
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

                {selectedOrder.status === 'new' || selectedOrder.status === 'pending' ? (
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
                ) : selectedOrder.status === 'accepted' || selectedOrder.status === 'preparing' || selectedOrder.status === 'delivering' ? (
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
