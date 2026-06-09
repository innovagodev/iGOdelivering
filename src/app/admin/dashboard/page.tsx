'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { supabase } from '@/lib/supabase';
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
export default function AdminDashboardPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [stats, setStats] = useState({
    activeRestaurants: 0,
    todayOrders: 0,
    todayRevenue: 0,
    newRestaurants: 0,
    topRestaurants: [] as { name: string; ordini: number; ricavi: number }[],
    orderTrendData: [] as { name: string; ordini: number; ricavi: number }[],
    recentActivities: [] as { id: number; type: string; text: string; time: string; meta: string }[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore sidebar state
    const stored = localStorage.getItem('iGO_sidebar_collapsed');
    if (stored !== null) {
      setSidebarCollapsed(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    async function loadAdminDashboardData() {
      try {
        setLoading(true);

        const { data: dbRestaurants, error: restError } = await supabase
          .from('restaurants')
          .select('*')
          .order('created_at', { ascending: false });

        if (restError) throw restError;

        const { data: dbOrders, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (orderError) throw orderError;

        const restaurantsList = dbRestaurants || [];
        const ordersList = dbOrders || [];

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const activeCount = restaurantsList.filter((r) => r.status === 'published').length;

        const todayOrdersList = ordersList.filter((o) => new Date(o.created_at) >= startOfToday);
        const todayOrdersCount = todayOrdersList.length;

        const todayRevenueVal = todayOrdersList
          .filter((o) => o.status !== 'cancelled')
          .reduce((acc, o) => acc + Number(o.total || 0), 0);

        const newRestaurantsCount = restaurantsList.filter((r) => new Date(r.created_at) >= startOfMonth).length;

        const revenueMap: Record<string, { name: string; ordini: number; ricavi: number }> = {};
        restaurantsList.forEach((r) => {
          revenueMap[r.id] = { name: r.name, ordini: 0, ricavi: 0 };
        });

        ordersList.forEach((o) => {
          if (o.status === 'cancelled') return;
          if (revenueMap[o.restaurant_id]) {
            revenueMap[o.restaurant_id].ordini += 1;
            revenueMap[o.restaurant_id].ricavi += Number(o.total || 0);
          }
        });

        const sortedTop = Object.values(revenueMap)
          .filter((v) => v.ordini > 0)
          .sort((a, b) => b.ricavi - a.ricavi)
          .slice(0, 4);

        const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        const daysTrend: { dateStr: string; label: string; ordini: number; ricavi: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          daysTrend.push({
            dateStr: d.toDateString(),
            label: dayNames[d.getDay()],
            ordini: 0,
            ricavi: 0,
          });
        }

        ordersList.forEach((o) => {
          if (o.status === 'cancelled') return;
          const orderDate = new Date(o.created_at).toDateString();
          const dayObj = daysTrend.find((d) => d.dateStr === orderDate);
          if (dayObj) {
            dayObj.ricavi += Number(o.total || 0);
            dayObj.ordini += 1;
          }
        });

        const mappedTrend = daysTrend.map((d) => ({
          name: d.label,
          ordini: d.ordini,
          ricavi: Math.round(d.ricavi),
        }));

        const activities: any[] = [];
        restaurantsList.slice(0, 4).forEach((r, idx) => {
          const createdDate = new Date(r.created_at);
          activities.push({
            id: idx + 1,
            type: 'new_restaurant',
            text: `Nuovo ristorante "${r.name}" registrato con successo.`,
            time: getRelativeTime(createdDate),
            meta: r.city || 'Italia',
            date: createdDate,
          });
        });

        ordersList.slice(0, 4).forEach((o, idx) => {
          const createdDate = new Date(o.created_at);
          const rest = restaurantsList.find((r) => r.id === o.restaurant_id);
          activities.push({
            id: idx + 100,
            type: 'order',
            text: `Nuovo ordine registrato per "${rest?.name || 'Ristorante'}" di € ${Number(o.total).toFixed(2)}.`,
            time: getRelativeTime(createdDate),
            meta: o.type === 'domicilio' ? 'Domicilio' : (o.type === 'asporto' ? 'Asporto' : 'Tavolo'),
            date: createdDate,
          });
        });

        const sortedActivities = activities
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 4)
          .map((act, index) => ({
            id: index + 1,
            type: act.type,
            text: act.text,
            time: act.time,
            meta: act.meta,
          }));

        setStats({
          activeRestaurants: activeCount,
          todayOrders: todayOrdersCount,
          todayRevenue: todayRevenueVal,
          newRestaurants: newRestaurantsCount,
          topRestaurants: sortedTop,
          orderTrendData: mappedTrend,
          recentActivities: sortedActivities,
        });

      } catch (e) {
        console.error('Error loading admin dashboard stats:', e);
      } finally {
        setLoading(false);
      }
    }

    loadAdminDashboardData();
  }, []);

  function getRelativeTime(date: Date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' anni fa';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' mesi fa';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' giorni fa';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' ore fa';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' min fa';
    return 'Pochi sec fa';
  }

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
                className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-hover transition-all duration-150 active:scale-95 shadow-sm"
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
                  <p className="text-2xl font-bold text-foreground mt-1">{loading ? '...' : stats.activeRestaurants}</p>
                  <span className="text-xs text-[var(--success)] font-semibold flex items-center gap-1 mt-1">
                    <ArrowUpRight size={12} />
                    Aggiornato live
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
                  <p className="text-2xl font-bold text-foreground mt-1">{loading ? '...' : stats.todayOrders}</p>
                  <span className="text-xs text-[var(--success)] font-semibold flex items-center gap-1 mt-1">
                    <ArrowUpRight size={12} />
                    Ricevuti oggi
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
                  <p className="text-2xl font-bold text-foreground mt-1">€ {loading ? '...' : stats.todayRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <span className="text-xs text-[var(--success)] font-semibold flex items-center gap-1 mt-1">
                    <ArrowUpRight size={12} />
                    Stima fatturato
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
                  <p className="text-2xl font-bold text-foreground mt-1">{loading ? '...' : stats.newRestaurants}</p>
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
                      data={stats.orderTrendData}
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
                    Per fatturato totale
                  </p>
                </div>
                <div className="space-y-4">
                  {loading ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Caricamento...</p>
                  ) : stats.topRestaurants.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Nessun dato di vendita disponibile</p>
                  ) : (
                    stats.topRestaurants.map((restaurant, idx) => (
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
                        <p className="text-sm font-bold text-foreground">€ {restaurant.ricavi.toFixed(2)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Row: Recent Activities */}
            <div className="grid grid-cols-1 gap-6">
              {/* Recent Activity Feed */}
              <div className="bg-card rounded-xl border border-border p-5 shadow-card space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-primary" />
                    <h2 className="text-base font-bold text-foreground">Attività Recenti</h2>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {loading ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Caricamento...</p>
                  ) : stats.recentActivities.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Nessuna attività registrata</p>
                  ) : (
                    stats.recentActivities.map((act) => (
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
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
