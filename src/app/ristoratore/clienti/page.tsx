'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Users,
  Phone,
  Mail,
  Search,
  ArrowUpDown,
  Calendar,
  DollarSign,
  Download,
  AlertCircle,
  Store,
  ShoppingBag,
} from 'lucide-react';

interface CustomerSummary {
  key: string;
  name: string;
  email: string;
  phone: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderDate: string;
}

const months = [
  { value: 0, label: 'Gennaio' },
  { value: 1, label: 'Febbraio' },
  { value: 2, label: 'Marzo' },
  { value: 3, label: 'Aprile' },
  { value: 4, label: 'Maggio' },
  { value: 5, label: 'Giugno' },
  { value: 6, label: 'Luglio' },
  { value: 7, label: 'Agosto' },
  { value: 8, label: 'Settembre' },
  { value: 9, label: 'Ottobre' },
  { value: 10, label: 'Novembre' },
  { value: 11, label: 'Dicembre' },
];

export default function ClientiPage() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting states
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<'all' | '7days' | 'month' | 'year' | 'custom'>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<'name' | 'ordersCount' | 'totalSpent' | 'lastOrderDate'>('totalSpent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    // Restore sidebar state
    const stored = localStorage.getItem('iGO_sidebar_collapsed');
    if (stored !== null) {
      setSidebarCollapsed(JSON.parse(stored));
    }
  }, []);

  const fetchOrders = async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('created_at, type, customer_name, customer_email, customer_phone, total')
        .eq('restaurant_id', restaurantId);

      if (error) throw error;
      setOrders(data || []);
    } catch (e) {
      console.error('Error fetching orders for customers view:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [restaurantId]);

  // Extract available years dynamically from fetched orders
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear()); // Always ensure current year is present
    orders.forEach((o) => {
      const yr = new Date(o.created_at).getFullYear();
      if (!isNaN(yr)) years.add(yr);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [orders]);

  // Aggregate and filter customers
  const customersList = useMemo(() => {
    // 1. Filter orders by selected period
    const filteredOrders = orders.filter((o) => {
      const oDate = new Date(o.created_at);
      const today = new Date();

      if (period === 'month') {
        return (
          oDate.getMonth() === selectedMonth &&
          oDate.getFullYear() === selectedYear
        );
      }
      if (period === 'year') {
        return oDate.getFullYear() === selectedYear;
      }
      if (period === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        return oDate >= sevenDaysAgo;
      }
      if (period === 'custom') {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start && oDate < start) return false;
        if (end) {
          const adjustedEnd = new Date(end);
          adjustedEnd.setHours(23, 59, 59, 999);
          if (oDate > adjustedEnd) return false;
        }
        return true;
      }
      return true; // 'all'
    });

    // 2. Group orders by unique customer identifier
    const groups: { [key: string]: any[] } = {};
    filteredOrders.forEach((o) => {
      const email = o.customer_email ? o.customer_email.trim().toLowerCase() : '';
      const phone = o.customer_phone ? o.customer_phone.trim() : '';
      const name = o.customer_name ? o.customer_name.trim() : '';

      // Create unique grouping key: email is primary, then phone, then name
      let key = '';
      if (email && email !== 'tavolo@internal.it') {
        key = `email:${email}`;
      } else if (phone) {
        key = `phone:${phone}`;
      } else {
        key = `name:${name}`;
      }

      if (!key) return; // skip orders without any identifying info

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(o);
    });

    // 3. Map groups to customer summary objects
    return Object.keys(groups).map((key) => {
      const clientOrders = groups[key];
      // Sort client orders by date to get latest info
      const sortedClientOrders = [...clientOrders].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const latestOrder = sortedClientOrders[0];

      // Sum totals
      const totalSpent = clientOrders.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);

      // Find any non-internal email in the group
      let validEmail = '';
      for (const o of sortedClientOrders) {
        const e = o.customer_email?.trim();
        if (e && e.toLowerCase() !== 'tavolo@internal.it') {
          validEmail = e;
          break;
        }
      }

      // Find any non-empty phone in the group
      let validPhone = '';
      for (const o of sortedClientOrders) {
        if (o.customer_phone?.trim()) {
          validPhone = o.customer_phone.trim();
          break;
        }
      }

      // Strip internal bracketed comments like "(Tavolo 5)" from customer name if possible
      let cleanName = latestOrder.customer_name || 'Cliente';
      if (cleanName.includes('(Tavolo')) {
        cleanName = cleanName.split('(Tavolo')[0].trim();
      }

      return {
        key,
        name: cleanName,
        email: validEmail,
        phone: validPhone,
        ordersCount: clientOrders.length,
        totalSpent,
        lastOrderDate: latestOrder.created_at,
      };
    });
  }, [orders, period, startDate, endDate, selectedMonth, selectedYear]);

  // Apply search query, and sorting
  const processedCustomers = useMemo(() => {
    // Search filter
    let result = customersList;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q)
      );
    }

    // Sorting
    result.sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'name') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      } else if (sortField === 'lastOrderDate') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [customersList, searchQuery, sortField, sortDirection]);

  // Quick statistics
  const stats = useMemo(() => {
    const totalClients = processedCustomers.length;
    const totalSpentSum = processedCustomers.reduce((acc, curr) => acc + curr.totalSpent, 0);
    const totalOrders = processedCustomers.reduce((acc, curr) => acc + curr.ordersCount, 0);
    const avgSpent = totalClients > 0 ? totalSpentSum / totalClients : 0;
    const maxSpent = processedCustomers.reduce((max, curr) => (curr.totalSpent > max ? curr.totalSpent : max), 0);

    return {
      totalClients,
      avgSpent,
      maxSpent,
      totalSpentSum,
      totalOrders,
    };
  }, [processedCustomers]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    period !== 'month' ||
    selectedMonth !== new Date().getMonth() ||
    selectedYear !== new Date().getFullYear() ||
    startDate !== '' ||
    endDate !== '';

  // Handle column header sorting click
  const handleSort = (field: 'name' | 'ordersCount' | 'totalSpent' | 'lastOrderDate') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (processedCustomers.length === 0) return;

    // CSV headers
    const headers = ['Nome', 'Email', 'Telefono', 'Numero Ordini', 'Totale Speso (€)', 'Data Ultimo Ordine'];

    // Map data rows
    const rows = processedCustomers.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.email}"`,
      `"${c.phone}"`,
      c.ordersCount,
      c.totalSpent.toFixed(2),
      new Date(c.lastOrderDate).toLocaleDateString('it-IT')
    ]);

    // Construct CSV content
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    // Create blob and trigger download
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `database_clienti_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        activeSection="nav-clienti"
        onSectionChange={() => { }}
        role="ristoratore"
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
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

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-screen-xl mx-auto px-6 lg:px-8 py-6 space-y-6">

            {/* Header Title & Export Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Database Clienti</h1>
              </div>
              <button
                onClick={handleExportCSV}
                disabled={processedCustomers.length === 0}
                className="flex items-center justify-center gap-2 bg-primary disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors cursor-pointer w-full sm:w-auto"
              >
                <Download size={16} />
                Esporta CSV
              </button>
            </div>

            {/* Filters panel */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-4 shadow-card">
              {/* Controls row: Search Box & Period Selector with inline selectors */}
              <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
                {/* Search Box */}
                <div className="relative flex-1 max-w-md">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="text"
                    placeholder="Cerca cliente per nome, telefono o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>

                {/* Period quick tabs selector & inline dynamic fields */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center bg-muted p-1 rounded-lg overflow-x-auto whitespace-nowrap scrollbar-hide max-w-full">
                    {[
                      { id: 'all', label: 'Tutti' },
                      { id: '7days', label: '7gg' },
                      { id: 'month', label: 'Mese' },
                      { id: 'year', label: 'Anno' },
                      { id: 'custom', label: 'Personalizzato' },
                    ].map((pOpt) => (
                      <button
                        key={pOpt.id}
                        onClick={() => setPeriod(pOpt.id as any)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex-shrink-0 cursor-pointer ${period === pOpt.id
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        {pOpt.label}
                      </button>
                    ))}
                  </div>

                  {/* Inline selectors depending on period */}
                  {period === 'month' && (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="px-2.5 py-1.5 text-xs font-semibold bg-input border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring text-foreground cursor-pointer"
                      >
                        {months.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>

                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="px-2.5 py-1.5 text-xs font-semibold bg-input border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring text-foreground cursor-pointer"
                      >
                        {availableYears.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {period === 'year' && (
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-input border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring text-foreground cursor-pointer"
                    >
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  )}

                  {period === 'custom' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-2.5 py-1.5 text-xs font-semibold bg-input border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring text-foreground cursor-pointer"
                      />
                      <span className="text-muted-foreground text-xs font-bold">al</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-2.5 py-1.5 text-xs font-semibold bg-input border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring text-foreground cursor-pointer"
                      />
                    </div>
                  )}

                  {hasActiveFilters && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setPeriod('month');
                        setStartDate('');
                        setEndDate('');
                        setSelectedMonth(new Date().getMonth());
                        setSelectedYear(new Date().getFullYear());
                      }}
                      className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors px-2 py-1.5 rounded-lg hover:bg-primary/5 cursor-pointer flex-shrink-0"
                    >
                      Resetta Filtri
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Minimal Counters Bar */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground px-1 py-1">
              <div className="flex items-center gap-2">
                <span>Clienti:</span>
                <span className="font-extrabold text-foreground bg-muted px-2.5 py-1 rounded-lg tabular-nums">
                  {stats.totalClients}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>Ordini:</span>
                <span className="font-extrabold text-foreground bg-muted px-2.5 py-1 rounded-lg tabular-nums">
                  {stats.totalOrders}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>Spesa:</span>
                <span className="font-black text-primary bg-primary/5 border border-primary/10 px-2.5 py-1 rounded-lg tabular-nums">
                  € {stats.totalSpentSum.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Customers Data Presentation */}
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              {loading ? (
                <div className="py-16 text-center space-y-2">
                  <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
                  <p className="text-sm font-semibold text-muted-foreground">Caricamento clienti...</p>
                </div>
              ) : processedCustomers.length === 0 ? (
                <div className="py-16 text-center">
                  <AlertCircle size={36} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">
                    Nessun cliente trovato
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Nessun record corrisponde ai filtri impostati.
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop View: Clean Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/30 border-b border-border/80 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          <th
                            onClick={() => handleSort('name')}
                            className="px-6 py-4 cursor-pointer hover:bg-muted/50 select-none group"
                          >
                            <span className="flex items-center gap-1">
                              Cliente
                              <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                          </th>
                          <th className="px-6 py-4">Telefono & Email</th>
                          <th
                            onClick={() => handleSort('ordersCount')}
                            className="px-6 py-4 cursor-pointer hover:bg-muted/50 select-none group text-center"
                          >
                            <span className="flex items-center justify-center gap-1">
                              Ordini
                              <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                          </th>
                          <th
                            onClick={() => handleSort('totalSpent')}
                            className="px-6 py-4 cursor-pointer hover:bg-muted/50 select-none group text-right"
                          >
                            <span className="flex items-center justify-end gap-1">
                              Spesa Totale
                              <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                          </th>
                          <th
                            onClick={() => handleSort('lastOrderDate')}
                            className="px-6 py-4 cursor-pointer hover:bg-muted/50 select-none group text-right"
                          >
                            <span className="flex items-center justify-end gap-1">
                              Ultimo Ordine
                              <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {processedCustomers.map((customer) => (
                          <tr key={customer.key} className="hover:bg-muted/20 transition-colors">
                            <td className="px-6 py-4">
                              <span className="font-semibold text-foreground text-sm">
                                {customer.name}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs space-y-1">
                              {customer.phone && (
                                <p className="flex items-center gap-1.5 text-foreground/80">
                                  <Phone size={11} className="text-muted-foreground/60" />
                                  {customer.phone}
                                </p>
                              )}
                              {customer.email && customer.email !== 'tavolo@internal.it' && (
                                <p className="flex items-center gap-1.5 text-muted-foreground">
                                  <Mail size={11} className="text-muted-foreground/50" />
                                  {customer.email}
                                </p>
                              )}
                              {!customer.phone && !customer.email && (
                                <span className="text-muted-foreground/45 italic">Nessun contatto</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center font-extrabold text-foreground text-sm tabular-nums">
                              {customer.ordersCount}
                            </td>
                            <td className="px-6 py-4 text-right font-black text-primary text-sm tabular-nums">
                              € {customer.totalSpent.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-right text-xs text-muted-foreground tabular-nums">
                              {new Date(customer.lastOrderDate).toLocaleString('it-IT', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View: Highly Optimized Vertical List */}
                  <div className="md:hidden divide-y divide-border/80">
                    {processedCustomers.map((customer) => (
                      <div
                        key={customer.key}
                        className="p-4 flex justify-between items-center hover:bg-muted/10 active:bg-muted/20 transition-colors"
                      >
                        <div className="min-w-0 flex-1 pr-4 space-y-0.5">
                          <h3 className="font-bold text-foreground text-sm truncate">
                            {customer.name}
                          </h3>
                          <div className="text-[10px] text-muted-foreground space-y-0.5 min-w-0">
                            {customer.phone && (
                              <p className="flex items-center gap-1.5 truncate">
                                <Phone size={10} className="text-muted-foreground/60 flex-shrink-0" />
                                {customer.phone}
                              </p>
                            )}
                            {customer.email && customer.email !== 'tavolo@internal.it' && (
                              <p className="flex items-center gap-1.5 truncate">
                                <Mail size={10} className="text-muted-foreground/50 flex-shrink-0" />
                                <span className="truncate">{customer.email}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right side stats: count & spend */}
                        <div className="flex items-center gap-5 text-right flex-shrink-0">
                          <div>
                            <span className="block text-[9px] text-muted-foreground uppercase font-medium tracking-wider">
                              Ordini
                            </span>
                            <span className="text-sm font-extrabold text-foreground tabular-nums">
                              {customer.ordersCount}
                            </span>
                          </div>
                          <div className="min-w-[65px]">
                            <span className="block text-[9px] text-muted-foreground uppercase font-medium tracking-wider">
                              Spesa
                            </span>
                            <span className="text-sm font-black text-primary tabular-nums">
                              € {customer.totalSpent.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
