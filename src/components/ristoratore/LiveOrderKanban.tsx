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
  address?: string;
  tableNumber?: string;
}

const initialOrders: Record<OrderStatus, LiveOrder[]> = {
  pending: [
    {
      id: 'ord-p001',
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
      id: 'ord-p002',
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
      id: 'ord-p003',
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
      id: 'ord-c001',
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
      id: 'ord-c002',
      customer: 'Davide Ricci',
      items: [{ name: 'Antipasto misto', qty: 2 }],
      total: 18.5,
      type: 'takeaway',
      minutesAgo: 12,
    },
  ],
  completed: [
    {
      id: 'ord-d001',
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
      id: 'ord-d002',
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
      address: o.customer && o.customer.address ? o.customer.address : o.address,
      tableNumber: o.tableNumber,
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
    // For Kanban simulation, rejecting removes it from the active Kanban list
    const updated = orders.filter((o) => o.id !== orderId);
    updateOrdersInStorage(updated);
    showToast(`Ordine ${orderId} rimosso`, 'danger');
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

  const renderActions = (colKey: OrderStatus, order: LiveOrder) => {
    if (colKey === 'pending') {
      return (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => rejectOrder('pending', order.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:hover:bg-slate-900 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <X size={12} />
            Rifiuta
          </button>
          <button
            onClick={() => acceptOrder(order.id)}
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
            onClick={() => rejectOrder('accepted', order.id)}
            className="flex items-center justify-center p-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-red-600 dark:border-slate-800 dark:hover:bg-slate-900 dark:text-slate-400 transition-colors cursor-pointer"
            title="Annulla ordine"
          >
            <X size={13} />
          </button>
          <button
            onClick={() => completeOrder(order.id)}
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
            onClick={() => rejectOrder('completed', order.id)}
            className="text-[10px] text-muted-foreground hover:text-red-500 font-medium transition-colors cursor-pointer"
          >
            Rimuovi dalla vista
          </button>
        </div>
      );
    }

    return null;
  };

  const getOrderTypeBadge = (type: LiveOrder['type'], tableNumber?: string) => {
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
                <span className="bg-slate-200/75 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {colOrders.length}
                </span>
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
                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-900 pb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">
                          #{order.id.replace('ord-', '').toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-foreground truncate">
                          {order.customer}
                        </span>
                      </div>
                      {getOrderTypeBadge(order.type, order.tableNumber)}
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

                    {order.type === 'table' && order.tableNumber && (
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
                        <Clock size={10} />
                        <span className="tabular-nums">{order.minutesAgo}m fa</span>
                      </div>
                      <span className="text-xs font-bold tabular-nums text-foreground">
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
    </div>
  );
}
