'use client';
import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Euro,
  Clock,
  Truck,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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
    <div
      className={`rounded-xl border p-5 shadow-card flex flex-col gap-3 ${variantMap[variant]} ${hero ? 'lg:col-span-2' : ''}`}
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
            className={`tabular-nums font-bold leading-none ${hero ? 'text-4xl' : 'text-3xl'}`}
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
        <span
          className={`flex items-center gap-0.5 text-xs font-semibold ${trendPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}
        >
          {trendPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {trendPositive ? '+' : ''}
          {trend}%
        </span>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </div>
    </div>
  );
}

export default function KPIBentoGrid() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || 'r-001';

  const [pendingCount, setPendingCount] = useState(3);
  const [totalOrders, setTotalOrders] = useState(47);
  const [revenue, setRevenue] = useState(1284);

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const storedStr = localStorage.getItem(`iGO_orders_${restaurantId}`);
        if (storedStr) {
          const parsed = JSON.parse(storedStr);
          const pending = parsed.pending ? parsed.pending.length : 0;
          const accepted = parsed.accepted ? parsed.accepted.length : 0;
          const completed = parsed.completed ? parsed.completed.length : 0;
          const confirmed = parsed.confirmed ? parsed.confirmed.length : 0;
          const preparing = parsed.preparing ? parsed.preparing.length : 0;
          const delivering = parsed.delivering ? parsed.delivering.length : 0;

          const activeCount = pending + accepted + confirmed + preparing + delivering;
          const activeRevenue = [
            ...(parsed.pending || []),
            ...(parsed.accepted || []),
            ...(parsed.confirmed || []),
            ...(parsed.preparing || []),
            ...(parsed.delivering || []),
          ].reduce((acc: number, curr: any) => acc + (curr.total || 0), 0);

          const completedRevenue = (parsed.completed || []).reduce(
            (acc: number, curr: any) => acc + (curr.total || 0),
            0
          );

          setPendingCount(pending);
          // 37 completed orders baseline + active orders + completed orders count
          setTotalOrders(37 + activeCount + completed);
          // 1025.7 completed revenue baseline + active orders revenue + completed orders revenue
          setRevenue(Math.round(1025.7 + activeRevenue + completedRevenue));
        }
      } catch (e) {
        console.error(e);
      }
    };

    handleUpdate();
    window.addEventListener('iGO_orders_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('iGO_orders_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [restaurantId]);

  const kpis: KPICardProps[] = [
    {
      id: 'kpi-ricavi',
      label: 'Ricavi Oggi',
      value: `€ ${revenue.toLocaleString('it-IT')}`,
      sub: 'rispetto a ieri',
      trend: 12.4,
      icon: <Euro size={20} />,
      variant: 'success',
      hero: true,
    },
    {
      id: 'kpi-ordini',
      label: 'Ordini Oggi',
      value: totalOrders.toString(),
      sub: 'rispetto a ieri',
      trend: 8.2,
      icon: <ShoppingBag size={20} />,
      variant: 'default',
    },
    {
      id: 'kpi-attesa',
      label: 'In Attesa',
      value: pendingCount.toString(),
      sub: 'richiedono conferma',
      trend: pendingCount > 3 ? 15 : -15,
      icon: <Clock size={20} />,
      variant: pendingCount > 0 ? 'alert' : 'default',
    },
    {
      id: 'kpi-valore',
      label: 'Valore Medio',
      value: `€ ${(totalOrders > 0 ? revenue / totalOrders : 0).toFixed(2).replace('.', ',')}`,
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <KPICard key={kpi.id} {...kpi} />
      ))}
    </div>
  );
}
