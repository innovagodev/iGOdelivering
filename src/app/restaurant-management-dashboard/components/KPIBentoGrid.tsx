import React from 'react';
import { TrendingUp, TrendingDown, ShoppingBag, Euro, Clock, Truck, AlertTriangle } from 'lucide-react';

interface KPICardProps {
  id: string;
  label: string;
  value: string;
  sub: string;
  trend: number;
  icon: React.ReactNode;
  variant: 'default' | 'alert' | 'success' | 'warning';
  hero?: boolean;
}

function KPICard({ label, value, sub, trend, icon, variant, hero }: KPICardProps) {
  const variantMap = {
    default: 'bg-card border-border',
    alert: 'bg-[var(--danger-bg)] border-red-200',
    success: 'bg-[var(--success-bg)] border-green-200',
    warning: 'bg-[var(--warning-bg)] border-amber-200',
  };
  const trendPositive = trend >= 0;

  return (
    <div className={`rounded-xl border p-5 shadow-card flex flex-col gap-3 ${variantMap[variant]} ${hero ? 'lg:col-span-2' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1" style={{ letterSpacing: '0.06em' }}>{label}</p>
          <p className={`tabular-nums font-bold leading-none ${hero ? 'text-4xl' : 'text-3xl'}`} style={{ fontWeight: 700 }}>
            {value}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl ${
          variant === 'alert' ? 'bg-red-100 text-[var(--danger)]' :
          variant === 'success' ? 'bg-green-100 text-[var(--success)]' :
          variant === 'warning' ? 'bg-amber-100 text-[var(--warning)]' :
          'bg-muted text-muted-foreground'
        }`}>
          {variant === 'alert' ? <AlertTriangle size={20} /> : icon}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
          {trendPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {trendPositive ? '+' : ''}{trend}%
        </span>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </div>
    </div>
  );
}

const kpis: KPICardProps[] = [
  {
    id: 'kpi-ricavi',
    label: 'Ricavi Oggi',
    value: '€ 1.284',
    sub: 'rispetto a ieri',
    trend: 12.4,
    icon: <Euro size={20} />,
    variant: 'success',
    hero: true,
  },
  {
    id: 'kpi-ordini',
    label: 'Ordini Oggi',
    value: '47',
    sub: 'rispetto a ieri',
    trend: 8.2,
    icon: <ShoppingBag size={20} />,
    variant: 'default',
  },
  {
    id: 'kpi-attesa',
    label: 'In Attesa',
    value: '3',
    sub: 'richiedono conferma',
    trend: -15,
    icon: <Clock size={20} />,
    variant: 'alert',
  },
  {
    id: 'kpi-valore',
    label: 'Valore Medio',
    value: '€ 27,30',
    sub: 'per ordine oggi',
    trend: 3.7,
    icon: <TrendingUp size={20} />,
    variant: 'default',
  },
  {
    id: 'kpi-consegna',
    label: 'Tasso Consegna',
    value: '96,8%',
    sub: 'ultimi 30 giorni',
    trend: 1.2,
    icon: <Truck size={20} />,
    variant: 'success',
  },
];

export default function KPIBentoGrid() {
  return (
    // Grid plan: 5 cards → grid-cols-4 → row1: hero spans 2 + 2 regular, row2: 3 regular
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <KPICard key={kpi.id} {...kpi} />
      ))}
    </div>
  );
}