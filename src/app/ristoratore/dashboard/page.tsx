'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import KPIBentoGrid from '@/components/ristoratore/KPIBentoGrid';
import OrderHistoryTable from '@/components/ristoratore/OrderHistoryTable';
import { Search, Store } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const RevenueChart = dynamic(() => import('@/components/ristoratore/RevenueChart'), { ssr: false });

export default function RestaurantDashboardPage() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('nav-panoramica');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    // Restore sidebar state
    const stored = localStorage.getItem('iGO_sidebar_collapsed');
    if (stored !== null) {
      setSidebarCollapsed(JSON.parse(stored));
    }

    // Set dynamic date
    const formatted = new Date().toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    setCurrentDate(formatted.charAt(0).toUpperCase() + formatted.slice(1));
  }, []);

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        role="ristoratore"
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />
      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Topbar */}
        <Topbar
          role="ristoratore"
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMobileMenuOpen={() => setIsMobileOpen(true)}
          leftContent={
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <Store size={16} className="text-primary flex-shrink-0" />
              <span className="font-semibold text-foreground text-base truncate">
                {user?.restaurantName || 'Il tuo ristorante'}
              </span>
            </div>
          }
          rightExtra={
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Cerca..."
                className="pl-8 pr-3 py-2 text-base bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring w-48 placeholder:text-muted-foreground hidden md:block"
              />
            </div>
          }
        />

        {/* Content */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Bentornato, {user?.name || 'Utente'}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentDate || 'Caricamento data...'} ·{' '}
                  {user?.restaurantName || 'Il tuo ristorante'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Vai alla vetrina →
                </Link>
              </div>
            </div>

            {/* KPIs */}
            <KPIBentoGrid />

            {/* Revenue Chart + quick stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <RevenueChart />
              </div>
              <div className="flex flex-col gap-4">
                <div className="bg-card rounded-xl border border-border shadow-card p-5 flex-1">
                  <h4 className="text-sm font-semibold text-foreground mb-4">
                    Distribuzione Ordini
                  </h4>
                  <div className="space-y-3">
                    {[
                      { label: 'Consegna a domicilio', pct: 68, color: 'bg-primary' },
                      { label: 'Asporto', pct: 24, color: 'bg-accent' },
                      { label: 'Tavolo', pct: 8, color: 'bg-muted-foreground' },
                    ]?.map((row) => (
                      <div key={`dist-${row?.label}`}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{row?.label}</span>
                          <span className="font-semibold tabular-nums">{row?.pct}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${row?.color} rounded-full`}
                            style={{ width: `${row?.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-card rounded-xl border border-border shadow-card p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-3">Top Prodotti Oggi</h4>
                  <ul className="space-y-2">
                    {[
                      { name: 'Pizza Margherita', qty: 24, revenue: 228 },
                      { name: 'Tiramisù', qty: 18, revenue: 117 },
                      { name: 'Spaghetti Carbonara', qty: 15, revenue: 202 },
                      { name: 'Pizza Diavola', qty: 14, revenue: 154 },
                    ]?.map((p, i) => (
                      <li key={`top-${p?.name}`} className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-xs text-foreground flex-1 truncate">{p?.name}</span>
                        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                          {p?.qty}×
                        </span>
                        <span className="text-xs font-bold tabular-nums text-foreground">
                          €{p?.revenue}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Order History */}
            <OrderHistoryTable />
          </div>
        </main>
      </div>
    </div>
  );
}
