'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Clock, MapPin, Package, ChevronRight, Receipt, Bike, ShoppingBag } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrderItem {
  name: string;
  qty: number;
  price: number;
  options?: string;
}

interface OrderData {
  orderNumber: string;
  type: 'delivery' | 'pickup';
  estimatedMinutes: number;
  address?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
  restaurantName: string;
  placedAt: string;
}

// ─── Mock order (replace with real data from router state / API) ──────────────

const MOCK_ORDER: OrderData = {
  orderNumber: 'ORD-20260508-4821',
  type: 'delivery',
  estimatedMinutes: 35,
  address: 'Via Roma 42, Milano',
  restaurantName: 'Pizzeria Bella Napoli',
  placedAt: '13:28',
  paymentMethod: 'Carta di credito •••• 4242',
  items: [
    { name: 'Pizza Margherita', qty: 2, price: 9.50 },
    { name: 'Pizza Diavola', qty: 1, price: 11.00, options: 'Extra piccante' },
    { name: 'Tiramisù', qty: 2, price: 6.50 },
    { name: 'Acqua Naturale 75cl', qty: 2, price: 2.50 },
  ],
  subtotal: 47.50,
  deliveryFee: 2.50,
  discount: 0,
  total: 50.00,
};

const REDIRECT_SECONDS = 8;

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrderSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const order: OrderData = MOCK_ORDER;
  const trackingUrl = `/ordine/tracking?id=${order.orderNumber}`;

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          router.push(trackingUrl);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [router, trackingUrl]);

  const handleGoNow = () => {
    clearInterval(intervalRef.current!);
    router.push(trackingUrl);
  };

  const estimatedArrival = (() => {
    const [h, m] = order.placedAt.split(':').map(Number);
    const total = h * 60 + m + order.estimatedMinutes;
    const hh = Math.floor(total / 60) % 24;
    const mm = total % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  })();

  const progress = ((REDIRECT_SECONDS - countdown) / REDIRECT_SECONDS) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start py-10 px-4">
      {/* Logo */}
      <div className="mb-8">
        <AppLogo className="h-8" />
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-sm overflow-hidden">

        {/* ── Success Header ── */}
        <div className="bg-[var(--success-bg)] border-b border-[#bbf7d0] px-6 py-8 flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-[var(--success)] flex items-center justify-center shadow-md">
            <CheckCircle size={34} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
              Ordine confermato!
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {order.restaurantName} ha ricevuto il tuo ordine
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 bg-white border border-[#bbf7d0] text-[var(--success)] text-xs font-semibold px-3 py-1 rounded-full">
            <Receipt size={12} />
            {order.orderNumber}
          </span>
        </div>

        {/* ── Estimated Time ── */}
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
              {order.type === 'delivery' ? (
                <Bike size={22} className="text-primary" />
              ) : (
                <ShoppingBag size={22} className="text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
                {order.type === 'delivery' ? 'Consegna stimata' : 'Ritiro stimato'}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground tabular-nums">
                  {order.estimatedMinutes} min
                </span>
                <span className="text-sm text-muted-foreground">
                  · entro le {estimatedArrival}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded-lg px-2.5 py-1.5 border border-border">
              <Clock size={12} />
              <span>Ore {order.placedAt}</span>
            </div>
          </div>

          {order.type === 'delivery' && order.address && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2 border border-border">
              <MapPin size={14} className="text-primary flex-shrink-0" />
              <span className="truncate">{order.address}</span>
            </div>
          )}
        </div>

        {/* ── Receipt Accordion ── */}
        <div className="border-b border-border">
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
            <div className="px-6 pb-5">
              {/* Items */}
              <ul className="space-y-2 mb-4">
                {order.items.map((item, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 text-sm">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-muted border border-border text-xs font-bold text-muted-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
                        {item.qty}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{item.name}</p>
                        {item.options && (
                          <p className="text-xs text-muted-foreground">{item.options}</p>
                        )}
                      </div>
                    </div>
                    <span className="font-medium text-foreground tabular-nums flex-shrink-0">
                      €{(item.price * item.qty).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Totals */}
              <div className="border-t border-border pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotale</span>
                  <span className="tabular-nums">€{order.subtotal.toFixed(2)}</span>
                </div>
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Consegna</span>
                    <span className="tabular-nums">€{order.deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between text-[var(--success)]">
                    <span>Sconto</span>
                    <span className="tabular-nums">−€{order.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-foreground text-base pt-1 border-t border-border">
                  <span>Totale</span>
                  <span className="tabular-nums">€{order.total.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Pagato con {order.paymentMethod}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Auto-redirect CTA ── */}
        <div className="px-6 py-5">
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          <button
            onClick={handleGoNow}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 active:scale-[0.98] text-white font-semibold text-sm py-3.5 rounded-xl transition-all duration-150 shadow-sm"
          >
            <MapPin size={16} />
            Segui il tuo ordine
            <ChevronRight size={16} />
          </button>

          <p className="text-center text-xs text-muted-foreground mt-3">
            Reindirizzamento automatico al tracking tra{' '}
            <span className="font-semibold text-foreground tabular-nums">{countdown}s</span>
          </p>
        </div>
      </div>

      {/* Footer note */}
      <p className="mt-6 text-xs text-muted-foreground text-center max-w-sm">
        Riceverai una notifica quando il tuo ordine sarà in preparazione.
        Controlla la tua email per la ricevuta completa.
      </p>
    </div>
  );
}
