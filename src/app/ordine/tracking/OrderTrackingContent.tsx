'use client';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle,
  Clock,
  ChefHat,
  Bike,
  Home,
  MapPin,
  Phone,
  MessageCircle,
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
    icon: <CheckCircle size={18} />,
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
    description: 'Il tuo ordine è pronto per la consegna',
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
    description: 'Buon appetito! 🎉',
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrderTrackingContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id') ?? 'ORD-20260508-4821';

  const [currentStatus, setCurrentStatus] = useState<TrackingStatus>('confirmed');
  const [estimatedMinutes, setEstimatedMinutes] = useState(35);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setCurrentStatus('preparing'), 4000));
    timers.push(
      setTimeout(() => {
        setCurrentStatus('ready');
        setEstimatedMinutes(10);
      }, 10000)
    );
    timers.push(setTimeout(() => setCurrentStatus('delivering'), 16000));
    timers.push(
      setTimeout(() => {
        setCurrentStatus('delivered');
        setEstimatedMinutes(0);
      }, 24000)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const isDelivered = currentStatus === 'delivered';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start py-10 px-4">
      {/* Logo */}
      <div className="mb-8">
        <AppLogo className="h-8" />
      </div>

      <div className="w-full max-w-lg space-y-4">
        {/* ── Header Card ── */}
        <div className="bg-card rounded-2xl border border-border shadow-sm px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                Ordine
              </p>
              <h1 className="text-base font-bold text-foreground">{orderId}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Pizzeria Bella Napoli</p>
            </div>
            {!isDelivered && (
              <div className="flex-shrink-0 text-right">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                  Arrivo stimato
                </p>
                <p className="text-2xl font-bold text-primary tabular-nums">
                  {estimatedMinutes} min
                </p>
              </div>
            )}
            {isDelivered && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--success-bg)] flex items-center justify-center">
                <CheckCircle size={22} className="text-[var(--success)]" />
              </div>
            )}
          </div>

          {/* Address */}
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2 border border-border">
            <MapPin size={14} className="text-primary flex-shrink-0" />
            <span className="truncate">Via Roma 42, Milano</span>
          </div>
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
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                        isDone
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
                        className={`w-0.5 flex-1 my-1 min-h-[24px] transition-all duration-700 ${
                          isDone ? 'bg-[var(--success)]' : 'bg-border'
                        }`}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`pb-5 flex-1 min-w-0 ${isLast ? 'pb-0' : ''}`}>
                    <p
                      className={`text-sm font-semibold leading-tight ${
                        isPending ? 'text-muted-foreground' : 'text-foreground'
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

        {/* ── Support ── */}
        <div className="bg-card rounded-2xl border border-border shadow-sm px-6 py-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">
            Assistenza
          </p>
          <div className="flex gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-foreground bg-muted hover:bg-border rounded-xl py-2.5 border border-border transition-colors">
              <Phone size={15} className="text-primary" />
              Chiama
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-foreground bg-muted hover:bg-border rounded-xl py-2.5 border border-border transition-colors">
              <MessageCircle size={15} className="text-primary" />
              Chat
            </button>
          </div>
        </div>

        {/* ── Back link ── */}
        <div className="text-center pt-2">
          <Link
            href="/ristoratore/dashboard"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Torna alla dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
