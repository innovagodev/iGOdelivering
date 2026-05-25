'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import {
  Plus,
  Search,
  Store,
  MapPin,
  Clock,
  CheckCircle,
  PauseCircle,
  Settings,
  Users,
  PauseOctagon,
  PlayCircle,
  Trash2,
  X,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  status: 'published' | 'draft' | 'suspended';
  owner: string;
  email: string;
  phone: string;
  createdAt: string;
  menuItems: number;
  ordersToday: number;
  category: string;
}

const mockRestaurants: Restaurant[] = [
  {
    id: 'r-001',
    name: 'Pizzeria Bella Napoli',
    address: 'Via Toledo 45',
    city: 'Napoli',
    status: 'published',
    owner: 'Giuseppe Esposito',
    email: 'giuseppe@bellanapoli.it',
    phone: '+39 081 123 4567',
    createdAt: '2026-01-15',
    menuItems: 32,
    ordersToday: 18,
    category: 'Pizzeria',
  },
  {
    id: 'r-002',
    name: 'Trattoria da Mario',
    address: 'Corso Umberto I 12',
    city: 'Roma',
    status: 'published',
    owner: 'Mario Rossi',
    email: 'mario@trattoriamario.it',
    phone: '+39 06 987 6543',
    createdAt: '2026-02-20',
    menuItems: 24,
    ordersToday: 9,
    category: 'Trattoria',
  },
  {
    id: 'r-003',
    name: 'Sushi Zen',
    address: 'Via Montenapoleone 8',
    city: 'Milano',
    status: 'draft',
    owner: 'Kenji Tanaka',
    email: 'kenji@sushizen.it',
    phone: '+39 02 555 7890',
    createdAt: '2026-04-10',
    menuItems: 0,
    ordersToday: 0,
    category: 'Giapponese',
  },
  {
    id: 'r-004',
    name: 'Osteria del Porto',
    address: 'Lungomare Caracciolo 22',
    city: 'Napoli',
    status: 'suspended',
    owner: 'Lucia Ferrara',
    email: 'lucia@osteriaporto.it',
    phone: '+39 081 456 7890',
    createdAt: '2025-11-05',
    menuItems: 18,
    ordersToday: 0,
    category: 'Osteria',
  },
];

const statusConfig = {
  published: { label: 'Pubblicato', variant: 'success' as const, icon: <CheckCircle size={12} /> },
  draft: { label: 'Bozza', variant: 'neutral' as const, icon: <Clock size={12} /> },
  suspended: { label: 'Sospeso', variant: 'warning' as const, icon: <PauseCircle size={12} /> },
};

export default function AdminRestaurantsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft' | 'suspended'>(
    'all'
  );
  const [restaurants, setRestaurants] = useState<Restaurant[]>(mockRestaurants);
  const [deleteTarget, setDeleteTarget] = useState<Restaurant | null>(null);

  useEffect(() => {
    // Restore sidebar state
    const stored = localStorage.getItem('iGO_sidebar_collapsed');
    if (stored !== null) {
      setSidebarCollapsed(JSON.parse(stored));
    }

    try {
      const saved = JSON.parse(localStorage.getItem('iGOdelivering_restaurants') || '[]') as Array<
        Record<string, unknown>
      >;
      if (saved.length > 0) {
        const normalized = saved.map((r) => ({
          ...r,
          menuItems: Array.isArray(r.menuItems)
            ? (r.menuItems as unknown[]).length
            : typeof r.menuItems === 'number'
              ? r.menuItems
              : 0,
        })) as Restaurant[];
        setRestaurants((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const newOnes = normalized.filter((r) => !existingIds.has(r.id));
          return [...prev, ...newOnes];
        });
      }
    } catch {}
  }, []);

  const handleToggleSuspend = (id: string) => {
    setRestaurants((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const newStatus = r.status === 'suspended' ? 'published' : 'suspended';
        return { ...r, status: newStatus };
      })
    );
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    setRestaurants((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const filtered = restaurants.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.city.toLowerCase().includes(search.toLowerCase()) ||
      r.owner.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        activeSection="nav-ristoranti"
        onSectionChange={() => {}}
        role="admin"
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Topbar */}
        <Topbar
          role="admin"
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMobileMenuOpen={() => setIsMobileOpen(true)}
          leftContent={
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground text-base">Admin</span>
              <span className="text-muted-foreground text-sm">/ Ristoranti</span>
            </div>
          }
        />

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-screen-xl mx-auto px-6 lg:px-8 py-6 space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Gestione Ristoranti</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {restaurants.length} ristoranti registrati
                </p>
              </div>
              <Link
                href="/admin/restaurants/new"
                className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#d43d22] transition-all duration-150 active:scale-95 shadow-sm"
              >
                <Plus size={16} />
                Aggiungi Ristorante
              </Link>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: 'Totale',
                  value: restaurants.length,
                  color: 'text-foreground',
                  bg: 'bg-card',
                },
                {
                  label: 'Pubblicati',
                  value: restaurants.filter((r) => r.status === 'published').length,
                  color: 'text-[var(--success)]',
                  bg: 'bg-[var(--success-bg)]',
                },
                {
                  label: 'Bozze',
                  value: restaurants.filter((r) => r.status === 'draft').length,
                  color: 'text-muted-foreground',
                  bg: 'bg-muted',
                },
                {
                  label: 'Sospesi',
                  value: restaurants.filter((r) => r.status === 'suspended').length,
                  color: 'text-[var(--warning)]',
                  bg: 'bg-[var(--warning-bg)]',
                },
              ].map((stat) => (
                <div
                  key={`stat-${stat.label}`}
                  className={`${stat.bg} rounded-xl border border-border p-4 shadow-card`}
                >
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  <p className={`text-2xl font-bold tabular-nums mt-1 ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 w-full sm:max-w-sm">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Cerca ristorante, città, proprietario..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-base bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex items-center gap-2">
                {(['all', 'published', 'draft', 'suspended'] as const).map((s) => (
                  <button
                    key={`filter-${s}`}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      filterStatus === s
                        ? 'bg-primary text-white'
                        : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {s === 'all'
                      ? 'Tutti'
                      : s === 'published'
                        ? 'Pubblicati'
                        : s === 'draft'
                          ? 'Bozze'
                          : 'Sospesi'}
                  </button>
                ))}
              </div>
            </div>

            {/* Table (Desktop) & Cards (Mobile) */}
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Ristorante
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                        Proprietario
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                        Città
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Stato
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                        Menu
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden xl:table-cell">
                        Ordini oggi
                      </th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Azioni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-sm text-muted-foreground">
                          Nessun ristorante trovato
                        </td>
                      </tr>
                    )}
                    {filtered.map((r) => {
                      const sc = statusConfig[r.status];
                      const isSuspended = r.status === 'suspended';
                      return (
                        <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                                <Store size={16} className="text-primary" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-foreground">{r.name}</p>
                                <p className="text-xs text-muted-foreground">{r.category}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <p className="text-sm text-foreground font-medium">{r.owner}</p>
                            <p className="text-xs text-muted-foreground">{r.email}</p>
                          </td>
                          <td className="px-5 py-4 hidden lg:table-cell">
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin size={12} />
                              {r.city}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                r.status === 'published'
                                  ? 'bg-[var(--success-bg)] text-[var(--success)]'
                                  : r.status === 'draft'
                                    ? 'bg-muted text-muted-foreground'
                                    : 'bg-[var(--warning-bg)] text-[var(--warning)]'
                              }`}
                            >
                              {sc.icon}
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-5 py-4 hidden lg:table-cell">
                            <span className="text-sm font-semibold tabular-nums text-foreground">
                              {r.menuItems}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">voci</span>
                          </td>
                          <td className="px-5 py-4 hidden xl:table-cell">
                            <span className="text-sm font-semibold tabular-nums text-foreground">
                              {r.ordersToday}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                href={`/menu/${slugify(r.name)}`}
                                target="_blank"
                                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                                title="Apri Vetrina"
                              >
                                <ExternalLink size={15} />
                              </Link>
                              <Link
                                href={`/admin/restaurants/${r.id}/configure`}
                                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Configura ristorante"
                              >
                                <Settings size={15} />
                              </Link>
                              <Link
                                href={`/admin/restaurants/${r.id}/access`}
                                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Gestisci accessi"
                              >
                                <Users size={15} />
                              </Link>
                              <button
                                onClick={() => handleToggleSuspend(r.id)}
                                className={`p-2 rounded-lg transition-colors ${
                                  isSuspended
                                    ? 'hover:bg-[var(--success-bg)] text-[var(--success)] hover:text-[var(--success)]'
                                    : 'hover:bg-[var(--warning-bg)] text-muted-foreground hover:text-[var(--warning)]'
                                }`}
                                title={isSuspended ? 'Riattiva ristorante' : 'Sospendi ristorante'}
                              >
                                {isSuspended ? (
                                  <PlayCircle size={15} />
                                ) : (
                                  <PauseOctagon size={15} />
                                )}
                              </button>
                              <button
                                onClick={() => setDeleteTarget(r)}
                                className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                                title="Elimina ristorante"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden divide-y divide-border">
                {filtered.length === 0 && (
                  <div className="py-16 text-center text-sm text-muted-foreground">
                    Nessun ristorante trovato
                  </div>
                )}
                {filtered.map((r) => {
                  const sc = statusConfig[r.status];
                  const isSuspended = r.status === 'suspended';
                  return (
                    <div key={r.id} className="p-4 space-y-3 hover:bg-muted/10 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                            <Store size={16} className="text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-foreground">{r.name}</h4>
                            <p className="text-xs text-muted-foreground">{r.category}</p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            r.status === 'published'
                              ? 'bg-[var(--success-bg)] text-[var(--success)]'
                              : r.status === 'draft'
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-[var(--warning-bg)] text-[var(--warning)]'
                          }`}
                        >
                          {sc.icon}
                          {sc.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-border/40 py-2">
                        <div>
                          <p className="text-muted-foreground mb-0.5">Proprietario</p>
                          <p className="font-medium text-foreground">{r.owner}</p>
                          <p className="text-muted-foreground text-[10px]">{r.email}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">Località</p>
                          <p className="font-medium text-foreground">{r.city}</p>
                        </div>
                        <div className="mt-1">
                          <p className="text-muted-foreground mb-0.5">Menu</p>
                          <p className="font-medium text-foreground">{r.menuItems} voci</p>
                        </div>
                        <div className="mt-1">
                          <p className="text-muted-foreground mb-0.5">Ordini Oggi</p>
                          <p className="font-medium text-foreground">{r.ordersToday}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <Link
                          href={`/menu/${slugify(r.name)}`}
                          target="_blank"
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors text-xs font-semibold border border-border/50"
                          title="Apri Vetrina"
                        >
                          <ExternalLink size={14} className="mr-1" />
                          Menu
                        </Link>
                        <Link
                          href={`/admin/restaurants/${r.id}/configure`}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/50"
                          title="Configura"
                        >
                          <Settings size={14} />
                        </Link>
                        <Link
                          href={`/admin/restaurants/${r.id}/access`}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/50"
                          title="Accessi"
                        >
                          <Users size={14} />
                        </Link>
                        <button
                          onClick={() => handleToggleSuspend(r.id)}
                          className={`p-1.5 rounded-lg transition-colors border border-border/50 ${
                            isSuspended
                              ? 'hover:bg-[var(--success-bg)] text-[var(--success)] hover:text-[var(--success)]'
                              : 'hover:bg-[var(--warning-bg)] text-muted-foreground hover:text-[var(--warning)]'
                          }`}
                          title={isSuspended ? 'Riattiva' : 'Sospendi'}
                        >
                          {isSuspended ? (
                            <PlayCircle size={14} />
                          ) : (
                            <PauseOctagon size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors border border-border/50"
                          title="Elimina"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-6 space-y-5">
            <button
              onClick={() => setDeleteTarget(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Elimina ristorante</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Sei sicuro di voler eliminare{' '}
                  <span className="font-semibold text-foreground">{deleteTarget.name}</span>? Questa
                  azione è irreversibile.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
