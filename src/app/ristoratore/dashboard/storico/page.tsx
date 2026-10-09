'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bike,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  MapPin,
  Phone,
  Search,
  ShoppingBag,
  Store,
  Utensils,
  X,
} from 'lucide-react';
import PageTopbar from '@/components/layout/PageTopbar';
import Badge from '@/components/ui/Badge';
import FilterPills from '@/components/ui/FilterPills';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { fetchAllPages } from '@/lib/fetchAll';
import { UNPAID_PAYMENT_FILTER, isCountedOrder, romeDay, shiftDay } from '@/lib/dashboardStats';
import { daysBetween, zonedToUtc } from '@/lib/serviceHours';
import {
  StatusGroup,
  effectiveStatus,
  paymentLabel,
  statusGroupOf,
  statusLabel,
  statusTone,
  typeLabel,
} from '@/lib/orderStatus';

/**
 * Storico ordini: tutti gli ordini di un periodo, con filtri, totali ed esportazione.
 * Sta sotto la Dashboard (la voce resta evidenziata); Ordini live mostra solo la giornata.
 * Legge a intervalli di date dal database, non gli ultimi 14 giorni della dashboard.
 */

const COLUMNS =
  'id, order_number, type, status, payment_method, payment_status, total, subtotal, delivery_fee, discount, promo_code, created_at, scheduled_at, accept_deadline, customer_name, customer_phone, customer_email, customer_address, table_number, guests, notes, order_items(name, qty, price, note, added_ingredients, removed_ingredients)';

const MAX_DAYS = 366;
const PAGE_SIZE = 25;

type PeriodKey = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'lastMonth' | 'custom';
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Oggi' },
  { key: 'yesterday', label: 'Ieri' },
  { key: '7d', label: '7 giorni' },
  { key: '30d', label: '30 giorni' },
  { key: 'month', label: 'Questo mese' },
  { key: 'lastMonth', label: 'Mese scorso' },
  { key: 'custom', label: 'Personalizzato' },
];

const rangeOf = (key: PeriodKey, custom: { from: string; to: string }) => {
  const t = romeDay(new Date());
  switch (key) {
    case 'today':
      return { from: t, to: t };
    case 'yesterday': {
      const y = shiftDay(t, -1);
      return { from: y, to: y };
    }
    case '7d':
      return { from: shiftDay(t, -6), to: t };
    case '30d':
      return { from: shiftDay(t, -29), to: t };
    case 'month':
      return { from: t.slice(0, 8) + '01', to: t };
    case 'lastMonth': {
      const end = shiftDay(t.slice(0, 8) + '01', -1);
      return { from: end.slice(0, 8) + '01', to: end };
    }
    default:
      return custom;
  }
};

interface Row {
  id: string;
  raw: any;
  ts: number;
  num: string;
  customer: string;
  phone: string;
  type: string;
  typeLabel: string;
  items: string;
  total: number;
  pay: string;
  payKey: 'online' | 'cash' | 'pos';
  status: string;
  statusLabel: string;
  group: Exclude<StatusGroup, 'all'>;
  counted: boolean;
}

const toRow = (o: any): Row => {
  const status = effectiveStatus(o);
  const lines: any[] = Array.isArray(o.order_items) ? o.order_items : [];
  return {
    id: o.id,
    raw: o,
    ts: new Date(o.created_at).getTime(),
    num: String(o.order_number || String(o.id).slice(0, 8)),
    customer: o.customer_name || 'Cliente',
    phone: o.customer_phone || '',
    type: o.type,
    typeLabel: typeLabel(o.type),
    items: lines.map((i) => `${i.qty || 1}× ${i.name}`).join(', '),
    total: Number(o.total) || 0,
    pay: paymentLabel(o),
    payKey: o.payment_method === 'online' ? 'online' : o.payment_method === 'pos' ? 'pos' : 'cash',
    status,
    statusLabel: statusLabel(status),
    group: statusGroupOf(status),
    counted: isCountedOrder({ status, payment_status: o.payment_status }),
  };
};

const fmtMoney = (n: number) => `€ ${n.toFixed(2)}`;
const fmtDay = (ts: number) =>
  new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Rome' });
const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
const fmtDayShort = (day: string) => {
  const [y, m, d] = day.split('-');
  return `${d}/${m}/${y}`;
};

const typeIcon = (type: string, size = 14) =>
  type === 'domicilio' ? <Bike size={size} /> : type === 'asporto' ? <ShoppingBag size={size} /> : <Utensils size={size} />;

/** Una cella CSV: virgolette raddoppiate e, contro le formule di Excel, apice davanti a = + - @. */
const csvCell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

const exportCsv = (rows: Row[], from: string, to: string) => {
  const head = ['Data', 'Ora', 'Numero', 'Cliente', 'Telefono', 'Canale', 'Indirizzo / Tavolo', 'Articoli', 'Totale', 'Pagamento', 'Stato'];
  const lines = rows.map((r) => {
    const o = r.raw;
    return [
      fmtDay(r.ts),
      fmtTime(r.ts),
      r.num,
      r.customer,
      r.phone,
      r.typeLabel,
      r.type === 'tavolo' ? `Tavolo ${o.table_number || ''}`.trim() : o.customer_address || '',
      r.items,
      r.total.toFixed(2).replace('.', ','),
      r.pay,
      r.statusLabel,
    ]
      .map(csvCell)
      .join(';');
  });
  // BOM + punto e virgola: Excel italiano apre accenti e colonne senza importazione guidata.
  const csv = '﻿' + [head.map(csvCell).join(';'), ...lines].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `ordini_${from}_${to}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

type SortKey = 'ts' | 'num' | 'customer' | 'total' | 'statusLabel';

export default function StoricoOrdiniPage() {
  const { user, isLoading } = useAuth();
  const restaurantId = user?.restaurantId || '';
  const noRestaurant = !restaurantId || restaurantId === 'r-001';

  const [period, setPeriod] = useState<PeriodKey>('7d');
  const [custom, setCustom] = useState(() => {
    const t = romeDay(new Date());
    return { from: shiftDay(t, -6), to: t };
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reqId = useRef(0);

  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState<'all' | 'domicilio' | 'asporto' | 'tavolo'>('all');
  const [payment, setPayment] = useState<'all' | 'online' | 'cash' | 'pos'>('all');
  const [group, setGroup] = useState<StatusGroup>('all');
  const [sortKey, setSortKey] = useState<SortKey>('ts');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const range = useMemo(() => rangeOf(period, custom), [period, custom]);
  const rangeError =
    !range.from || !range.to
      ? 'Scegli le due date.'
      : range.from > range.to
        ? 'La data iniziale deve essere prima di quella finale.'
        : daysBetween(range.from, range.to) + 1 > MAX_DAYS
          ? `Il periodo può durare al massimo ${MAX_DAYS} giorni.`
          : null;

  const load = useCallback(async () => {
    if (noRestaurant || rangeError) return;
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const startIso = zonedToUtc(range.from, 0).toISOString();
      const endIso = zonedToUtc(shiftDay(range.to, 1), 0).toISOString();
      const data = await fetchAllPages((from, to) =>
        supabase
          .from('orders')
          .select(COLUMNS)
          .eq('restaurant_id', restaurantId)
          .gte('created_at', startIso)
          .lt('created_at', endIso)
          // Ordini online mai pagati: non sono mai arrivati in cucina.
          .not('payment_status', 'in', UNPAID_PAYMENT_FILTER)
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to)
      );
      if (id !== reqId.current) return; // una richiesta più recente ha preso il posto
      setRows(data.map(toRow));
    } catch (e: any) {
      if (id !== reqId.current) return;
      console.error('[storico] errore di lettura:', e);
      setError('Non sono riuscito a caricare gli ordini. Riprova.');
      setRows([]);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [restaurantId, noRestaurant, range.from, range.to, rangeError]);

  useEffect(() => {
    load();
    // reloadKey forza una nuova lettura (pulsante "Riprova")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, reloadKey]);

  // Ogni cambio di filtro riparte dalla prima pagina.
  useEffect(() => {
    setPage(1);
  }, [search, channel, payment, group, sortKey, sortDir, rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (channel !== 'all' && r.type !== channel) return false;
      if (payment !== 'all' && r.payKey !== payment) return false;
      if (group !== 'all' && r.group !== group) return false;
      if (!q) return true;
      return (
        r.customer.toLowerCase().includes(q) ||
        r.num.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        r.items.toLowerCase().includes(q) ||
        String(r.raw.customer_address || '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, channel, payment, group]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), 'it') * dir;
    });
  }, [filtered, sortKey, sortDir]);

  // Totali con le stesse regole dei KPI della dashboard: annullati, rifiutati e persi non contano.
  const totals = useMemo(() => {
    const counted = filtered.filter((r) => r.counted);
    const revenue = counted.reduce((s, r) => s + r.total, 0);
    const byChannel = (['domicilio', 'asporto', 'tavolo'] as const).map((t) => {
      const list = counted.filter((r) => r.type === t);
      return { type: t, count: list.length, revenue: list.reduce((s, r) => s + r.total, 0) };
    });
    return {
      count: counted.length,
      revenue,
      average: counted.length ? revenue / counted.length : 0,
      excluded: filtered.length - counted.length,
      byChannel,
    };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const open = rows.find((r) => r.id === openId) || null;

  const sortBy = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'ts' || key === 'total' ? 'desc' : 'asc');
    }
  };

  const filtersActive = channel !== 'all' || payment !== 'all' || group !== 'all' || search.trim() !== '';
  const resetFilters = () => {
    setChannel('all');
    setPayment('all');
    setGroup('all');
    setSearch('');
  };

  const th = (key: SortKey, label: string, cls = '') => (
    <th
      scope="col"
      aria-sort={sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground ${cls}`}
    >
      <button
        type="button"
        onClick={() => sortBy(key)}
        className="inline-flex items-center gap-1 whitespace-nowrap hover:text-foreground cursor-pointer"
      >
        {label}
        {sortKey === key ? (
          sortDir === 'asc' ? <ChevronUp size={13} className="text-primary" /> : <ChevronDown size={13} className="text-primary" />
        ) : (
          <ChevronDown size={13} className="opacity-30" />
        )}
      </button>
    </th>
  );

  const groupLabel = 'mb-1 text-xs font-semibold text-muted-foreground';

  return (
    <div className="flex flex-1 min-h-0 min-w-0 bg-background overflow-hidden relative">
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <PageTopbar
          left={
            <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <Store size={16} className="flex-shrink-0 text-primary" />
              <span className="truncate text-base font-semibold text-foreground">
                {user?.restaurantName || 'Il tuo ristorante'}
              </span>
            </div>
          }
        />

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1500px] space-y-4 px-3 py-4 sm:px-5 lg:px-6">
            {isLoading ? (
              <div className="flex min-h-[50dvh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : noRestaurant ? (
              <div className="rounded-2xl bg-card p-8 text-center shadow-sm">
                <h2 className="text-xl font-bold text-foreground">Nessun ristorante collegato</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Il tuo account non è ancora collegato a un ristorante attivo. Contatta l’amministratore.
                </p>
              </div>
            ) : (
              <>
                {/* Intestazione */}
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href="/ristoratore/dashboard"
                      className="group inline-flex items-center gap-1.5 rounded-full bg-card py-1 pl-2.5 pr-3.5 text-sm font-semibold text-foreground shadow-sm transition-shadow hover:shadow-md"
                    >
                      <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" /> Dashboard
                    </Link>
                    <h1 className="mt-1 text-2xl font-bold text-foreground">Storico ordini</h1>
                    <p className="text-sm text-muted-foreground">
                      {rangeError ? '' : `Dal ${fmtDayShort(range.from)} al ${fmtDayShort(range.to)}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={sorted.length === 0 || loading}
                    onClick={() => exportCsv(sorted, range.from, range.to)}
                    title="Scarica in CSV gli ordini filtrati (si apre con Excel)"
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Download size={16} />
                    Esporta CSV
                    {sorted.length > 0 && <span className="text-background/70">({sorted.length})</span>}
                  </button>
                </div>

                {/* Periodo */}
                <div className="space-y-2 rounded-2xl bg-card p-3 shadow-sm sm:p-4">
                  <p className={groupLabel}>Periodo</p>
                  <FilterPills
                    ariaLabel="Periodo"
                    pills={PERIODS.map((p) => ({
                      key: p.key,
                      label: p.label,
                      icon: p.key === 'custom' ? <Calendar size={15} /> : undefined,
                      active: period === p.key,
                      dividerBefore: p.key === 'custom',
                      onClick: () => setPeriod(p.key),
                    }))}
                  />
                  {period === 'custom' && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        Dal
                        <input
                          type="date"
                          value={custom.from}
                          max={custom.to || undefined}
                          onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                          className="h-10 rounded-xl border border-border bg-background px-3 text-base text-foreground"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        al
                        <input
                          type="date"
                          value={custom.to}
                          min={custom.from || undefined}
                          onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                          className="h-10 rounded-xl border border-border bg-background px-3 text-base text-foreground"
                        />
                      </label>
                    </div>
                  )}
                  {rangeError && <p className="text-sm font-semibold text-[var(--danger)]">{rangeError}</p>}
                </div>

                {/* Filtri */}
                <div className="space-y-3 rounded-2xl bg-card p-3 shadow-sm sm:p-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Cerca per cliente, numero, telefono, piatto o indirizzo…"
                      className="h-11 w-full rounded-xl border border-transparent bg-muted/60 pl-9 pr-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-8 gap-y-3">
                    <div className="min-w-0 max-w-full">
                      <p className={groupLabel}>Canale</p>
                      <FilterPills
                        ariaLabel="Canale"
                        pills={(
                          [
                            ['all', 'Tutti'],
                            ['domicilio', 'Domicilio'],
                            ['asporto', 'Asporto'],
                            ['tavolo', 'Tavolo'],
                          ] as const
                        ).map(([k, l]) => ({ key: k, label: l, active: channel === k, onClick: () => setChannel(k) }))}
                      />
                    </div>
                    <div className="min-w-0 max-w-full">
                      <p className={groupLabel}>Pagamento</p>
                      <FilterPills
                        ariaLabel="Pagamento"
                        pills={(
                          [
                            ['all', 'Tutti'],
                            ['online', 'Online'],
                            ['cash', 'Contanti'],
                            ['pos', 'POS'],
                          ] as const
                        ).map(([k, l]) => ({ key: k, label: l, active: payment === k, onClick: () => setPayment(k) }))}
                      />
                    </div>
                    <div className="min-w-0 max-w-full">
                      <p className={groupLabel}>Stato</p>
                      <FilterPills
                        ariaLabel="Stato"
                        pills={(
                          [
                            ['all', 'Tutti'],
                            ['done', 'Consegnati'],
                            ['open', 'Aperti'],
                            ['lost', 'Annullati/persi'],
                          ] as const
                        ).map(([k, l]) => ({ key: k, label: l, active: group === k, onClick: () => setGroup(k) }))}
                      />
                    </div>
                  </div>
                  {filtersActive && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline cursor-pointer"
                    >
                      <X size={14} /> Azzera i filtri
                    </button>
                  )}
                </div>

                {/* Riepilogo */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    { label: 'Ordini', value: String(totals.count), hint: 'esclusi annullati e persi' },
                    { label: 'Incasso', value: fmtMoney(totals.revenue), hint: 'ordini conteggiati' },
                    { label: 'Scontrino medio', value: fmtMoney(totals.average), hint: '' },
                    { label: 'Annullati e persi', value: String(totals.excluded), hint: 'non nel totale' },
                  ].map((k) => (
                    <div key={k.label} className="rounded-2xl bg-card p-4 shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground">{k.label}</p>
                      <p className="mt-1 text-2xl font-black tabular-nums text-foreground">{loading ? '…' : k.value}</p>
                      {k.hint && <p className="mt-0.5 text-xs text-muted-foreground">{k.hint}</p>}
                    </div>
                  ))}
                </div>
                {!loading && totals.count > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {totals.byChannel
                      .filter((c) => c.count > 0)
                      .map((c) => (
                        <span
                          key={c.type}
                          className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm"
                        >
                          <span className="text-muted-foreground">{typeIcon(c.type, 13)}</span>
                          {typeLabel(c.type)}: {c.count} · {fmtMoney(c.revenue)}
                        </span>
                      ))}
                  </div>
                )}

                {/* Risultati */}
                <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
                  {error ? (
                    <div className="px-4 py-14 text-center">
                      <p className="text-sm font-semibold text-foreground">{error}</p>
                      <button
                        type="button"
                        onClick={() => setReloadKey((k) => k + 1)}
                        className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover cursor-pointer"
                      >
                        Riprova
                      </button>
                    </div>
                  ) : loading ? (
                    <div className="flex items-center justify-center gap-3 px-4 py-16 text-sm font-medium text-muted-foreground">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Carico gli ordini…
                    </div>
                  ) : sorted.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                      <p className="text-sm font-semibold text-foreground">Nessun ordine trovato</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {filtersActive ? 'Prova a togliere qualche filtro.' : 'In questo periodo non ci sono ordini.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Tabella (da tablet in su) */}
                      <div className="hidden overflow-x-auto md:block">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              {th('ts', 'Data e ora')}
                              {th('num', 'Numero')}
                              {th('customer', 'Cliente')}
                              <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Canale</th>
                              <th scope="col" className="hidden px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground xl:table-cell">Articoli</th>
                              <th scope="col" className="hidden px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground lg:table-cell">Pagamento</th>
                              {th('statusLabel', 'Stato')}
                              {th('total', 'Totale', 'text-right')}
                            </tr>
                          </thead>
                          <tbody>
                            {pageRows.map((r) => (
                              <tr
                                key={r.id}
                                tabIndex={0}
                                onClick={() => setOpenId(r.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setOpenId(r.id);
                                  }
                                }}
                                className="cursor-pointer border-t border-border/60 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                              >
                                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-foreground">
                                  {fmtDay(r.ts)} <span className="text-muted-foreground">{fmtTime(r.ts)}</span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-semibold text-primary">{r.num}</td>
                                <td className="px-3 py-3 font-semibold text-foreground">
                                  <span className="line-clamp-1">{r.customer}</span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-3">
                                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                    {typeIcon(r.type)} {r.typeLabel}
                                  </span>
                                </td>
                                <td className="hidden max-w-[260px] px-3 py-3 text-muted-foreground xl:table-cell">
                                  <span className="line-clamp-1">{r.items || '—'}</span>
                                </td>
                                <td className="hidden whitespace-nowrap px-3 py-3 text-muted-foreground lg:table-cell">{r.pay}</td>
                                <td className="whitespace-nowrap px-3 py-3">
                                  <Badge variant={statusTone(r.status)} dot>{r.statusLabel}</Badge>
                                </td>
                                <td className={`whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums ${r.counted ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                                  {fmtMoney(r.total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Schede (telefono) */}
                      <ul className="divide-y divide-border/60 md:hidden">
                        {pageRows.map((r) => (
                          <li key={r.id}>
                            <button
                              type="button"
                              onClick={() => setOpenId(r.id)}
                              className="flex w-full flex-col gap-1.5 px-4 py-3 text-left active:bg-muted/40 cursor-pointer"
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="font-mono text-xs font-semibold text-primary">{r.num}</span>
                                <Badge variant={statusTone(r.status)} dot>{r.statusLabel}</Badge>
                              </span>
                              <span className="flex items-baseline justify-between gap-3">
                                <span className="line-clamp-1 min-w-0 text-base font-bold text-foreground">{r.customer}</span>
                                <span className={`flex-shrink-0 text-base font-black tabular-nums ${r.counted ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                                  {fmtMoney(r.total)}
                                </span>
                              </span>
                              <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1">{typeIcon(r.type, 12)} {r.typeLabel}</span>
                                <span>{r.pay}</span>
                                <span className="tabular-nums">{fmtDay(r.ts)} {fmtTime(r.ts)}</span>
                              </span>
                              {r.items && <span className="line-clamp-2 text-xs text-muted-foreground">{r.items}</span>}
                            </button>
                          </li>
                        ))}
                      </ul>

                      {/* Pagine */}
                      <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-3">
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} di {sorted.length}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label="Pagina precedente"
                            disabled={page === 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="min-w-[4.5rem] text-center text-sm font-semibold tabular-nums text-foreground">
                            {page} / {totalPages}
                          </span>
                          <button
                            type="button"
                            aria-label="Pagina successiva"
                            disabled={page === totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {open && <OrderSheet row={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

/** Dettaglio di un ordine, sola lettura. */
function OrderSheet({ row, onClose }: { row: Row; onClose: () => void }) {
  const o = row.raw;
  const lines: any[] = Array.isArray(o.order_items) ? o.order_items : [];
  const money = (n: unknown) => fmtMoney(Number(n) || 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const when =
    o.type === 'tavolo'
      ? null
      : o.scheduled_at
        ? `${new Date(o.scheduled_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Rome' })} alle ${fmtTime(new Date(o.scheduled_at).getTime())}`
        : 'Il prima possibile';

  const section = 'space-y-2';
  const sectionTitle = 'text-xs font-bold uppercase tracking-wider text-muted-foreground';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={onClose} />
      <aside
        className="relative z-10 flex h-full w-full flex-col bg-card shadow-2xl animate-in slide-in-from-right duration-200 sm:w-[clamp(24rem,45vw,30rem)]"
        aria-label={`Ordine ${row.num}`}
      >
        <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-primary">#{row.num}</span>
              <Badge variant={statusTone(row.status)} dot>{row.statusLabel}</Badge>
            </div>
            <h2 className="line-clamp-2 text-lg font-bold text-foreground">{row.customer}</h2>
            <p className="text-sm tabular-nums text-muted-foreground">
              {fmtDay(row.ts)} alle {fmtTime(row.ts)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-6 pt-2">
          <div className={section}>
            <h3 className={sectionTitle}>Servizio</h3>
            <div className="space-y-1.5 rounded-xl bg-muted/50 p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold text-foreground">
                {typeIcon(row.type, 15)} {row.typeLabel}
                {o.type === 'tavolo' && o.table_number ? ` ${o.table_number}` : ''}
              </p>
              {when && <p className="text-muted-foreground">{o.type === 'domicilio' ? 'Consegna' : 'Ritiro'}: {when}</p>}
              {o.customer_address && (
                <p className="flex items-start gap-2 text-muted-foreground">
                  <MapPin size={14} className="mt-0.5 flex-shrink-0" /> {o.customer_address}
                </p>
              )}
            </div>
          </div>

          {(o.customer_phone || (o.customer_email && !String(o.customer_email).endsWith('@internal.it'))) && (
            <div className={section}>
              <h3 className={sectionTitle}>Contatti</h3>
              <div className="space-y-1.5 rounded-xl bg-muted/50 p-3 text-sm">
                {o.customer_phone && (
                  <a href={`tel:${o.customer_phone}`} className="flex items-center gap-2 font-semibold text-primary hover:underline">
                    <Phone size={14} /> {o.customer_phone}
                  </a>
                )}
                {o.customer_email && !String(o.customer_email).endsWith('@internal.it') && (
                  <p className="break-all text-muted-foreground [overflow-wrap:anywhere]">{o.customer_email}</p>
                )}
              </div>
            </div>
          )}

          <div className={section}>
            <h3 className={sectionTitle}>Piatti</h3>
            <ul className="divide-y divide-border/60 rounded-xl bg-muted/50 px-3 text-sm">
              {lines.length === 0 && <li className="py-3 text-muted-foreground">Nessun piatto registrato.</li>}
              {lines.map((i, idx) => {
                const added: any[] = Array.isArray(i.added_ingredients) ? i.added_ingredients : [];
                const removed: string[] = Array.isArray(i.removed_ingredients) ? i.removed_ingredients : [];
                return (
                  <li key={idx} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        {i.qty || 1}× {i.name}
                      </p>
                      {(added.length > 0 || removed.length > 0) && (
                        <p className="text-xs text-muted-foreground">
                          {[...added.map((a) => '+' + (a.name || a)), ...removed.map((r) => '-' + r)].join(', ')}
                        </p>
                      )}
                      {i.note && <p className="text-xs font-semibold italic text-amber-700 dark:text-amber-400">“{i.note}”</p>}
                    </div>
                    <span className="flex-shrink-0 tabular-nums text-muted-foreground">{money((Number(i.price) || 0) * (i.qty || 1))}</span>
                  </li>
                );
              })}
            </ul>
            {o.notes && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                <span className="font-bold">Nota: </span>
                {o.notes}
              </p>
            )}
          </div>

          <div className={section}>
            <h3 className={sectionTitle}>Pagamento</h3>
            <div className="space-y-1.5 rounded-xl bg-muted/50 p-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotale</span>
                <span className="tabular-nums">{money(o.subtotal)}</span>
              </div>
              {Number(o.delivery_fee) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Consegna</span>
                  <span className="tabular-nums">{money(o.delivery_fee)}</span>
                </div>
              )}
              {Number(o.discount) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Sconto{o.promo_code ? ` (${o.promo_code})` : ''}</span>
                  <span className="tabular-nums">- {money(o.discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border/70 pt-2 text-base font-black text-foreground">
                <span>Totale</span>
                <span className="tabular-nums">{money(o.total)}</span>
              </div>
              <p className="pt-1 text-muted-foreground">{row.pay}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
