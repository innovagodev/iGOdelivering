'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { supabase } from '@/lib/supabase';
import {
  Search,
  Key,
  ShieldAlert,
  CheckCircle,
  Clock,
  X,
  Copy,
  UserCheck,
  UserX,
  Plus,
  AlertCircle,
} from 'lucide-react';

interface RestorateurUser {
  id: string;
  name: string;
  email: string;
  restaurantName: string;
  status: 'active' | 'suspended' | 'pending';
  lastLogin: string;
}

export default function AdminUtentiPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'pending'>(
    'all'
  );
  const [users, setUsers] = useState<RestorateurUser[]>([]);
  const [resettingUser, setResettingUser] = useState<RestorateurUser | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);

  // States for manual account creation
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [restaurants, setRestaurants] = useState<{ id: string; name: string; owner_id: string | null }[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [newEmail, setNewEmail] = useState('');
  const [newTempPassword, setNewTempPassword] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);

  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const loadRestaurantsForSelect = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, owner_id')
        .order('name', { ascending: true });
      if (error) throw error;
      setRestaurants(data || []);
      if (data && data.length > 0) {
        const firstAvailable = data.find((r) => !r.owner_id) || data[0];
        setSelectedRestaurantId(firstAvailable?.id || '');
      }
    } catch (err) {
      console.error('Error loading restaurants for select:', err);
    }
  };

  const handleOpenCreateModal = () => {
    setNewOwnerName('');
    setSelectedRestaurantId('');
    setNewEmail('');
    setNewTempPassword(generateRandomPassword());
    setCreateError('');
    setCreateSuccess(false);
    loadRestaurantsForSelect();
    setIsCreateModalOpen(true);
  };

  const handleCreateRistoratore = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess(false);

    if (
      !newOwnerName.trim() ||
      !selectedRestaurantId ||
      !newEmail.trim() ||
      !newTempPassword.trim()
    ) {
      setCreateError('Tutti i campi sono obbligatori.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      setCreateError('Inserisci un indirizzo email valido.');
      return;
    }

    try {
      const res = await fetch('/api/admin/create-ristoratore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOwnerName.trim(),
          email: newEmail.trim(),
          restaurantId: selectedRestaurantId,
          password: newTempPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || 'Errore durante la creazione del ristoratore.');
        return;
      }

      // Add the new user to state
      const newUser: RestorateurUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        restaurantName: data.user.restaurantName,
        status: 'active', // matches published status
        lastLogin: 'Mai',
      };
      setUsers((prev) => [newUser, ...prev]);

      setCreateSuccess(true);
      setTimeout(() => {
        setIsCreateModalOpen(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setCreateError('Errore di rete durante la creazione del ristoratore.');
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, created_at, restaurants(id, name, status, email)')
        .eq('role', 'ristoratore');

      if (error) throw error;

      const mappedUsers: RestorateurUser[] = (data || []).map((p: any) => {
        const r = p.restaurants?.[0] || {};
        return {
          id: p.id,
          name: p.name || 'Gestore',
          email: r.email || '',
          restaurantName: r.name || 'Nessun ristorante',
          status:
            r.status === 'suspended'
              ? 'suspended'
              : r.status === 'published'
                ? 'active'
                : 'pending',
          lastLogin: 'Mai',
        };
      });

      setUsers(mappedUsers);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  useEffect(() => {
    // Restore sidebar state
    const storedSidebar = localStorage.getItem('iGO_sidebar_collapsed');
    if (storedSidebar !== null) {
      setSidebarCollapsed(JSON.parse(storedSidebar));
    }

    loadUsers();
  }, []);

  const handlePasswordReset = async (user: RestorateurUser) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, newPassword: pass }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Errore durante il reset della password');
        return;
      }

      setTempPassword(pass);
      setResettingUser(user);
      setCopied(false);
    } catch (err) {
      console.error(err);
      alert('Errore di rete durante il reset della password');
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleStatus = async (id: string, newStatus: 'active' | 'suspended') => {
    const targetStatus = newStatus === 'active' ? 'published' : 'suspended';

    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ status: targetStatus })
        .eq('owner_id', id);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== id) return u;
          return { ...u, status: newStatus };
        })
      );
    } catch (err) {
      console.error('Error toggling status:', err);
      alert("Errore durante l'aggiornamento dello stato del ristorante");
    }
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
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-foreground text-base flex-shrink-0">Admin</span>
              <span className="text-muted-foreground text-sm truncate">/ Utenti</span>
            </div>
          }
        />

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-screen-xl mx-auto px-6 lg:px-8 py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Gestione Ristoratori</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Visualizza e gestisci gli account dei ristoratori registrati sulla piattaforma.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-hover transition-all duration-150 active:scale-95 shadow-sm whitespace-nowrap"
              >
                <Plus size={16} />
                Aggiungi Ristoratore
              </button>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="relative flex-1 w-full sm:max-w-sm">
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

            {/* Table Users (Desktop) & Cards (Mobile) */}
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
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
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
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
                          <td className="px-5 py-4 hidden lg:table-cell">
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
                              ) : u.status === 'suspended' || u.status === 'pending' ? (
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

              {/* Mobile View */}
              <div className="md:hidden divide-y divide-border">
                {filteredUsers.length === 0 && (
                  <div className="py-16 text-center text-sm text-muted-foreground">
                    Nessun ristoratore trovato
                  </div>
                )}
                {filteredUsers.map((u) => {
                  return (
                    <div key={u.id} className="p-4 space-y-3 hover:bg-muted/10 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-sm text-foreground">{u.name}</h4>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
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
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-border/40 py-2">
                        <div>
                          <p className="text-muted-foreground mb-0.5">Ristorante Associato</p>
                          <p className="font-medium text-foreground">{u.restaurantName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">Ultimo Accesso</p>
                          <p className="font-medium text-foreground">{u.lastLogin}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        {u.status === 'active' ? (
                          <button
                            onClick={() => handleToggleStatus(u.id, 'suspended')}
                            className="p-1.5 rounded-lg hover:bg-[var(--warning-bg)] text-muted-foreground hover:text-[var(--warning)] transition-colors border border-border/50"
                            title="Sospendi Ristoratore"
                          >
                            <UserX size={14} />
                          </button>
                        ) : u.status === 'suspended' || u.status === 'pending' ? (
                          <button
                            onClick={() => handleToggleStatus(u.id, 'active')}
                            className="p-1.5 rounded-lg hover:bg-[var(--success-bg)] text-muted-foreground hover:text-[var(--success)] transition-colors border border-border/50"
                            title="Attiva Ristoratore"
                          >
                            <UserCheck size={14} />
                          </button>
                        ) : null}
                        <button
                          onClick={() => handlePasswordReset(u)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-secondary text-foreground hover:bg-muted rounded-lg transition-colors border border-border/50"
                          title="Resetta Password"
                        >
                          <Key size={13} className="text-muted-foreground" />
                          Reset Password
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

      {/* Aggiungi Ristoratore Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsCreateModalOpen(false)}
          />
          <form
            onSubmit={handleCreateRistoratore}
            className="relative bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0 text-primary">
                <Plus size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-foreground">Nuovo Ristoratore</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Crea un nuovo account ristoratore pulito e senza wizard precompilato.
                </p>
              </div>
            </div>

            {createSuccess && (
              <div className="bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-[var(--success)] shrink-0" />
                <p className="text-xs font-semibold text-foreground">
                  Ristoratore creato con successo!
                </p>
              </div>
            )}

            {createError && (
              <div className="bg-[var(--danger-bg)] border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-[var(--danger)]">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Nome Gestore (Proprietario)
                </label>
                <input
                  type="text"
                  required
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  placeholder="Es. Giuseppe Esposito"
                  className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Associa Ristorante
                </label>
                <select
                  required
                  value={selectedRestaurantId}
                  onChange={(e) => setSelectedRestaurantId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="" disabled>Seleziona un ristorante</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.owner_id ? '(Già gestito)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Email Ristoratore
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Es. giuseppe@bellanapoli.it"
                  className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Password Temporanea
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newTempPassword}
                    onChange={(e) => setNewTempPassword(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm bg-muted border border-border rounded-xl focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(newTempPassword).catch(() => {});
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="px-3 py-2 bg-secondary hover:bg-muted text-foreground border border-border rounded-xl text-xs font-semibold transition-colors"
                    title="Copia Password"
                  >
                    {copied ? 'Copiato' : 'Copia'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTempPassword(generateRandomPassword())}
                    className="px-3 py-2 bg-secondary hover:bg-muted text-foreground border border-border rounded-xl text-xs font-semibold transition-colors"
                    title="Rigenera Password"
                  >
                    Rigenera
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                  Al primo accesso al ristoratore verrà richiesto di cambiare questa password.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 bg-secondary hover:bg-muted text-foreground border border-border rounded-xl text-xs font-semibold transition-colors"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
              >
                Crea Account
              </button>
            </div>
          </form>
        </div>
      )}

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
                  Invia questa password temporanea al ristoratore.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
