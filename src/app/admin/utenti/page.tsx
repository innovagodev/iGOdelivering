'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import {
  Users,
  Search,
  Key,
  ShieldAlert,
  CheckCircle,
  Clock,
  X,
  Copy,
  UserCheck,
  UserX,
} from 'lucide-react';

interface RestorateurUser {
  id: string;
  name: string;
  email: string;
  restaurantName: string;
  status: 'active' | 'suspended' | 'pending';
  lastLogin: string;
}

const mockUsers: RestorateurUser[] = [
  {
    id: 'u-1',
    name: 'Giuseppe Esposito',
    email: 'giuseppe@bellanapoli.it',
    restaurantName: 'Pizzeria Bella Napoli',
    status: 'active',
    lastLogin: 'Oggi, 10:15',
  },
  {
    id: 'u-2',
    name: 'Mario Rossi',
    email: 'mario@trattoriamario.it',
    restaurantName: 'Trattoria da Mario',
    status: 'active',
    lastLogin: 'Ieri, 18:30',
  },
  {
    id: 'u-3',
    name: 'Kenji Tanaka',
    email: 'kenji@sushizen.it',
    restaurantName: 'Sushi Zen',
    status: 'pending',
    lastLogin: 'Mai',
  },
  {
    id: 'u-4',
    name: 'Lucia Ferrara',
    email: 'lucia@osteriaporto.it',
    restaurantName: 'Osteria del Porto',
    status: 'suspended',
    lastLogin: '3 giorni fa',
  },
];

export default function AdminUtentiPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'pending'>(
    'all'
  );
  const [users, setUsers] = useState<RestorateurUser[]>(mockUsers);
  const [resettingUser, setResettingUser] = useState<RestorateurUser | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Restore sidebar state
    const stored = localStorage.getItem('iGO_sidebar_collapsed');
    if (stored !== null) {
      setSidebarCollapsed(JSON.parse(stored));
    }
  }, []);

  const handlePasswordReset = (user: RestorateurUser) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTempPassword(pass);
    setResettingUser(user);
    setCopied(false);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleStatus = (id: string, newStatus: 'active' | 'suspended') => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        return { ...u, status: newStatus };
      })
    );
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.restaurantName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        activeSection="nav-utenti"
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
              <span className="text-muted-foreground text-sm">/ Utenti</span>
            </div>
          }
        />

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-screen-xl mx-auto px-6 lg:px-8 py-6 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gestione Ristoratori</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Visualizza e gestisci gli account dei ristoratori registrati sulla piattaforma.
              </p>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm w-full">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Cerca ristoratore, email, ristorante..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-base bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                {(['all', 'active', 'pending', 'suspended'] as const).map((s) => (
                  <button
                    key={`filter-${s}`}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      statusFilter === s
                        ? 'bg-primary text-white'
                        : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {s === 'all'
                      ? 'Tutti'
                      : s === 'active'
                        ? 'Attivi'
                        : s === 'pending'
                          ? 'In Attesa'
                          : 'Sospesi'}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Users */}
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Ristoratore
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Ristorante Associato
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Stato
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                        Ultimo Accesso
                      </th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Azioni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                          Nessun ristoratore trovato
                        </td>
                      </tr>
                    )}
                    {filteredUsers.map((u) => {
                      return (
                        <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-4">
                            <div>
                              <p className="font-semibold text-sm text-foreground">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm font-medium text-foreground">
                              {u.restaurantName}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                u.status === 'active'
                                  ? 'bg-[var(--success-bg)] text-[var(--success)]'
                                  : u.status === 'pending'
                                    ? 'bg-muted text-muted-foreground'
                                    : 'bg-[var(--warning-bg)] text-[var(--warning)]'
                              }`}
                            >
                              {u.status === 'active' ? (
                                <CheckCircle size={12} />
                              ) : u.status === 'pending' ? (
                                <Clock size={12} />
                              ) : (
                                <ShieldAlert size={12} />
                              )}
                              {u.status === 'active'
                                ? 'Attivo'
                                : u.status === 'pending'
                                  ? 'In Attesa'
                                  : 'Sospeso'}
                            </span>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <span className="text-xs text-muted-foreground">{u.lastLogin}</span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {u.status === 'active' ? (
                                <button
                                  onClick={() => handleToggleStatus(u.id, 'suspended')}
                                  className="p-2 rounded-lg hover:bg-[var(--warning-bg)] text-muted-foreground hover:text-[var(--warning)] transition-colors"
                                  title="Sospendi Ristoratore"
                                >
                                  <UserX size={15} />
                                </button>
                              ) : u.status === 'suspended' ? (
                                <button
                                  onClick={() => handleToggleStatus(u.id, 'active')}
                                  className="p-2 rounded-lg hover:bg-[var(--success-bg)] text-muted-foreground hover:text-[var(--success)] transition-colors"
                                  title="Attiva Ristoratore"
                                >
                                  <UserCheck size={15} />
                                </button>
                              ) : null}
                              <button
                                onClick={() => handlePasswordReset(u)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-secondary text-foreground hover:bg-muted rounded-lg transition-colors border border-border"
                                title="Resetta Password"
                              >
                                <Key size={13} className="text-muted-foreground" />
                                Reset Password
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Password Reset Modal */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setResettingUser(null)}
          />
          <div className="relative bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-6 space-y-5">
            <button
              onClick={() => setResettingUser(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0 text-primary">
                <Key size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-foreground">Password Resettata</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  La password per{' '}
                  <span className="font-semibold text-foreground">{resettingUser.name}</span> (
                  {resettingUser.email}) è stata rigenerata con successo.
                </p>
                <div className="mt-4 p-3 bg-muted rounded-xl flex items-center justify-between border border-border">
                  <span className="font-mono text-sm font-semibold select-all text-foreground">
                    {tempPassword}
                  </span>
                  <button
                    onClick={handleCopyPassword}
                    className="p-1.5 hover:bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    title="Copia Password"
                  >
                    {copied ? (
                      <span className="text-xs text-[var(--success)] font-semibold">Copiato!</span>
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                  Invia questa password temporanea al ristoratore. Al primo accesso gli verrà
                  richiesto di modificarla.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end pt-1">
              <button
                onClick={() => setResettingUser(null)}
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-[#d43d22] transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
