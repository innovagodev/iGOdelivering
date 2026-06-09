'use client';
import React, { useState } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import Badge from '@/components/ui/Badge';

type OrderHistStatus = 'Consegnato' | 'Annullato' | 'In Consegna' | 'In Preparazione' | 'Pronto' | 'In Attesa' | 'Nuovo';

interface HistOrder {
  id: string;
  num: string;
  customer: string;
  items: string;
  total: number;
  type: string;
  payment: string;
  status: OrderHistStatus;
  date: string;
  time: string;
  zone: string;
}

const statusBadgeVariant: Record<OrderHistStatus, 'success' | 'danger' | 'info' | 'warning' | 'primary' | 'neutral'> = {
  Consegnato: 'success',
  Annullato: 'danger',
  'In Consegna': 'info',
  'In Preparazione': 'warning',
  Pronto: 'success',
  'In Attesa': 'warning',
  Nuovo: 'primary',
};

export default function OrderHistoryTable({ orders = [], loading = false, limit }: { orders?: any[]; loading?: boolean; limit?: number }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof HistOrder>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const perPage = limit || 8;

  const mappedOrders: HistOrder[] = React.useMemo(() => {
    return orders.map((o: any) => {
      const orderItems = o.order_items || [];
      const itemsStr = orderItems.map((i: any) => `${i.name} ×${i.qty}`).join(', ');
      
      let mappedStatus: OrderHistStatus = 'Nuovo';
      if (o.status === 'delivered') mappedStatus = 'Consegnato';
      else if (o.status === 'cancelled') mappedStatus = 'Annullato';
      else if (o.status === 'delivering') mappedStatus = 'In Consegna';
      else if (o.status === 'preparing') mappedStatus = 'In Preparazione';
      else if (o.status === 'ready') mappedStatus = 'Pronto';
      else if (o.status === 'pending') mappedStatus = 'In Attesa';

      const createdDate = new Date(o.created_at);
      const formattedDate = createdDate.toLocaleDateString('it-IT');
      const formattedTime = createdDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

      return {
        id: o.id,
        num: o.order_number || o.id.slice(0, 8),
        customer: o.customer_name || 'Cliente',
        items: itemsStr || 'Nessun articolo',
        total: Number(o.total || 0),
        type: o.type === 'domicilio' ? 'Consegna' : (o.type === 'asporto' ? 'Asporto' : 'Tavolo'),
        payment: 'Contanti', // Default fallback
        status: mappedStatus,
        date: formattedDate,
        time: formattedTime,
        zone: o.type === 'domicilio' && o.customer_address ? o.customer_address : '—',
      };
    });
  }, [orders]);

  const filtered = mappedOrders.filter(
    (o) =>
      o.customer.toLowerCase().includes(search.toLowerCase()) ||
      o.num.includes(search) ||
      o.items.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number')
      return sortDir === 'asc' ? av - bv : bv - av;
    return sortDir === 'asc'
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  const totalPages = Math.ceil(sorted.length / perPage);
  const pageData = limit
    ? sorted.slice(0, limit)
    : sorted.slice((page - 1) * perPage, page * perPage);

  const handleSort = (key: keyof HistOrder) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: keyof HistOrder }) => (
    <span className="inline-flex flex-col ml-1">
      <ChevronUp
        size={10}
        className={sortKey === col && sortDir === 'asc' ? 'text-primary' : 'text-border'}
      />
      <ChevronDown
        size={10}
        className={sortKey === col && sortDir === 'desc' ? 'text-primary' : 'text-border'}
      />
    </span>
  );

  return (
    <div className="bg-card rounded-xl border border-border shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-border">
        <div>
          <h3 className="text-base font-semibold text-foreground">Storico Ordini</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} ordini trovati</p>
        </div>
        <div className="relative w-full sm:w-80 lg:w-96">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Cerca ordine, cliente..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8 pr-3 py-2 text-base bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent w-full placeholder:text-muted-foreground"
          />
        </div>
      </div>
      {/* Desktop view: Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {[
                { key: 'num', label: 'N. Ordine' },
                { key: 'customer', label: 'Cliente' },
                { key: 'items', label: 'Articoli' },
                { key: 'total', label: 'Totale' },
                { key: 'type', label: 'Tipo' },
                { key: 'payment', label: 'Pagamento', className: 'hidden lg:table-cell' },
                { key: 'status', label: 'Stato' },
                { key: 'date', label: 'Data', className: 'hidden xl:table-cell' },
                { key: 'zone', label: 'Zona', className: 'hidden lg:table-cell' },
              ].map((col) => (
                <th
                  key={`th-${col.key}`}
                  onClick={() => handleSort(col.key as keyof HistOrder)}
                  className={`px-4 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap ${col.className || ''}`}
                  style={{ letterSpacing: '0.04em' }}
                >
                  {col.label}
                  <SortIcon col={col.key as keyof HistOrder} />
                </th>
              ))}
              <th
                className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground"
                style={{ letterSpacing: '0.04em' }}
              >
                Azioni
              </th>
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center text-sm text-muted-foreground">
                  Nessun ordine trovato per &quot;{search}&quot;
                </td>
              </tr>
            )}
            {pageData.map((order, idx) => (
              <tr
                key={order.id}
                className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}
              >
                <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">
                  {order.num}
                </td>
                <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                  {order.customer}
                </td>
                <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                  {order.items}
                </td>
                <td className="px-4 py-3 font-bold tabular-nums text-foreground">
                  € {order.total.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={order.type === 'Consegna' ? 'info' : 'neutral'}>
                    {order.type}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{order.payment}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusBadgeVariant[order.status]} dot>
                    {order.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap tabular-nums hidden xl:table-cell">
                  {order.date} {order.time}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{order.zone}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Visualizza ordine"
                  >
                    <Eye size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view: Cards List */}
      <div className="md:hidden divide-y divide-border">
        {pageData.length === 0 && (
          <div className="px-4 py-16 text-center text-sm text-muted-foreground">
            Nessun ordine trovato per &quot;{search}&quot;
          </div>
        )}
        {pageData.map((order) => (
          <div
            key={`mobile-order-${order.id}`}
            className="p-4 space-y-3 hover:bg-muted/10 transition-colors"
          >
            {/* Header: Order Num & Status */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-primary">
                {order.num}
              </span>
              <Badge variant={statusBadgeVariant[order.status]} dot>
                {order.status}
              </Badge>
            </div>

            {/* Customer & Type */}
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                {order.customer}
              </span>
              <Badge variant={order.type === 'Consegna' ? 'info' : 'neutral'}>
                {order.type}
              </Badge>
            </div>

            {/* Items */}
            <p className="text-xs text-muted-foreground line-clamp-2">
              {order.items}
            </p>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="block text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
                  Totale
                </span>
                <span className="font-bold text-foreground tabular-nums">
                  € {order.total.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="block text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
                  Pagamento
                </span>
                <span className="text-muted-foreground">
                  {order.payment}
                </span>
              </div>
              <div>
                <span className="block text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
                  Data e Ora
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {order.date} {order.time}
                </span>
              </div>
              <div>
                <span className="block text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
                  Zona
                </span>
                <span className="text-muted-foreground">
                  {order.zone}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Pagination */}
      {!limit && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {(page - 1) * perPage + 1}–{Math.min(page * perPage, sorted.length)} di {sorted.length}{' '}
            ordini
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={`page-${p}`}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                  page === p ? 'bg-primary text-white' : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
