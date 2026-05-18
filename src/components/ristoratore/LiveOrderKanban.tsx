'use client';
import React, { useState } from 'react';
import {
  Clock,
  CheckCircle,
  ChefHat,
  Bike,
  CheckCheck,
  AlertCircle,
  User,
  X,
  Check,
  UtensilsCrossed,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivering';

interface OrderItem {
  name: string;
  qty: number;
}

interface LiveOrder {
  id: string;
  customer: string;
  items: OrderItem[];
  total: number;
  type: 'delivery' | 'takeaway';
  minutesAgo: number;
  address?: string;
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
      type: 'delivery',
      minutesAgo: 6,
      address: 'Corso Buenos Aires 55',
    },
  ],
  confirmed: [
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
  preparing: [
    {
      id: 'ord-pr001',
      customer: 'Elena Galli',
      items: [
        { name: 'Lasagne al forno', qty: 2 },
        { name: 'Vino rosso', qty: 1 },
      ],
      total: 42.0,
      type: 'delivery',
      minutesAgo: 18,
      address: 'Via Montenapoleone 3',
    },
    {
      id: 'ord-pr002',
      customer: 'Roberto Esposito',
      items: [{ name: 'Risotto ai funghi', qty: 1 }],
      total: 16.0,
      type: 'takeaway',
      minutesAgo: 22,
    },
    {
      id: 'ord-pr003',
      customer: 'Valentina Russo',
      items: [
        { name: 'Pizza Quattro stagioni', qty: 2 },
        { name: 'Fritto misto', qty: 1 },
      ],
      total: 38.5,
      type: 'delivery',
      minutesAgo: 25,
      address: 'Viale Certosa 77',
    },
  ],
  delivering: [
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
      customer: 'Francesca Lombardi',
      items: [{ name: 'Branzino al forno', qty: 2 }],
      total: 44.0,
      type: 'delivery',
      minutesAgo: 38,
      address: 'Via Sarpi 9',
    },
  ],
};

const columns: { key: OrderStatus; label: string; icon: React.ReactNode; color: string }[] = [
  {
    key: 'pending',
    label: 'In Attesa',
    icon: <AlertCircle size={15} />,
    color: 'text-[var(--danger)]',
  },
  {
    key: 'confirmed',
    label: 'Confermati',
    icon: <CheckCircle size={15} />,
    color: 'text-[var(--info)]',
  },
  {
    key: 'preparing',
    label: 'In Preparazione',
    icon: <ChefHat size={15} />,
    color: 'text-[var(--warning)]',
  },
  {
    key: 'delivering',
    label: 'In Consegna',
    icon: <Bike size={15} />,
    color: 'text-[var(--success)]',
  },
];

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'danger';
}

const statusTransitions: Record<OrderStatus, OrderStatus | null> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'delivering',
  delivering: null,
};

const actionLabels: Record<OrderStatus, string> = {
  pending: 'Conferma',
  confirmed: 'Inizia Preparazione',
  preparing: 'Manda in Consegna',
  delivering: '',
};

export default function LiveOrderKanban() {
  const [orders, setOrders] = useState(initialOrders);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'danger') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const acceptOrder = (orderId: string) => {
    const order = orders.pending.find((o) => o.id === orderId);
    if (!order) return;
    setOrders((prev) => ({
      ...prev,
      pending: prev.pending.filter((o) => o.id !== orderId),
      confirmed: [...prev.confirmed, order],
    }));
    showToast(`Ordine di ${order.customer} accettato`, 'success');
  };

  const rejectOrder = (status: OrderStatus, orderId: string) => {
    const order = orders[status].find((o) => o.id === orderId);
    if (!order) return;
    setOrders((prev) => ({
      ...prev,
      [status]: prev[status].filter((o) => o.id !== orderId),
    }));
    showToast(`Ordine di ${order.customer} rifiutato`, 'danger');
  };

  const prepareOrder = (orderId: string) => {
    const order = orders.confirmed.find((o) => o.id === orderId);
    if (!order) return;
    setOrders((prev) => ({
      ...prev,
      confirmed: prev.confirmed.filter((o) => o.id !== orderId),
      preparing: [...prev.preparing, order],
    }));
    showToast(`Preparazione avviata per ${order.customer}`, 'success');
  };

  const deliverOrder = (orderId: string) => {
    const order = orders.preparing.find((o) => o.id === orderId);
    if (!order) return;
    setOrders((prev) => ({
      ...prev,
      preparing: prev.preparing.filter((o) => o.id !== orderId),
      delivering: [...prev.delivering, order],
    }));
    showToast(`Ordine di ${order.customer} in consegna`, 'success');
  };

  const renderActions = (col: (typeof columns)[number], order: LiveOrder) => {
    if (col.key === 'pending') {
      return (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => rejectOrder('pending', order.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:scale-95 transition-all duration-150"
          >
            <X size={13} />
            Rifiuta
          </button>
          <button
            onClick={() => acceptOrder(order.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 active:scale-95 transition-all duration-150"
          >
            <Check size={13} />
            Accetta
          </button>
        </div>
      );
    }

    if (col.key === 'confirmed') {
      return (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => rejectOrder('confirmed', order.id)}
            className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:scale-95 transition-all duration-150"
          >
            <X size={13} />
          </button>
          <button
            onClick={() => prepareOrder(order.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 active:scale-95 transition-all duration-150"
          >
            <UtensilsCrossed size={13} />
            Prepara
          </button>
        </div>
      );
    }

    if (col.key === 'preparing') {
      return (
        <button
          onClick={() => deliverOrder(order.id)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold bg-muted text-foreground hover:bg-border active:scale-95 transition-all duration-150"
        >
          <Bike size={13} />
          Manda in Consegna
        </button>
      );
    }

    return null;
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-5 relative">
      {/* Toast notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold text-white animate-fade-in ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">Ordini Live</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Aggiornamento in tempo reale</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-[var(--success)] font-semibold">
          <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse-soft" />
          Live
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
        {columns.map((col) => (
          <div key={`col-${col.key}`} className="flex flex-col gap-2">
            <div className={`flex items-center gap-1.5 px-1 mb-1 ${col.color}`}>
              {col.icon}
              <span className="text-xs font-semibold uppercase tracking-wide">{col.label}</span>
              <span className="ml-auto bg-muted text-muted-foreground text-[10px] font-bold rounded-full px-2 py-0.5">
                {orders[col.key].length}
              </span>
            </div>
            {orders[col.key].length === 0 && (
              <div className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                Nessun ordine
              </div>
            )}
            {orders[col.key].map((order) => (
              <div
                key={order.id}
                className={`bg-background border rounded-xl p-3.5 shadow-card hover:shadow-card-hover transition-shadow duration-200 animate-fade-in ${
                  col.key === 'pending' ? 'border-red-200 ring-1 ring-red-100' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <User size={12} className="text-muted-foreground" />
                    </div>
                    <span className="text-xs font-semibold text-foreground truncate max-w-[110px]">
                      {order.customer}
                    </span>
                  </div>
                  <Badge
                    variant={order.type === 'delivery' ? 'info' : 'neutral'}
                    className="text-[10px]"
                  >
                    {order.type === 'delivery' ? '🛵 Consegna' : '🥡 Asporto'}
                  </Badge>
                </div>
                <ul className="space-y-0.5 mb-2.5">
                  {order.items.map((item, idx) => (
                    <li
                      key={`${order.id}-item-${idx}`}
                      className="text-xs text-muted-foreground flex justify-between"
                    >
                      <span className="truncate">{item.name}</span>
                      <span className="font-medium text-foreground ml-1">×{item.qty}</span>
                    </li>
                  ))}
                </ul>
                {order.address && (
                  <p className="text-[10px] text-muted-foreground mb-2 truncate">
                    📍 {order.address}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock size={11} />
                    <span>{order.minutesAgo} min fa</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    € {order.total.toFixed(2)}
                  </span>
                </div>
                {renderActions(col, order)}
                {col.key === 'delivering' && (
                  <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-[var(--success)] font-semibold">
                    <CheckCheck size={12} />
                    In consegna al cliente
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
