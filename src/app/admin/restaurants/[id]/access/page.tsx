'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import {
  ArrowLeft,
  Users,
  Key,
  Copy,
  CheckCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Shield,
  Mail,
  Lock,
  AlertTriangle,
  Trash2,
  Plus,
} from 'lucide-react';

interface AccessUser {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'manager' | 'staff';
  status: 'active' | 'suspended';
  lastLogin: string;
  createdAt: string;
  tempPassword?: string;
}

const mockUsers: AccessUser[] = [
  {
    id: 'u-001',
    name: 'Giuseppe Esposito',
    email: 'giuseppe@bellanapoli.it',
    role: 'owner',
    status: 'active',
    lastLogin: '2026-05-03 08:30',
    createdAt: '2026-01-15',
  },
  {
    id: 'u-002',
    name: 'Maria Esposito',
    email: 'maria@bellanapoli.it',
    role: 'manager',
    status: 'active',
    lastLogin: '2026-05-02 19:45',
    createdAt: '2026-02-01',
  },
];

const roleLabels: Record<string, string> = {
  owner: 'Proprietario',
  manager: 'Responsabile',
  staff: 'Staff',
};

const roleColors: Record<string, string> = {
  owner: 'bg-[var(--info-bg)] text-[var(--info)]',
  manager: 'bg-secondary text-primary',
  staff: 'bg-muted text-muted-foreground',
};

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      title="Copia"
    >
      {copied ? <CheckCircle size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
    </button>
  );
}

export default function RestaurantAccessPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [users, setUsers] = useState<AccessUser[]>(mockUsers);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'manager' as 'owner' | 'manager' | 'staff',
  });
  const [generatedCreds, setGeneratedCreds] = useState<{ email: string; password: string } | null>(
    null
  );

  const togglePassword = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    let pwd = '';
    for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
  };

  const resetPassword = (id: string) => {
    const pwd = generatePassword();
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, tempPassword: pwd } : u)));
  };

  const toggleSuspend = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u
      )
    );
  };

  const removeUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const addUser = () => {
    if (!newUser.name || !newUser.email) return;
    const pwd = generatePassword();
    const user: AccessUser = {
      id: `u-${Date.now()}`,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: 'active',
      lastLogin: '—',
      createdAt: new Date().toISOString().split('T')[0],
      tempPassword: pwd,
    };
    setUsers((prev) => [...prev, user]);
    setGeneratedCreds({ email: newUser.email, password: pwd });
    setNewUser({ name: '', email: '', role: 'manager' });
    setShowAddUser(false);
  };

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
            <div className="flex items-center gap-1.5 min-w-0">
              <Link
                href="/admin/restaurants"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium flex-shrink-0"
              >
                <ArrowLeft size={15} />
                <span className="hidden md:inline">Ristoranti</span>
              </Link>
              <span className="text-muted-foreground flex-shrink-0">/</span>
              <span className="text-sm font-semibold text-foreground truncate max-w-[80px] sm:max-w-[200px] md:max-w-none">
                Pizzeria Bella Napoli
              </span>
              <span className="text-muted-foreground flex-shrink-0 hidden sm:inline">/</span>
              <span className="text-sm text-muted-foreground hidden sm:inline flex-shrink-0">Accessi</span>
            </div>
          }
        />

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Gestione Accessi</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Pizzeria Bella Napoli · {users.length} utenti
                </p>
              </div>
              <button
                onClick={() => setShowAddUser(true)}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-hover transition-all active:scale-95"
              >
                <Plus size={16} />
                Aggiungi Utente
              </button>
            </div>

            {/* Generated credentials banner */}
            {generatedCreds && (
              <div className="bg-[var(--success-bg)] border border-[var(--success)]/30 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-[var(--success)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground mb-3">
                      Credenziali generate con successo
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Mail size={13} className="text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Email</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold text-foreground">
                            {generatedCreds.email}
                          </span>
                          <CopyBtn value={generatedCreds.email} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Lock size={13} className="text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Password temporanea</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-mono font-bold text-primary">
                            {generatedCreds.password}
                          </span>
                          <CopyBtn value={generatedCreds.password} />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Condividi queste credenziali con il ristoratore. Verrà richiesto di cambiare
                      la password al primo accesso.
                    </p>
                  </div>
                  <button
                    onClick={() => setGeneratedCreds(null)}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Add user form */}
            {showAddUser && (
              <div className="bg-card border-2 border-primary/30 rounded-xl p-5 space-y-4">
                <p className="text-sm font-semibold text-foreground">Nuovo Utente</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Nome completo *
                    </label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Mario Rossi"
                      className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                      placeholder="mario@ristorante.it"
                      className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Ruolo
                    </label>
                    <select
                      value={newUser.role}
                      onChange={(e) =>
                        setNewUser((p) => ({
                          ...p,
                          role: e.target.value as 'owner' | 'manager' | 'staff',
                        }))
                      }
                      className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="owner">Proprietario</option>
                      <option value="manager">Responsabile</option>
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={addUser}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-hover transition-all"
                  >
                    <Key size={14} />
                    Crea accesso e genera password
                  </button>
                  <button
                    onClick={() => setShowAddUser(false)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            )}

            {/* Users list */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <Users size={16} className="text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Utenti con accesso</span>
              </div>
              <div className="divide-y divide-border">
                {users.map((user) => (
                  <div key={user.id} className="px-5 py-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-bold text-sm">
                          {user.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">{user.name}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${roleColors[user.role]}`}
                          >
                            {roleLabels[user.role]}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              user.status === 'active'
                                ? 'bg-[var(--success-bg)] text-[var(--success)]'
                                : 'bg-[var(--warning-bg)] text-[var(--warning)]'
                            }`}
                          >
                            {user.status === 'active' ? 'Attivo' : 'Sospeso'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Ultimo accesso: {user.lastLogin}
                        </p>

                        {/* Temp password display */}
                        {user.tempPassword && (
                          <div className="mt-2 flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 w-fit">
                            <Lock size={12} className="text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Password temp.:</span>
                            <span className="text-xs font-mono font-bold text-primary">
                              {showPasswords[user.id] ? user.tempPassword : '••••••••••'}
                            </span>
                            <button
                              onClick={() => togglePassword(user.id)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {showPasswords[user.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            <CopyBtn value={user.tempPassword} />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => resetPassword(user.id)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Reimposta password"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={() => toggleSuspend(user.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.status === 'active'
                              ? 'hover:bg-[var(--warning-bg)] text-muted-foreground hover:text-[var(--warning)]'
                              : 'hover:bg-[var(--success-bg)] text-muted-foreground hover:text-[var(--success)]'
                          }`}
                          title={user.status === 'active' ? 'Sospendi accesso' : 'Riattiva accesso'}
                        >
                          <Shield size={14} />
                        </button>
                        <button
                          onClick={() => removeUser(user.id)}
                          className="p-2 rounded-lg hover:bg-[var(--danger-bg)] text-muted-foreground hover:text-[var(--danger)] transition-colors"
                          title="Rimuovi utente"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security note */}
            <div className="bg-[var(--info-bg)] border border-[var(--info)]/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={16} className="text-[var(--info)] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Le password temporanee scadono dopo il primo accesso. Il ristoratore dovrà impostare
                una nuova password sicura. Condividi le credenziali solo tramite canali sicuri.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
