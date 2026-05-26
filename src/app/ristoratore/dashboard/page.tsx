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
import { STORAGE_KEYS } from '@/lib/storage-keys';

const RevenueChart = dynamic(() => import('@/components/ristoratore/RevenueChart'), { ssr: false });

export default function RestaurantDashboardPage() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || 'r-001';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('nav-panoramica');
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    // Restore sidebar state
    const stored = localStorage.getItem('iGO_sidebar_collapsed');
    if (stored !== null) {
      setSidebarCollapsed(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const storedStr = localStorage.getItem(STORAGE_KEYS.orders(restaurantId));
        if (storedStr) {
          const parsed = JSON.parse(storedStr);
          if (Array.isArray(parsed)) {
            setOrders(parsed);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    handleUpdate();
    window.addEventListener('iGO_orders_updated', handleUpdate);
    return () => {
      window.removeEventListener('iGO_orders_updated', handleUpdate);
    };
  }, [restaurantId]);

  const stats = React.useMemo(() => {
    let deliveryCount = 0;
    let pickupCount = 0;
    let tableCount = 0;
    const productsMap: Record<string, { qty: number; revenue: number }> = {};

    orders.forEach((o) => {
      if (o.type === 'domicilio') deliveryCount++;
      else if (o.type === 'asporto') pickupCount++;
      else if (o.type === 'tavolo') tableCount++;

      if (Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          if (item.name) {
            const qty = item.qty || 1;
            const price = item.price || 0;
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
        { label: 'Consegna a domicilio', pct: orders.length ? deliveryPct : 68, color: 'bg-primary' },
        { label: 'Asporto', pct: orders.length ? pickupPct : 24, color: 'bg-accent' },
        { label: 'Tavolo', pct: orders.length ? tablePct : 8, color: 'bg-muted-foreground' },
      ],
      topProducts: topProducts.length ? topProducts : [
        { name: 'Pizza Margherita', qty: 24, revenue: 228 },
        { name: 'Tiramisù', qty: 18, revenue: 117 },
        { name: 'Spaghetti Carbonara', qty: 15, revenue: 202 },
        { name: 'Pizza Diavola', qty: 14, revenue: 154 },
      ],
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
                    {stats.topProducts.map((p, i) => (
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
            <OrderHistoryTable limit={5} />
          </div>
        </main>
      </div>
    </div>
  );
}
