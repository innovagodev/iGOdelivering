'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import {
  Store,
  ShoppingBag,
  DollarSign,
  UserPlus,
  ArrowUpRight,
  Activity,
  ArrowRight,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

// recharts — tree-shaken via optimizePackageImports in next.config.mjs
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

// Mock data for the charts
const orderTrendData = [
  { name: 'Lun', ordini: 65, ricavi: 1200 },
  { name: 'Mar', ordini: 78, ricavi: 1450 },
  { name: 'Mer', ordini: 82, ricavi: 1600 },
  { name: 'Gio', ordini: 74, ricavi: 1380 },
  { name: 'Ven', ordini: 95, ricavi: 1980 },
  { name: 'Sab', ordini: 120, ricavi: 2500 },
  { name: 'Dom', ordini: 110, ricavi: 2200 },
];

const topRestaurants = [
  { name: 'Pizzeria Bella Napoli', ordini: 184, ricavi: 3680 },
  { name: 'Trattoria da Mario', ordini: 112, ricavi: 2240 },
  { name: 'Osteria del Porto', ordini: 95, ricavi: 1900 },
  { name: 'Sushi Zen', ordini: 87, ricavi: 2610 },
];

const recentActivities = [
  {
    id: 1,
    type: 'new_restaurant',
    text: 'Nuovo ristorante "Sushi Zen" registrato con successo.',
    time: '10 minuti fa',
    meta: 'Milano',
  },
  {
    id: 2,
    type: 'order',
    text: 'Pizzeria Bella Napoli ha registrato 18 ordini nelle ultime 3 ore.',
    time: '45 minuti fa',
    meta: 'Napoli',
  },
  {
    id: 3,
    type: 'status_change',
    text: "Osteria del Porto è stata sospesa dall'amministratore.",
    time: '2 ore fa',
    meta: 'Napoli',
  },
  {
    id: 4,
    type: 'new_restaurant',
    text: 'Nuovo ristorante "Trattoria da Mario" registrato con successo.',
    time: '1 giorno fa',
    meta: 'Roma',
  },
];

export default function AdminDashboardPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    // Restore sidebar state
    const stored = localStorage.getItem('iGO_sidebar_collapsed');
    if (stored !== null) {
      setSidebarCollapsed(JSON.parse(stored));
    }
  }, []);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        activeSection="nav-dashboard"
        onSectionChange={() => {}}
        role="admin"
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Topbar
          role="admin"
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMobileMenuOpen={() => setIsMobileOpen(true)}
          leftContent={
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground text-base">Admin</span>
              <span className="text-muted-foreground text-sm">/ Dashboard</span>
            </div>
          }
        />

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-screen-xl mx-auto px-6 lg:px-8 py-6 space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Panoramica globale e statistiche della piattaforma
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

            {/* KPIs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Active Restaurants */}
              <div className="bg-card rounded-xl border border-border p-4 shadow-card flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Ristoranti Attivi</p>
                  <p className="text-2xl font-bold text-foreground mt-1">24</p>
                  <span className="text-xs text-[var(--success)] font-semibold flex items-center gap-1 mt-1">
                    <ArrowUpRight size={12} />
                    +12% questo mese
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-primary">
                  <Store size={22} />
                </div>
              </div>

              {/* Card 2: Today's Orders */}
              <div className="bg-card rounded-xl border border-border p-4 shadow-card flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Ordini di Oggi</p>
                  <p className="text-2xl font-bold text-foreground mt-1">87</p>
                  <span className="text-xs text-[var(--success)] font-semibold flex items-center gap-1 mt-1">
                    <ArrowUpRight size={12} />
                    +8% rispetto a ieri
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <ShoppingBag size={22} />
                </div>
              </div>

              {/* Card 3: Today's Revenue */}
              <div className="bg-card rounded-xl border border-border p-4 shadow-card flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Ricavi di Oggi</p>
                  <p className="text-2xl font-bold text-foreground mt-1">€ 1.845,50</p>
                  <span className="text-xs text-[var(--success)] font-semibold flex items-center gap-1 mt-1">
                    <ArrowUpRight size={12} />
                    +15% rispetto a ieri
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[var(--success-bg)] flex items-center justify-center text-[var(--success)]">
                  <DollarSign size={22} />
                </div>
              </div>

              {/* Card 4: New Restaurants */}
              <div className="bg-card rounded-xl border border-border p-4 shadow-card flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Nuovi Ristoranti</p>
                  <p className="text-2xl font-bold text-foreground mt-1">5</p>
                  <span className="text-xs text-muted-foreground font-medium mt-1 block">
                    Questo mese
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                  <UserPlus size={22} />
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Order and Revenue Chart */}
              <div className="bg-card rounded-xl border border-border p-5 shadow-card lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      Andamento Ordini & Ricavi
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Statistiche dell&apos;ultima settimana
                    </p>
                  </div>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={orderTrendData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorOrdini" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="name"
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          borderColor: 'var(--border)',
                          borderRadius: '8px',
                          color: 'var(--foreground)',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="ordini"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorOrdini)"
                        name="Ordini"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Performing Restaurants */}
              <div className="bg-card rounded-xl border border-border p-5 shadow-card space-y-4">
                <div>
                  <h2 className="text-base font-bold text-foreground">Top Ristoranti</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Per fatturato questa settimana
                  </p>
                </div>
                <div className="space-y-4">
                  {topRestaurants.map((restaurant, idx) => (
                    <div key={restaurant.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-bold text-xs text-foreground">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{restaurant.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {restaurant.ordini} ordini
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-foreground">€ {restaurant.ricavi}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Row: Recent Activities and Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity Feed */}
              <div className="bg-card rounded-xl border border-border p-5 shadow-card lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-primary" />
                    <h2 className="text-base font-bold text-foreground">Attività Recenti</h2>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {recentActivities.map((act) => (
                    <div
                      key={act.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <p className="text-sm text-foreground leading-relaxed">{act.text}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{act.time}</span>
                          <span>•</span>
                          <span>{act.meta}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Info / Quick Settings Redirect */}
              <div className="bg-card rounded-xl border border-border p-5 shadow-card flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h2 className="text-base font-bold text-foreground">Gestione Piattaforma</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Puoi gestire e configurare i parametri globali della piattaforma come
                    commissioni, slogan promozionali e contatti di supporto.
                  </p>
                </div>
                <Link
                  href="/admin/impostazioni"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-secondary text-foreground hover:bg-muted text-sm font-semibold rounded-xl transition-colors"
                >
                  Impostazioni Globali
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
