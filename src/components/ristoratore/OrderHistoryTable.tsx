'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowRight, Bike, ShoppingBag, Utensils } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { romeDay } from '@/lib/dashboardStats';
import { effectiveStatus, statusLabel, statusTone, typeLabel } from '@/lib/orderStatus';

const typeIcon = (type?: string) =>
  type === 'domicilio' ? <Bike size={14} /> : type === 'asporto' ? <ShoppingBag size={14} /> : <Utensils size={14} />;

const when = (iso: string) => {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
  if (romeDay(d) === romeDay(new Date())) return `Oggi ${time}`;
  return `${d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Rome' })} ${time}`;
};

/**
 * Gli ultimi ordini, in breve. L'elenco completo, con filtri per periodo ed esportazione,
 * è nella pagina Storico ordini.
 */
export default function OrderHistoryTable({
  orders = [],
  loading = false,
  limit = 5,
}: {
  orders?: any[];
  loading?: boolean;
  limit?: number;
}) {
  const latest = React.useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit),
    [orders, limit]
  );

  return (
    <div className="bg-card rounded-xl border border-border shadow-card">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Ultimi ordini</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">I {limit} più recenti</p>
        </div>
        <Link
          href="/ristoratore/dashboard/storico"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          Storico completo
          <ArrowRight size={15} />
        </Link>
      </div>

      {loading ? (
        <p className="px-5 pb-6 text-sm text-muted-foreground">Caricamento…</p>
      ) : latest.length === 0 ? (
        <p className="px-5 pb-8 pt-2 text-center text-sm text-muted-foreground">Nessun ordine ricevuto negli ultimi giorni.</p>
      ) : (
        <ul className="divide-y divide-border/60 border-t border-border/60">
          {latest.map((o) => {
            const status = effectiveStatus(o);
            const total = Number(o.total) || 0;
            return (
              <li key={o.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                  title={typeLabel(o.type)}
                >
                  {typeIcon(o.type)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{o.customer_name || 'Cliente'}</p>
                  <p className="truncate text-xs tabular-nums text-muted-foreground">
                    #{o.order_number || String(o.id).slice(0, 8)} · {when(o.created_at)}
                  </p>
                </div>
                <Badge variant={statusTone(status)} dot className="hidden sm:inline-flex">
                  {statusLabel(status)}
                </Badge>
                <span className="w-20 flex-shrink-0 text-right text-sm font-bold tabular-nums text-foreground">
                  € {total.toFixed(2)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
