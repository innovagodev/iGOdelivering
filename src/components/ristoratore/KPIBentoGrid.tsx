'use client';
import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Euro,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { computeKpis, percentChange } from '@/lib/dashboardStats';

interface KPICardProps {
  id: string;
  label: string;
  value: string;
  sub: string;
  /**
   * Variazione rispetto a ieri alla stessa ora: un numero, `null` se ieri non c'è un
   * termine di confronto (zero ordini), `undefined` se la carta non ha confronti.
   */
  trend?: number | null;
  /** Testo quando c'è la variazione (di norma il confronto). */
  trendSub?: string;
  icon: React.ReactNode;
  variant: 'default' | 'alert' | 'success' | 'warning';
  hero?: boolean;
}

function KPICard({ label, value, sub, trend, trendSub, icon, variant, hero }: KPICardProps) {
  const variantMap = {
    default: 'bg-card border-border',
    alert: 'bg-[var(--danger-bg)] border-red-200',
    success: 'bg-[var(--success-bg)] border-green-200',
    warning: 'bg-[var(--warning-bg)] border-amber-200',
  };
  const hasTrend = typeof trend === 'number';
  const trendTone =
    !hasTrend || trend === 0
      ? 'text-muted-foreground'
      : trend > 0
        ? 'text-[var(--success)]'
        : 'text-[var(--danger)]';

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 shadow-card flex flex-col gap-3 ${variantMap[variant]} `}
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1"
            style={{ letterSpacing: '0.06em' }}
          >
            {label}
          </p>
          <p
            className={`tabular-nums font-bold leading-none ${hero ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}`}
            style={{ fontWeight: 700 }}
          >
            {value}
          </p>
        </div>
        <div
          className={`p-2.5 rounded-xl ${
            variant === 'alert'
              ? 'bg-red-100 text-[var(--danger)]'
              : variant === 'success'
                ? 'bg-green-100 text-[var(--success)]'
                : variant === 'warning'
                  ? 'bg-amber-100 text-[var(--warning)]'
                  : 'bg-muted text-muted-foreground'
          }`}
        >
          {variant === 'alert' ? <AlertTriangle size={20} /> : icon}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {hasTrend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendTone}`}>
            {trend > 0 ? <TrendingUp size={13} /> : trend < 0 ? <TrendingDown size={13} /> : null}
            {trend > 0 ? '+' : ''}
            {trend.toLocaleString('it-IT')}%
          </span>
        )}
        <span className="text-xs text-muted-foreground">{hasTrend ? (trendSub ?? sub) : sub}</span>
      </div>
    </div>
  );
}

export default function KPIBentoGrid({
  orders = [],
  loading = false,
}: {
  orders?: any[];
  loading?: boolean;
}) {
  const kpiData = React.useMemo(() => computeKpis(orders), [orders]);
  const { today, yesterdaySoFar, pending } = kpiData;

  const eur = (n: number) =>
    `€ ${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const kpis: KPICardProps[] = [
    {
      id: 'kpi-ricavi',
      label: 'Ricavi Oggi',
      value: eur(today.revenue),
      sub: 'nessun incasso ieri alla stessa ora',
      trend: percentChange(today.revenue, yesterdaySoFar.revenue),
      trendSub: 'rispetto a ieri alla stessa ora',
      icon: <Euro size={20} />,
      variant: 'success',
      hero: true,
    },
    {
      id: 'kpi-ordini',
      label: 'Ordini Oggi',
      value: today.count.toString(),
      sub: 'nessun ordine ieri alla stessa ora',
      trend: percentChange(today.count, yesterdaySoFar.count),
      trendSub: 'rispetto a ieri alla stessa ora',
      icon: <ShoppingBag size={20} />,
      variant: 'default',
    },
    {
      id: 'kpi-attesa',
      label: 'In Attesa',
      value: pending.toString(),
      sub: 'richiedono conferma',
      icon: <Clock size={20} />,
      variant: pending > 0 ? 'alert' : 'default',
    },
    {
      id: 'kpi-valore',
      label: 'Valore Medio',
      value: eur(today.average),
      sub: 'nessun ordine ieri alla stessa ora',
      trend: percentChange(today.average, yesterdaySoFar.average),
      trendSub: 'rispetto a ieri alla stessa ora',
      icon: <TrendingUp size={20} />,
      variant: 'default',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <KPICard key={kpi.id} {...kpi} />
      ))}
    </div>
  );
}
