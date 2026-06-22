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
import { useOrders } from '@/hooks/useOrders';

const RevenueChart = dynamic(() => import('@/components/ristoratore/RevenueChart'), { ssr: false });

export default function RestaurantDashboardPage() {
  const { user, isLoading } = useAuth();
  const restaurantId = user?.restaurantId || '';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('nav-panoramica');

  const { orders, loading } = useOrders(restaurantId);

  useEffect(() => {
    // Restore sidebar state
    const stored = localStorage.getItem('iGO_sidebar_collapsed');
    if (stored !== null) {
      setSidebarCollapsed(JSON.parse(stored));
    }
  }, []);

  const stats = React.useMemo(() => {
    let deliveryCount = 0;
    let pickupCount = 0;
    let tableCount = 0;
    const productsMap: Record<string, { qty: number; revenue: number }> = {};

    orders.forEach((o) => {
      if (o.type === 'domicilio') deliveryCount++;
      else if (o.type === 'asporto') pickupCount++;
      else if (o.type === 'tavolo') tableCount++;

      const items = o.order_items || o.items || [];
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          if (item.name) {
            const qty = item.qty || 1;
            const price = Number(item.price) || 0;
            if (!productsMap[item.name]) {
              productsMap[item.name] = { qty: 0, revenue: 0 };
            }
            productsMap[item.name].qty += qty;
            productsMap[item.name].revenue += qty * price;
          }
        });
      }
    });

    const totalCount = orders.length || 1;
    const deliveryPct = Math.round((deliveryCount / totalCount) * 100);
    const pickupPct = Math.round((pickupCount / totalCount) * 100);
    const tablePct = Math.max(0, 100 - deliveryPct - pickupPct);

    const topProducts = Object.entries(productsMap)
      .map(([name, val]) => ({ name, qty: val.qty, revenue: Math.round(val.revenue) }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 4);

    return {
      distribution: [
        {
          label: 'Consegna a domicilio',
          pct: orders.length ? deliveryPct : 0,
          color: 'bg-primary',
        },
        { label: 'Asporto', pct: orders.length ? pickupPct : 0, color: 'bg-accent' },
        { label: 'Tavolo', pct: orders.length ? tablePct : 0, color: 'bg-muted-foreground' },
      ],
      topProducts: topProducts,
    };
  }, [orders]);

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
        />

        {/* Content */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 space-y-6">
            {isLoading || loading ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground text-sm font-medium animate-pulse">Caricamento panoramica in corso...</p>
              </div>
            ) : !restaurantId || restaurantId === 'r-001' ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-card border border-border rounded-2xl shadow-sm">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
                  <Store size={32} />
                </div>
                <h2 className="text-xl font-bold text-foreground">Nessun Ristorante Collegato</h2>
                <p className="text-muted-foreground text-sm max-w-md mt-2">
                  Il tuo account non è ancora collegato a un ristorante attivo. Contatta l'amministratore per completare la configurazione e l'attivazione del tuo profilo.
                </p>
              </div>
            ) : (
              <>
                {/* Page header */}
                <div className="flex items-center justify-between col-span-full">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">
                      Bentornato, {user?.name || 'Utente'}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      {user?.restaurantName || 'Il tuo ristorante'}
                    </p>
                  </div>
                </div>

                {/* KPIs */}
                <KPIBentoGrid orders={orders} loading={loading} />

                {/* Revenue Chart + quick stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <RevenueChart orders={orders} />
              </div>
              <div className="flex flex-col gap-4">
                <div className="bg-card rounded-xl border border-border shadow-card p-5 flex-1">
                  <h4 className="text-sm font-semibold text-foreground mb-4">
                    Distribuzione Ordini
                  </h4>
                  <div className="space-y-4">
                    {stats.distribution.map((row) => (
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
                    {stats.topProducts.length === 0 ? (
                      <li className="text-xs text-muted-foreground text-center py-4">
                        Nessun prodotto venduto
                      </li>
                    ) : (
                      stats.topProducts.map((p, i) => (
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
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </div>

                {/* Order History */}
                <OrderHistoryTable orders={orders} loading={loading} limit={5} />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
