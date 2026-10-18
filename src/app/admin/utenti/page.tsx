'use client';

import React, { useState, useEffect } from 'react';
import PageTopbar from '@/components/layout/PageTopbar';
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
  Edit2,
  Trash2,
  Send,
  Link2,
  ExternalLink,
} from 'lucide-react';
import { notify } from '@/lib/notify';
import { romeDay } from '@/lib/dashboardStats';
import { IDLE_DAYS, type AccountState, type AdminUserRow } from '@/lib/adminUsers';

type RestorateurUser = AdminUserRow;

type UserFilter = 'all' | 'active' | 'invited' | 'never' | 'idle' | 'suspended' | 'pending';

const FILTER_LABEL: Record<UserFilter, string> = {
  all: 'Tutti',
  active: 'Attivi',
  invited: 'Da attivare',
  never: 'Mai entrati',
  idle: `Senza ordini da ${IDLE_DAYS} gg`,
  suspended: 'Sospesi',
  pending: 'In bozza',
};

const ACCOUNT_LABEL: Record<AccountState, string> = {
  active: 'Attivo',
  suspended: 'Sospeso',
  pending: 'In bozza',
  invited: 'Invitato',
  invite_expired: 'Invito scaduto',
};

const isInvite = (a: AccountState) => a === 'invited' || a === 'invite_expired';

const NOW_DAY = () => romeDay(new Date());
const daysBetween = (fromDay: string, toDay: string) =>
  Math.round((Date.parse(toDay) - Date.parse(fromDay)) / 86_400_000);

/** Giorni (di Roma) trascorsi da un istante; null se l'istante manca. */
const daysAgo = (iso: string | null) => (iso ? daysBetween(romeDay(iso), NOW_DAY()) : null);

const relativeDays = (n: number) =>
  n <= 0 ? 'oggi' : n === 1 ? 'ieri' : `${n} giorni fa`;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('it-IT', {
    timeZone: 'Europe/Rome',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Ristorante attivo che non riceve ordini da IDLE_DAYS giorni (o mai, nella finestra letta). */
const isIdle = (u: RestorateurUser) => {
  if (u.account !== 'active') return false;
  const d = daysAgo(u.lastOrderAt);
  return d === null || d >= IDLE_DAYS;
};

/** Titolare con account attivato che non ha mai fatto login. */
const isNeverLoggedIn = (u: RestorateurUser) => !!u.userId && u.lastLogin === null;

const matchesFilter = (u: RestorateurUser, f: UserFilter) => {
  switch (f) {
    case 'all':
      return true;
    case 'invited':
      return isInvite(u.account);
    case 'never':
      return isNeverLoggedIn(u);
    case 'idle':
      return isIdle(u);
    default:
      return u.account === f;
  }
};

export default function AdminUtentiPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserFilter>('all');
  const [users, setUsers] = useState<RestorateurUser[]>([]);
  const [loadError, setLoadError] = useState('');
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null);
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

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<RestorateurUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<RestorateurUser | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  // Edit Handlers
  const handleOpenEditModal = (user: RestorateurUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword('');
    setEditError('');
    setEditSuccess(false);
    setIsEditModalOpen(true);
  };

  const handleUpdateRistoratore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError('');
    setEditSuccess(false);

    try {
      const res = await fetch('/api/admin/update-ristoratore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          name: editName.trim(),
          email: editEmail.trim(),
          password: editPassword ? editPassword : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Errore durante l'aggiornamento.");
        return;
      }

      setEditSuccess(true);
      
      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, name: editName.trim(), email: editEmail.trim() }
            : u
        )
      );

      setTimeout(() => {
        setIsEditModalOpen(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setEditError('Errore di rete durante il salvataggio.');
    }
  };

  // Delete Handlers
  const handleOpenDeleteModal = (user: RestorateurUser) => {
    setDeletingUser(user);
    setDeleteError('');
    setDeleteSuccess(false);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteRistoratore = async () => {
    if (!deletingUser) return;
    setDeleteError('');
    setDeleteSuccess(false);

    try {
      const res = await fetch('/api/admin/delete-ristoratore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deletingUser.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Errore durante l'eliminazione.");
        return;
      }

      setDeleteSuccess(true);
      
      // Update local state
      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));

      setTimeout(() => {
        setIsDeleteModalOpen(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setDeleteError("Errore di rete durante l'eliminazione.");
    }
  };

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
        userId: data.user.id,
        name: data.user.name,
        email: data.user.email,
        restaurantId: data.user.restaurantId ?? null,
        restaurantName: data.user.restaurantName,
        slug: data.user.slug ?? null,
        account: 'active', // matches published status
        lastLogin: null,
        lastOrderAt: null,
        orders30: 0,
      };
      // Se il ristorante era in attesa di attivazione, la riga "invitato" non ha più senso.
      setUsers((prev) => [
        newUser,
        ...prev.filter((u) => !(u.userId === null && u.restaurantId === newUser.restaurantId)),
      ]);

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
      // L'elenco è costruito dal server: include i ristoranti invitati che non hanno
      // ancora un profilo, e legge ultimo accesso e ordini con la service role.
      const res = await fetch('/api/admin/utenti', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Errore ${res.status}`);

      setUsers(data.users || []);
      setLoadError('');
    } catch (err: any) {
      console.error('Error loading users:', err);
      setLoadError(err?.message || 'Impossibile caricare i ristoratori.');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  /**
   * Genera un nuovo link e rimanda la mail di attivazione. Come per la copia del
   * link, ogni invio ruota il token: i link inviati prima smettono di funzionare.
   */
  const handleResendInvite = async (u: RestorateurUser) => {
    if (!u.restaurantId || busyInviteId) return;
    setBusyInviteId(u.id);
    try {
      const res = await fetch('/api/admin/send-activation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: u.restaurantId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify.error(data.error || "Impossibile inviare l'email di attivazione.");
        return;
      }
      if (data.mocked) {
        notify.error(
          'Email NON inviata: il servizio di posta non è configurato sul server (RESEND_API_KEY).'
        );
        return;
      }
      notify.success(`Invito inviato a ${u.email}. I link precedenti non sono più validi.`);
      loadUsers();
    } catch (err) {
      console.error('Error resending invite:', err);
      notify.error("Impossibile inviare l'email di attivazione.");
    } finally {
      setBusyInviteId(null);
    }
  };

  const handleCopyInviteLink = async (u: RestorateurUser) => {
    if (!u.restaurantId || busyInviteId) return;
    setBusyInviteId(u.id);
    try {
      const res = await fetch('/api/admin/activation-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: u.restaurantId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.activationLink) {
        notify.error(data.error || 'Impossibile generare il link di attivazione.');
        return;
      }
      await navigator.clipboard.writeText(data.activationLink);
      notify.success('Nuovo link copiato. I link precedenti non sono più validi.');
      loadUsers();
    } catch (err) {
      console.error('Error copying invite link:', err);
      notify.error('Impossibile generare il link di attivazione.');
    } finally {
      setBusyInviteId(null);
    }
  };

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
        notify.error(data.error || 'Errore durante il reset della password');
        return;
      }

      setTempPassword(pass);
      setResettingUser(user);
      setCopied(false);
    } catch (err) {
      console.error(err);
      notify.error('Errore di rete durante il reset della password');
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
          return { ...u, account: newStatus };
        })
      );
    } catch (err) {
      console.error('Error toggling status:', err);
      notify.error("Errore durante l'aggiornamento dello stato del ristorante");
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.restaurantName.toLowerCase().includes(search.toLowerCase());
    return matchSearch && matchesFilter(u, statusFilter);
  });

  const filterCount = (f: UserFilter) => users.filter((u) => matchesFilter(u, f)).length;

  const badgeClass = (a: AccountState) =>
    a === 'active'
      ? 'bg-[var(--success-bg)] text-[var(--success)]'
      : a === 'suspended' || a === 'invite_expired'
        ? 'bg-[var(--warning-bg)] text-[var(--warning)]'
        : 'bg-muted text-muted-foreground';

  const renderBadge = (u: RestorateurUser) => (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass(u.account)}`}
    >
      {u.account === 'active' ? (
        <CheckCircle size={12} />
      ) : u.account === 'suspended' || u.account === 'invite_expired' ? (
        <ShieldAlert size={12} />
      ) : (
        <Clock size={12} />
      )}
      {ACCOUNT_LABEL[u.account]}
    </span>
  );

  /** Ultimo login: "Mai" solo per chi ha un account; chi non l'ha attivato non ha accessi. */
  const renderLastLogin = (u: RestorateurUser) => {
    if (!u.userId) return <span className="text-muted-foreground">—</span>;
    if (!u.lastLogin) return <span>Mai</span>;
    const d = daysAgo(u.lastLogin);
    return (
      <span title={formatDateTime(u.lastLogin)}>
        {formatDateTime(u.lastLogin)}
        {d !== null && <span className="block text-muted-foreground">{relativeDays(d)}</span>}
      </span>
    );
  };

  /** Ultimo ordine e ordini degli ultimi 30 giorni. Vale per i ristoranti attivi. */
  const renderLastOrder = (u: RestorateurUser) => {
    if (!u.userId || u.account === 'pending') return <span className="text-muted-foreground">—</span>;
    if (!u.lastOrderAt) {
      return <span className={isIdle(u) ? 'text-[var(--warning)]' : ''}>Nessuno (90 gg)</span>;
    }
    const d = daysAgo(u.lastOrderAt)!;
    return (
      <span title={formatDateTime(u.lastOrderAt)}>
        {relativeDays(d)}
        <span className="block text-muted-foreground">
          {u.orders30} {u.orders30 === 1 ? 'ordine' : 'ordini'} in 30 gg
        </span>
      </span>
    );
  };

  type RowAction = {
    key: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    tone?: 'default' | 'primary' | 'warning' | 'success' | 'danger';
    disabled?: boolean;
  };

  const TONE_CLASS: Record<NonNullable<RowAction['tone']>, string> = {
    default: 'text-muted-foreground hover:bg-muted hover:text-foreground',
    primary: 'text-primary border-primary/30 bg-primary/5 hover:bg-primary/10',
    warning: 'text-muted-foreground hover:bg-[var(--warning-bg)] hover:text-[var(--warning)]',
    success: 'text-muted-foreground hover:bg-[var(--success-bg)] hover:text-[var(--success)]',
    danger: 'text-muted-foreground hover:bg-red-500/10 hover:text-red-600',
  };

  /** Azioni di riga: cambiano se l'account esiste già o è ancora in attesa di attivazione. */
  const rowActions = (u: RestorateurUser): RowAction[] => {
    if (!u.userId) {
      const busy = busyInviteId === u.id;
      return [
        {
          key: 'link',
          label: 'Copia link',
          icon: <Link2 size={15} />,
          onClick: () => handleCopyInviteLink(u),
          disabled: busy,
        },
        {
          key: 'resend',
          label: busy ? 'Invio…' : 'Reinvia invito',
          icon: <Send size={15} />,
          onClick: () => handleResendInvite(u),
          tone: 'primary',
          disabled: busy,
        },
      ];
    }
    return [
      u.account === 'active'
        ? {
            key: 'suspend',
            label: 'Sospendi',
            icon: <UserX size={15} />,
            onClick: () => handleToggleStatus(u.id, 'suspended'),
            tone: 'warning',
          }
        : {
            key: 'activate',
            label: 'Attiva',
            icon: <UserCheck size={15} />,
            onClick: () => handleToggleStatus(u.id, 'active'),
            tone: 'success',
          },
      {
        key: 'edit',
        label: 'Modifica',
        icon: <Edit2 size={15} />,
        onClick: () => handleOpenEditModal(u),
      },
      {
        key: 'reset',
        label: 'Reset password',
        icon: <Key size={15} />,
        onClick: () => handlePasswordReset(u),
      },
      {
        key: 'delete',
        label: 'Elimina',
        icon: <Trash2 size={15} />,
        onClick: () => handleOpenDeleteModal(u),
        tone: 'danger',
      },
    ];
  };

  /** Tabella: solo icone, tutte della stessa misura. Schede: icona con etichetta. */
  const renderActions = (u: RestorateurUser, variant: 'table' | 'card') => {
    const actions = rowActions(u);
    if (variant === 'table') {
      return (
        <div className="flex items-center justify-end gap-1.5">
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={a.onClick}
              disabled={a.disabled}
              title={a.label}
              aria-label={a.label}
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 transition-colors disabled:opacity-50 ${TONE_CLASS[a.tone ?? 'default']}`}
            >
              {a.icon}
            </button>
          ))}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={a.onClick}
            disabled={a.disabled}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border/60 px-3 text-xs font-semibold transition-colors disabled:opacity-50 ${TONE_CLASS[a.tone ?? 'default']}`}
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>
    );
  };

  /** Nome del ristorante; per i ristoranti attivi è il link alla vetrina pubblica. */
  const renderRestaurant = (u: RestorateurUser) =>
    u.slug && u.account === 'active' ? (
      <a
        href={`/menu/${encodeURIComponent(u.slug)}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Apri la vetrina"
        className="inline-flex max-w-full items-center gap-1 font-medium text-foreground hover:text-primary hover:underline underline-offset-2"
      >
        <span className="truncate">{u.restaurantName}</span>
        <ExternalLink size={12} className="shrink-0 text-muted-foreground" />
      </a>
    ) : (
      <span className="block truncate font-medium text-foreground">{u.restaurantName}</span>
    );

  const ownerName = (u: RestorateurUser) => (u.userId ? u.name : 'In attesa di registrazione');

  return (
    <div className="flex flex-1 min-h-0 min-w-0 bg-background overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <PageTopbar
          left={
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

            </div>

            {/* Filtri con conteggio: i numeri dicono dove serve intervenire */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                ['all', 'active', 'invited', 'never', 'idle', 'suspended', 'pending'] as const
              ).map((s) => (
                <button
                  key={`filter-${s}`}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    statusFilter === s
                      ? 'bg-primary text-white'
                      : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {FILTER_LABEL[s]} <span className="opacity-70">({filterCount(s)})</span>
                </button>
              ))}
            </div>

            {loadError && (
              <div className="bg-[var(--danger-bg)] border border-red-200 rounded-xl px-4 py-3 text-sm text-[var(--danger)] flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span className="flex-1">{loadError}</span>
                <button
                  type="button"
                  onClick={loadUsers}
                  className="font-semibold underline underline-offset-2"
                >
                  Riprova
                </button>
              </div>
            )}

            {/* Table Users (Desktop) & Cards (Mobile) */}
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              {/* Desktop: tabella a colonne fisse, i testi lunghi si troncano e non vanno a capo */}
              <div className="hidden lg:block">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col />
                    <col />
                    <col className="w-[8.5rem]" />
                    <col className="w-[9.5rem]" />
                    <col className="w-[9.5rem]" />
                    <col className="w-[11rem]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {['Ristoratore', 'Ristorante', 'Stato', 'Ultimo accesso', 'Ultimo ordine'].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-3 xl:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap"
                          >
                            {h}
                          </th>
                        )
                      )}
                      <th className="px-3 xl:px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Azioni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-sm text-muted-foreground">
                          Nessun ristoratore trovato
                        </td>
                      </tr>
                    )}
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 xl:px-4 py-3 align-middle">
                          <p
                            className={`truncate text-sm font-semibold ${u.userId ? 'text-foreground' : 'italic text-muted-foreground'}`}
                            title={ownerName(u)}
                          >
                            {ownerName(u)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground" title={u.email}>
                            {u.email}
                          </p>
                        </td>
                        <td className="px-3 xl:px-4 py-3 align-middle text-sm">
                          {renderRestaurant(u)}
                        </td>
                        <td className="px-3 xl:px-4 py-3 align-middle">{renderBadge(u)}</td>
                        <td className="px-3 xl:px-4 py-3 align-middle text-xs text-foreground whitespace-nowrap">
                          {renderLastLogin(u)}
                        </td>
                        <td className="px-3 xl:px-4 py-3 align-middle text-xs text-foreground whitespace-nowrap">
                          {renderLastOrder(u)}
                        </td>
                        <td className="px-3 xl:px-4 py-3 align-middle">
                          {renderActions(u, 'table')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Telefono e tablet: una scheda per ristoratore */}
              <div className="lg:hidden divide-y divide-border">
                {filteredUsers.length === 0 && (
                  <div className="py-16 text-center text-sm text-muted-foreground">
                    Nessun ristoratore trovato
                  </div>
                )}
                {filteredUsers.map((u) => (
                  <div key={u.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4
                          className={`truncate text-sm font-semibold ${u.userId ? 'text-foreground' : 'italic text-muted-foreground'}`}
                        >
                          {ownerName(u)}
                        </h4>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <div className="shrink-0">{renderBadge(u)}</div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3 rounded-lg bg-muted/40 p-3 text-xs">
                      <div className="min-w-0">
                        <p className="mb-0.5 text-muted-foreground">Ristorante</p>
                        <div className="text-sm">{renderRestaurant(u)}</div>
                      </div>
                      <div>
                        <p className="mb-0.5 text-muted-foreground">Ultimo accesso</p>
                        <div className="font-medium text-foreground">{renderLastLogin(u)}</div>
                      </div>
                      <div>
                        <p className="mb-0.5 text-muted-foreground">Ultimo ordine</p>
                        <div className="font-medium text-foreground">{renderLastOrder(u)}</div>
                      </div>
                    </div>

                    {renderActions(u, 'card')}
                  </div>
                ))}
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
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
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
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                  Invia questa password temporanea al ristoratore.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Ristoratore Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsEditModalOpen(false)}
          />
          <form
            onSubmit={handleUpdateRistoratore}
            className="relative bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0 text-primary">
                <Edit2 size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-foreground">Modifica Ristoratore</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Aggiorna i dati dell'account per {editingUser.restaurantName}.
                </p>
              </div>
            </div>

            {editSuccess && (
              <div className="bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-[var(--success)] shrink-0" />
                <p className="text-xs font-semibold text-foreground">
                  Ristoratore aggiornato con successo!
                </p>
              </div>
            )}

            {editError && (
              <div className="bg-[var(--danger-bg)] border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-[var(--danger)]">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{editError}</span>
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
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Es. Giuseppe Esposito"
                  className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Email Ristoratore
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Es. giuseppe@bellanapoli.it"
                  className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Nuova Password (lascia vuoto per non modificare)
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Inserisci nuova password"
                  className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-secondary hover:bg-muted text-foreground border border-border rounded-xl text-xs font-semibold transition-colors"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
              >
                Salva Modifiche
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Ristoratore Confirmation Modal */}
      {isDeleteModalOpen && deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsDeleteModalOpen(false)}
          />
          <div className="relative bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-6 space-y-4">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0 text-red-600">
                <Trash2 size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-foreground">Elimina Ristoratore</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Sei sicuro di voler eliminare definitivamente l'account di{' '}
                  <span className="font-semibold text-foreground">{deletingUser.name}</span> ({deletingUser.email})?
                </p>
                <p className="text-xs text-[var(--danger)] bg-[var(--danger-bg)] border border-red-200 rounded-xl p-3 mt-3 leading-relaxed">
                  L'utente verrà disassociato da <strong>{deletingUser.restaurantName}</strong> e il suo account di accesso verrà cancellato definitivamente. Questa azione non è reversibile.
                </p>
              </div>
            </div>

            {deleteSuccess && (
              <div className="bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-[var(--success)] shrink-0" />
                <p className="text-xs font-semibold text-foreground">
                  Ristoratore eliminato con successo!
                </p>
              </div>
            )}

            {deleteError && (
              <div className="bg-[var(--danger-bg)] border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-[var(--danger)]">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-secondary hover:bg-muted text-foreground border border-border rounded-xl text-xs font-semibold transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteRistoratore}
                className="px-4 py-2 bg-red-600 hover:bg-red-750 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
              >
                Elimina Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
