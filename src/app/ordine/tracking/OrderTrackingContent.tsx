'use client';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Check,
  Clock,
  ChefHat,
  Bike,
  Home,
  MapPin,
  Phone,
  MessageCircle,
  ShoppingBag,
  Utensils,
  ChevronRight,
  Package,
} from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

type TrackingStatus = 'confirmed' | 'preparing' | 'ready' | 'delivering' | 'delivered';

interface TrackingStep {
  id: TrackingStatus;
  label: string;
  description: string;
  icon: React.ReactNode;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS: TrackingStep[] = [
  {
    id: 'confirmed',
    label: 'Confermato',
    description: 'Il ristorante ha ricevuto il tuo ordine',
    icon: <Check size={18} />,
  },
  {
    id: 'preparing',
    label: 'In preparazione',
    description: 'I tuoi piatti sono in cucina',
    icon: <ChefHat size={18} />,
  },
  {
    id: 'ready',
    label: 'Pronto',
    description: 'Il tuo ordine è pronto',
    icon: <Clock size={18} />,
  },
  {
    id: 'delivering',
    label: 'In consegna',
    description: 'Il corriere è in viaggio verso di te',
    icon: <Bike size={18} />,
  },
  {
    id: 'delivered',
    label: 'Consegnato',
    description: 'Buon appetito!',
    icon: <Home size={18} />,
  },
];

const STATUS_ORDER: TrackingStatus[] = [
  'confirmed',
  'preparing',
  'ready',
  'delivering',
  'delivered',
];

// Map DB status → TrackingStatus
const dbStatusToTracking = (dbStatus: string): TrackingStatus => {
  switch (dbStatus) {
    case 'new':
    case 'pending':
      return 'confirmed';
    case 'accepted':
    case 'preparing':
      return 'preparing';
    case 'ready':
      return 'ready';
    case 'delivering':
      return 'delivering';
    case 'delivered':
    case 'completed':
      return 'delivered';
    default:
      return 'confirmed';
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrderTrackingContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id') ?? '';

  const [currentStatus, setCurrentStatus] = useState<TrackingStatus>('confirmed');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [orderType, setOrderType] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [dbOrderId, setDbOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Request browser notification permissions on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Fetch initial order data from Supabase
  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, status, type, customer_address, scheduled_at, restaurant_id,
          subtotal, delivery_fee, discount, total,
          order_items ( name, price, qty, note ),
          restaurants ( name )
        `)
        .eq('order_number', orderId)
        .maybeSingle();

      if (error || !data) {
        setIsLoading(false);
        return;
      }

      setDbOrderId(data.id);
      setCurrentStatus(dbStatusToTracking(data.status));
      setOrderType(data.type || '');
      setAddress(data.customer_address || '');
      setSubtotal(parseFloat(data.subtotal) || 0);
      setDeliveryFee(parseFloat(data.delivery_fee) || 0);
      setDiscount(parseFloat(data.discount) || 0);
      setTotal(parseFloat(data.total) || 0);
      setItems((data as any).order_items || []);

      // Try to get restaurant name
      const restData = data.restaurants as any;
      if (restData?.name) setRestaurantName(restData.name);

      // Estimated minutes based on type
      const mins =
        data.type === 'domicilio' ? 35 : data.type === 'asporto' ? 20 : 15;
      setEstimatedMinutes(mins);
      setIsLoading(false);
    };

    fetchOrder();
  }, [orderId]);

  // Subscribe to Supabase Realtime for status updates
  useEffect(() => {
    if (!dbOrderId) return;

    const channel = supabase
      .channel(`order-tracking-${dbOrderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${dbOrderId}`,
        },
        (payload) => {
          const newStatus = payload.new?.status;
          if (newStatus) {
            const trackingStatus = dbStatusToTracking(newStatus);
            setCurrentStatus(trackingStatus);

            // Update estimated minutes as order progresses
            if (trackingStatus === 'preparing') setEstimatedMinutes(20);
            else if (trackingStatus === 'ready') setEstimatedMinutes(10);
            else if (trackingStatus === 'delivering') setEstimatedMinutes(5);
            else if (trackingStatus === 'delivered') setEstimatedMinutes(0);

            // Browser notification
            if (
              typeof window !== 'undefined' &&
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              const step = STEPS.find((s) => s.id === trackingStatus);
              if (step) {
                new Notification(`Stato Ordine: ${step.label}`, {
                  body: step.description,
                  icon: '/favicon.ico',
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dbOrderId]);

  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const isDelivered = currentStatus === 'delivered';

  const typeLabel =
    orderType === 'domicilio'
      ? 'Consegna a domicilio'
      : orderType === 'asporto'
        ? 'Asporto'
        : 'Al tavolo';

  const TypeIcon =
    orderType === 'domicilio'
      ? Bike
      : orderType === 'asporto'
        ? ShoppingBag
        : Utensils;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start py-10 px-4">
      {/* Logo */}
      <div className="mb-8">
        <AppLogo className="h-8" />
      </div>

      <div className="w-full max-w-lg space-y-4">
        {/* ── Header Card ── */}
        <div className="bg-card rounded-2xl border border-border shadow-sm px-6 py-5">
          {isLoading ? (
            <div className="flex items-center gap-3 animate-pulse">
              <div className="w-24 h-4 bg-muted rounded" />
              <div className="w-32 h-4 bg-muted rounded" />
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                  Ordine
                </p>
                <h1 className="text-base font-bold text-foreground">{orderId || '—'}</h1>
                {restaurantName && (
                  <p className="text-sm text-muted-foreground mt-0.5">{restaurantName}</p>
                )}
                <span className="inline-flex items-center gap-1 mt-1 text-xs text-muted-foreground bg-muted rounded px-2 py-0.5">
                  <TypeIcon size={11} />
                  {typeLabel}
                </span>
              </div>
              {!isDelivered && estimatedMinutes !== null && estimatedMinutes > 0 && (
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                    Stima residua
                  </p>
                  <p className="text-2xl font-bold text-primary tabular-nums">
                    {estimatedMinutes} min
                  </p>
                </div>
              )}
              {isDelivered && (
                <div className="flex-shrink-0 flex items-center justify-center">
                  <Check size={24} className="text-[var(--success)]" />
                </div>
              )}
            </div>
          )}

          {/* Address */}
          {address && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2 border border-border">
              <MapPin size={14} className="text-primary flex-shrink-0" />
              <span className="truncate">{address}</span>
            </div>
          )}
        </div>

        {/* ── Tracking Steps ── */}
        <div className="bg-card rounded-2xl border border-border shadow-sm px-6 py-5">
          <h2 className="text-sm font-semibold text-foreground mb-5">Stato ordine</h2>
          <div className="space-y-0">
            {STEPS.map((step, idx) => {
              const isDone = idx < currentIdx;
              const isActive = idx === currentIdx;
              const isPending = idx > currentIdx;
              const isLast = idx === STEPS.length - 1;

              return (
                <div key={step.id} className="flex gap-4">
                  {/* Connector column */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${isDone
                        ? 'bg-[var(--success)] text-white'
                        : isActive
                          ? 'bg-primary text-white shadow-md ring-4 ring-primary/20'
                          : 'bg-muted text-muted-foreground border border-border'
                        }`}
                    >
                      {step.icon}
                    </div>
                    {!isLast && (
                      <div
                        className={`w-0.5 flex-1 my-1 min-h-[24px] transition-all duration-700 ${isDone ? 'bg-[var(--success)]' : 'bg-border'
                          }`}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`pb-5 flex-1 min-w-0 ${isLast ? 'pb-0' : ''}`}>
                    <p
                      className={`text-sm font-semibold leading-tight ${isPending ? 'text-muted-foreground' : 'text-foreground'
                        }`}
                    >
                      {step.label}
                    </p>
                    <p
                      className={`text-xs mt-0.5 ${isPending ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}
                    >
                      {step.description}
                    </p>
                    {isActive && !isDelivered && (
                      <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-primary bg-secondary px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        In corso
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Receipt Accordion ── */}
        {!isLoading && items.length > 0 && (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <button
              onClick={() => setReceiptOpen((o) => !o)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Package size={16} className="text-primary" />
                Riepilogo ordine
              </div>
              <ChevronRight
                size={16}
                className={`text-muted-foreground transition-transform duration-200 ${receiptOpen ? 'rotate-90' : ''}`}
              />
            </button>

            {receiptOpen && (
              <div className="px-6 pb-5 border-t border-border pt-4">
                {/* Items */}
                <ul className="space-y-2 mb-4">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 text-sm">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-muted border border-border text-xs font-bold text-muted-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
                          {item.qty}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{item.name}</p>
                          {item.note && (
                            <p className="text-xs text-muted-foreground">{item.note}</p>
                          )}
                        </div>
                      </div>
                      <span className="font-medium text-foreground tabular-nums flex-shrink-0">
                        €{(parseFloat(item.price) * item.qty).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Totals */}
                <div className="border-t border-border pt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotale</span>
                    <span className="tabular-nums">€{subtotal.toFixed(2)}</span>
                  </div>
                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Consegna</span>
                      <span className="tabular-nums">€{deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-[var(--success)]">
                      <span>Sconto</span>
                      <span className="tabular-nums">−€{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-foreground text-base pt-1 border-t border-border">
                    <span>Totale</span>
                    <span className="tabular-nums">€{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Support ── */}
        <div className="bg-card rounded-2xl border border-border shadow-sm px-6 py-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">
            Assistenza
          </p>
          <div className="flex gap-3">
            <a
              href="tel:+39"
              className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-foreground bg-muted hover:bg-border rounded-xl py-2.5 border border-border transition-colors"
            >
              <Phone size={15} className="text-primary" />
              Chiama
            </a>
            <button className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-foreground bg-muted hover:bg-border rounded-xl py-2.5 border border-border transition-colors">
              <MessageCircle size={15} className="text-primary" />
              Chat
            </button>
          </div>
        </div>

        {/* ── Back link ── */}
        <div className="text-center pt-2">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Torna alla home
          </Link>
        </div>
      </div>
    </div>
  );
}
