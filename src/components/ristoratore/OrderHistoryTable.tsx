'use client';
import React, { useState } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import Badge from '@/components/ui/Badge';

type OrderHistStatus = 'Consegnato' | 'Annullato' | 'In Consegna' | 'In Preparazione';

interface HistOrder {
  id: string;
  num: string;
  customer: string;
  items: string;
  total: number;
  type: 'Consegna' | 'Asporto';
  payment: 'Carta' | 'Contanti' | 'Online';
  status: OrderHistStatus;
  date: string;
  time: string;
  zone: string;
}

const histOrders: HistOrder[] = [
  {
    id: 'ho-001',
    num: '#4821',
    customer: 'Marco Ferretti',
    items: 'Pizza Margherita ×2, Coca-Cola ×2',
    total: 26.5,
    type: 'Consegna',
    payment: 'Carta',
    status: 'Consegnato',
    date: '03/05/2026',
    time: '20:14',
    zone: 'Centro',
  },
  {
    id: 'ho-002',
    num: '#4820',
    customer: 'Sara Conti',
    items: 'Spaghetti Carbonara, Tiramisù',
    total: 19.8,
    type: 'Asporto',
    payment: 'Online',
    status: 'Consegnato',
    date: '03/05/2026',
    time: '19:58',
    zone: '—',
  },
  {
    id: 'ho-003',
    num: '#4819',
    customer: 'Giulia Marino',
    items: 'Pizza Diavola, Birra artigianale',
    total: 21.0,
    type: 'Consegna',
    payment: 'Carta',
    status: 'Consegnato',
    date: '03/05/2026',
    time: '19:31',
    zone: 'Navigli',
  },
  {
    id: 'ho-004',
    num: '#4818',
    customer: 'Davide Ricci',
    items: 'Antipasto misto ×2',
    total: 18.5,
    type: 'Asporto',
    payment: 'Contanti',
    status: 'Annullato',
    date: '03/05/2026',
    time: '19:10',
    zone: '—',
  },
  {
    id: 'ho-005',
    num: '#4817',
    customer: 'Elena Galli',
    items: 'Lasagne al forno ×2, Vino rosso',
    total: 42.0,
    type: 'Consegna',
    payment: 'Online',
    status: 'Consegnato',
    date: '03/05/2026',
    time: '18:55',
    zone: 'Brera',
  },
  {
    id: 'ho-006',
    num: '#4816',
    customer: 'Roberto Esposito',
    items: 'Risotto ai funghi',
    total: 16.0,
    type: 'Asporto',
    payment: 'Contanti',
    status: 'Consegnato',
    date: '03/05/2026',
    time: '18:30',
    zone: '—',
  },
  {
    id: 'ho-007',
    num: '#4815',
    customer: 'Valentina Russo',
    items: 'Pizza Q. stagioni ×2, Fritto misto',
    total: 38.5,
    type: 'Consegna',
    payment: 'Carta',
    status: 'Consegnato',
    date: '03/05/2026',
    time: '18:12',
    zone: 'Isola',
  },
  {
    id: 'ho-008',
    num: '#4814',
    customer: 'Antonio De Luca',
    items: "Penne all'arrabbiata, Dolce",
    total: 22.0,
    type: 'Consegna',
    payment: 'Online',
    status: 'In Consegna',
    date: '03/05/2026',
    time: '17:48',
    zone: 'Loreto',
  },
  {
    id: 'ho-009',
    num: '#4813',
    customer: 'Francesca Lombardi',
    items: 'Branzino al forno ×2',
    total: 44.0,
    type: 'Consegna',
    payment: 'Carta',
    status: 'In Consegna',
    date: '03/05/2026',
    time: '17:22',
    zone: 'Porta Venezia',
  },
  {
    id: 'ho-010',
    num: '#4812',
    customer: 'Matteo Ferrari',
    items: 'Tagliere salumi, Bruschette ×3',
    total: 29.0,
    type: 'Asporto',
    payment: 'Contanti',
    status: 'Consegnato',
    date: '02/05/2026',
    time: '21:05',
    zone: '—',
  },
  {
    id: 'ho-011',
    num: '#4811',
    customer: 'Chiara Moretti',
    items: 'Gnocchi al pomodoro ×2',
    total: 24.0,
    type: 'Consegna',
    payment: 'Online',
    status: 'Annullato',
    date: '02/05/2026',
    time: '20:40',
    zone: 'Garibaldi',
  },
  {
    id: 'ho-012',
    num: '#4810',
    customer: 'Lorenzo Fontana',
    items: 'Costolette di agnello, Contorno',
    total: 37.5,
    type: 'Consegna',
    payment: 'Carta',
    status: 'Consegnato',
    date: '02/05/2026',
    time: '20:15',
    zone: 'Ticinese',
  },
];

const statusBadgeVariant: Record<OrderHistStatus, 'success' | 'danger' | 'info' | 'warning'> = {
  Consegnato: 'success',
  Annullato: 'danger',
  'In Consegna': 'info',
  'In Preparazione': 'warning',
};

export default function OrderHistoryTable({ limit }: { limit?: number }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof HistOrder>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const perPage = limit || 8;

  const filtered = histOrders.filter(
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
