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
  AlertCircle,
} from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import Link from 'next/link';

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
  // UUID dell'ordine. Non `order_number`: quello è corto e sequenziale per
  // ristorante, quindi enumerabile da chiunque. Resta mostrato a schermo come
  // riferimento leggibile, ma non è più la chiave di lookup.
  const orderId = searchParams.get('id') ?? '';

  const [currentStatus, setCurrentStatus] = useState<TrackingStatus>('confirmed');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [orderType, setOrderType] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<'not_found' | 'fetch_failed' | null>(null);
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

  // Fetch initial order data.
  //
  // Passa da /api/order-status/[orderId], che gira lato server con la service
  // role key. Una query diretta su `orders` con la chiave anon non funziona: il
  // cliente non ha alcuna policy di lettura, quindi RLS filtra la riga e la
  // query torna `data: null` con `error: null` — la pagina restava vuota senza
  // alcun segnale.
  useEffect(() => {
    if (!orderId) {
      setLoadError('not_found');
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/order-status/${encodeURIComponent(orderId)}`, {
          cache: 'no-store',
        });

        if (cancelled) return;

        if (!res.ok) {
          // 400 = id non è un UUID (tipicamente un vecchio link che portava
          // ancora `order_number`), 404 = ordine inesistente. Per il cliente
          // sono lo stesso caso: il link non porta a un ordine valido.
          const notFound = res.status === 404 || res.status === 400;
          setLoadError(notFound ? 'not_found' : 'fetch_failed');
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        setLoadError(null);
        setCurrentStatus(dbStatusToTracking(data.status));
        setOrderNumber(data.orderNumber || '');
        setOrderType(data.orderType || '');
        setAddress(data.address || '');
        setSubtotal(data.subtotal || 0);
        setDeliveryFee(data.deliveryFee || 0);
        setDiscount(data.discount || 0);
        setTotal(data.total || 0);
        setItems(data.items || []);
        if (data.restaurant?.name) setRestaurantName(data.restaurant.name);

        // Estimated minutes based on type
        const mins =
          data.orderType === 'domicilio' ? 35 : data.orderType === 'asporto' ? 20 : 15;
        setEstimatedMinutes(mins);
        setIsLoading(false);
      } catch (e) {
        if (cancelled) return;
        console.error('[tracking] fetch error:', e);
        setLoadError('fetch_failed');
        setIsLoading(false);
      }
    };

    fetchOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // Poll the same server-side endpoint for status updates.
  //
  // Sostituisce la subscription Realtime su `orders`: anche i postgres_changes
  // passano da RLS, quindi con la chiave anon il canale si sottoscrive ma non
  // consegna mai un evento. È lo stesso polling già usato dal tracker in-pagina
  // dopo il checkout.
  useEffect(() => {
    if (!orderId || loadError) return;
    if (currentStatus === 'delivered') return;

    const POLL_MS = 15000;

    const poll = async () => {
      try {
        const res = await fetch(`/api/order-status/${encodeURIComponent(orderId)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;

        const data = await res.json();
        if (!data?.status) return;

        const trackingStatus = dbStatusToTracking(data.status);
        if (trackingStatus === currentStatus) return;

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
      } catch (e) {
        console.error('[tracking] poll error:', e);
      }
    };

    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [orderId, loadError, currentStatus]);

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

  // ── Errore: ordine non trovato o endpoint irraggiungibile ──
  // Prima questo caso era silenzioso (return anticipato senza stato d'errore) e
  // la pagina restava sullo scheletro vuoto, con il primo step acceso come se
  // l'ordine fosse stato confermato.
  if (!isLoading && loadError) {
    const isNotFound = loadError === 'not_found';

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center py-10 px-4">
        <AppLogo className="h-8 mb-8" />
        <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-sm px-6 py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} className="text-muted-foreground" />
          </div>
          <h1 className="text-lg font-bold text-foreground mb-2">
            {isNotFound ? 'Ordine non trovato' : 'Impossibile caricare l’ordine'}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {isNotFound
              ? 'Il link di tracking non è valido o l’ordine non esiste più. Controlla di aver aperto il link completo ricevuto via email.'
              : 'C’è stato un problema nel recupero dei dati. Controlla la connessione e riprova.'}
          </p>
          <div className="flex gap-3">
            {!isNotFound && (
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
              >
                Riprova
              </button>
            )}
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-foreground bg-muted hover:bg-border rounded-xl py-3 border border-border transition-colors"
            >
              Torna alla home
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
                <h1 className="text-base font-bold text-foreground">{orderNumber || '—'}</h1>
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
