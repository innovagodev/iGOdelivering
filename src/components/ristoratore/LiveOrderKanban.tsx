'use client';
import React, { useState, useEffect, useRef } from 'react';
import { confirmAction } from '@/lib/notify';
import {
  Clock,
  ChefHat,
  CheckCheck,
  AlertCircle,
  Bell,
  Ban,
  CalendarClock,
  User,
  X,
  Check,
  MapPin,
  Utensils,
  Search,
  Bike,
  ShoppingBag,
  Printer,
  Calendar,
  Mail,
  Phone,
  ExternalLink,
  MessageSquare,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  History,
  Timer,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/hooks/useOrders';
import { useAudioNotification } from '@/components/ristoratore/AudioNotificationProvider';
import AudioSettings from '@/components/ristoratore/AudioSettings';
import { isScheduledLater } from '@/lib/orderStatus';
import { usePanelShell } from '@/components/layout/PanelShellContext';
import FilterPills from '@/components/ui/FilterPills';
import { romeDay } from '@/lib/dashboardStats';

type OrderStatus = 'pending' | 'accepted' | 'completed';

interface OrderItem {
  name: string;
  qty: number;
  addedIngredients?: { name: string; price?: number }[];
  removedIngredients?: string[];
  note?: string;
}

interface LiveOrder {
  id: string;
  orderNumber?: string;
  customer: string;
  phone?: string;
  items: OrderItem[];
  total: number;
  type: 'delivery' | 'takeaway' | 'table';
  minutesAgo: number;
  timestamp?: string;
  address?: string;
  tableNumber?: string;
  isBookingPreOrder?: boolean;
  status?: string;
  deliveryTime?: string;
  deliveryDate?: string;
  scheduledAt?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  acceptDeadline?: string | null;
  acceptanceMode?: string | null;
}


interface ColumnDef {
  key: OrderStatus;
  label: string;
  hint: string;
  icon: React.ReactNode;
  /** Classi complete (non composte): Tailwind le trova solo così. */
  ui: { wrap: string; bar: string; iconWrap: string; count: string; tab: string; accent: string };
}

// Un colore per significato: ambra = serve un'azione, azzurro = al lavoro, verde = finito.
const columns: ColumnDef[] = [
  {
    key: 'pending',
    label: 'Da accettare',
    hint: 'I nuovi ordini compaiono qui',
    icon: <Bell size={16} />,
    ui: {
      wrap: 'bg-amber-100/50 dark:bg-amber-500/[0.08]',
      bar: 'bg-amber-500',
      iconWrap: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
      count: 'bg-amber-500 text-white',
      tab: 'bg-amber-500 text-white shadow-sm',
      accent: 'border-l-amber-500',
    },
  },
  {
    key: 'accepted',
    label: 'In cucina',
    hint: 'Gli ordini da preparare ora restano qui finché non sono pronti',
    icon: <ChefHat size={16} />,
    ui: {
      wrap: 'bg-sky-100/50 dark:bg-sky-500/[0.08]',
      bar: 'bg-sky-500',
      iconWrap: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
      count: 'bg-sky-500 text-white',
      tab: 'bg-sky-500 text-white shadow-sm',
      accent: 'border-l-sky-500',
    },
  },
  {
    key: 'completed',
    label: 'Completati',
    hint: 'Gli ordini consegnati compaiono qui',
    icon: <CheckCheck size={16} />,
    ui: {
      wrap: 'bg-emerald-100/50 dark:bg-emerald-500/[0.07]',
      bar: 'bg-emerald-500/70',
      iconWrap: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
      count: 'bg-emerald-600/80 text-white',
      tab: 'bg-emerald-600 text-white shadow-sm',
      accent: 'border-l-emerald-500/60',
    },
  },
];

// Gli ordini non accettati in tempo ("persi") restano visibili un'ora dalla scadenza,
// poi spariscono da soli; si possono anche nascondere prima.
const LOST_VISIBLE_MS = 60 * 60 * 1000;

// Ordini già accettati ma per un altro giorno: aspettano qui e passano in cucina da soli quel giorno.
const scheduledColumn: ColumnDef = {
  key: 'accepted',
  label: 'Programmati',
  hint: 'Confermati per un altro giorno: passano in cucina da soli quel giorno',
  icon: <CalendarClock size={16} />,
  ui: {
    wrap: 'bg-violet-100/50 dark:bg-violet-500/[0.08]',
    bar: 'bg-violet-500',
    iconWrap: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
    count: 'bg-violet-500 text-white',
    tab: 'bg-violet-500 text-white shadow-sm',
    accent: 'border-l-violet-500',
  },
};

const lostColumn: ColumnDef = {
  key: 'pending',
  label: 'Persi',
  hint: 'Ordini non accettati in tempo: spariscono da soli dopo un\'ora',
  icon: <Ban size={16} />,
  ui: {
    wrap: 'bg-rose-100/50 dark:bg-rose-500/[0.08]',
    bar: 'bg-rose-500',
    iconWrap: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
    count: 'bg-rose-500 text-white',
    tab: 'bg-rose-500 text-white shadow-sm',
    accent: 'border-l-rose-500',
  },
};

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'danger';
}

/**
 * Righe di un ordine nella forma usata da dettaglio, schede e stampe.
 *
 * Gli ordini del database portano `order_items` con colonne snake_case
 * (added_ingredients, removed_ingredients, note): il dettaglio leggeva invece
 * `items` con nomi camelCase, che per questi ordini non esistono, e la cucina
 * non vedeva né i piatti né le personalizzazioni.
 */
const orderLines = (o: any): any[] => {
  if (Array.isArray(o?.order_items)) {
    return o.order_items.map((i: any) => ({
      name: i.name,
      qty: i.qty || 1,
      price: Number(i.price) || 0,
      addedIngredients: Array.isArray(i.added_ingredients) ? i.added_ingredients : [],
      removedIngredients: Array.isArray(i.removed_ingredients) ? i.removed_ingredients : [],
      note: i.note || '',
    }));
  }
  return Array.isArray(o?.items) ? o.items : [];
};

/**
 * Dettaglio e stampa leggevano nomi in camelCase (customerName, createdAt, customer.email…)
 * che gli ordini del database non hanno: hanno customer_name, created_at, customer_email.
 * Risultato: "Cliente" al posto del nome e "Invalid Date" alla data. Qui si aggiungono gli
 * alias, senza toccare i campi già presenti.
 */
const withAliases = (o: any) => {
  const email = o.customer?.email ?? o.customer_email;
  // Orario richiesto: nel database c'è solo scheduled_at, il formato per il pannello si ricava qui.
  const sched = o.scheduled_at ? new Date(o.scheduled_at) : null;
  return {
    ...o,
    deliveryTime:
      o.deliveryTime ||
      (sched ? sched.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }) : undefined),
    deliveryDate: o.deliveryDate || (sched ? romeDay(sched) : undefined),
    customerName: o.customerName || o.customer_name,
    createdAt: o.createdAt || o.created_at,
    timestamp: o.timestamp || o.created_at,
    tableNumber: o.tableNumber || o.table_number,
    address: o.address || o.customer_address,
    customer: {
      ...(o.customer || {}),
      name: o.customer?.name || o.customer_name,
      phone: o.customer?.phone || o.customer_phone,
      address: o.customer?.address || o.customer_address,
      // L'indirizzo finto degli ordini al tavolo non è un contatto.
      email: email && !String(email).endsWith('@internal.it') ? email : undefined,
    },
  };
};

/** "Ai Cereali (+€2.00)": ogni supplemento a pagamento mostra il suo prezzo. */
const extraLabel = (a: any) => {
  const price = Number(a?.price) || 0;
  return price > 0 ? `${a.name} (+€${price.toFixed(2)})` : a.name;
};

export default function LiveOrderKanban() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || '';

  const { orders, updateOrderStatus, loading, refetch } = useOrders(restaurantId);
  const { isMuted, setIsMuted } = useAudioNotification();

  const [searchQuery, setSearchQuery] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'delivery' | 'takeaway' | 'table'>(
    'all'
  );
  const [showLost, setShowLost] = useState(false);
  const [showScheduled, setShowScheduled] = useState(false);
  // "Nascondi" è una scelta di vista, per questo dispositivo: non cambia nulla nell'ordine.
  const dismissKey = `iGO_lost_dismissed_${restaurantId}`;
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(dismissKey);
      setDismissed(raw ? JSON.parse(raw) : []);
    } catch {
      setDismissed([]);
    }
  }, [dismissKey]);
  const dismissLost = (id: string) => {
    setDismissed((prev) => {
      const next = Array.from(new Set([...prev, id]));
      try {
        localStorage.setItem(dismissKey, JSON.stringify(next.slice(-300)));
      } catch {
        /* senza archivio il nascondimento vale solo finché la pagina è aperta */
      }
      return next;
    });
  };
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [ticker, setTicker] = useState(0);
  const [activeMobileTab, setActiveMobileTab] = useState<OrderStatus>('pending');
  // Tre colonne solo se il pannello è largo abbastanza: dipende dalla larghezza
  // reale (sidebar compresa), non da quella dello schermo.
  const rootRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  const [twoCols, setTwoCols] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWide(entry.contentRect.width >= 800);
      setTwoCols(entry.contentRect.width >= 640);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Schermo pieno: nasconde barra laterale e barra in alto (e, dove il browser lo permette,
  // passa allo schermo intero vero). La scelta si ricorda su questo dispositivo.
  const IMMERSIVE_KEY = 'iGO_live_immersive';
  const setChromeHidden = usePanelShell()?.setImmersive;
  const [immersive, setImmersive] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const persistImmersive = (v: boolean) => {
    try {
      localStorage.setItem(IMMERSIVE_KEY, v ? '1' : '0');
    } catch {
      /* senza archivio la scelta vale solo per questa visita */
    }
  };
  useEffect(() => {
    try {
      if (localStorage.getItem(IMMERSIVE_KEY) === '1') setImmersive(true);
    } catch {
      /* ignora */
    }
  }, []);
  useEffect(() => {
    setChromeHidden?.(immersive);
    return () => setChromeHidden?.(false);
  }, [immersive, setChromeHidden]);
  useEffect(() => {
    // Uscito dallo schermo intero con Esc o dal browser: esce anche la modalità.
    const onFs = () => {
      if (!document.fullscreenElement) {
        setImmersive(false);
        persistImmersive(false);
      }
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);
  const toggleImmersive = async () => {
    const next = !immersive;
    setImmersive(next);
    persistImmersive(next);
    try {
      if (next) {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      /* iPad e telefoni non sempre lo permettono: resta la modalità a schermo pieno dell'app */
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showHistory) {
        setShowHistory(false);
        return;
      }
      if (immersive && !selectedOrderId && !document.fullscreenElement) {
        setImmersive(false);
        persistImmersive(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [immersive, showHistory, selectedOrderId]);

  // Orologio al secondo per il conto alla rovescia sulle schede in attesa: gira
  // solo finché c'è un ordine da accettare con una scadenza.
  const [nowMs, setNowMs] = useState(() => Date.now());
  const hasLiveCountdown = orders.some(
    (o) =>
      (o.status === 'new' || o.status === 'pending') &&
      o.accept_deadline &&
      o.acceptance_mode === 'live' &&
      new Date(o.accept_deadline).getTime() > Date.now()
  );
  useEffect(() => {
    if (!hasLiveCountdown) return;
    const clock = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(clock);
  }, [hasLiveCountdown]);

  // Set up live ticking interval to refresh dynamic prep timers
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker((t) => t + 1);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Ordini non accettati entro la scadenza (3 minuti a locale aperto, un'ora
  // dopo l'apertura per i preordini): la scadenza è già visibile qui, ma
  // l'ordine resta aperto — e un'autorizzazione di carta resta bloccata sulla
  // carta del cliente — finché il server non lo fa scadere.
  const sweepingRef = useRef(false);
  useEffect(() => {
    const hasDue = orders.some(
      (o) =>
        (o.status === 'new' || o.status === 'pending') &&
        (o.payment_status === 'unpaid' || o.payment_status === 'authorized') &&
        o.accept_deadline &&
        Date.now() >= new Date(o.accept_deadline).getTime()
    );
    if (!hasDue || sweepingRef.current) return;
    sweepingRef.current = true;
    fetch('/api/order/expire-due', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
      .then(() => refetch())
      .catch((e) => console.error('[kanban] expire-due:', e))
      .finally(() => {
        sweepingRef.current = false;
      });
    // Solo a ogni battito: con `orders` fra le dipendenze un annullamento
    // fallito ripartirebbe a ogni refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  const getOrderStatus = (o: any): string => {
    if (o.status === 'expired') return 'expired';
    // Regola unica (migration 034): la scadenza per accettare è accept_deadline,
    // decisa dal server — 3 minuti a locale aperto, un'ora dopo la prossima
    // apertura per i preordini — per contanti, POS e carta. Scaduto un ordine
    // non incassato, il pannello lo mostra tra i persi; un ordine già incassato
    // online non scade mai da qui (migration 030).
    if (o.status === 'new' || o.status === 'pending') {
      if (o.payment_status === 'paid' || o.payment_status === 'partially_refunded') {
        return o.status || 'new';
      }
      if (o.accept_deadline) {
        return Date.now() >= new Date(o.accept_deadline).getTime() ? 'expired' : o.status;
      }
      // Ordini nati prima della regola: 3 minuti dalla creazione, tranne quelli
      // con un orario scelto, che non scadevano.
      if (!o.scheduled_at) {
        const mins = Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(o.created_at || o.timestamp || o.createdAt).getTime()) / 60000
          )
        );
        if (mins >= 3) return 'expired';
      }
    }
    return o.status || 'pending';
  };

  const mapFlatOrder = (o: any): LiveOrder => {
    // Per un ordine pagato online il tempo parte dal pagamento: è da lì che
    // l'ordine è arrivato in cucina.
    const startedAt = o.authorized_at || o.paid_at || o.created_at || o.timestamp || o.createdAt;
    const mins = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));

    // Map array of items
    const items = orderLines(o).map((i: any) => ({
      name: i.name,
      qty: i.qty || 1,
      addedIngredients: i.addedIngredients || [],
      removedIngredients: i.removedIngredients || [],
      note: i.note || '',
    }));

    const enriched = { ...o };
    if (enriched.scheduled_at && !enriched.deliveryTime) {
      const d = new Date(enriched.scheduled_at);
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      enriched.deliveryTime = `${hours}:${minutes}`;
      enriched.deliveryDate = enriched.scheduled_at.split('T')[0];
    }

    return {
      id: enriched.id || 'ord-unknown',
      orderNumber: enriched.order_number || enriched.id || 'ord-unknown',
      customer:
        enriched.customer_name ||
        enriched.customerName ||
        (enriched.customer && enriched.customer.name) ||
        enriched.email ||
        'Cliente',
      phone: enriched.customer_phone || (enriched.customer && enriched.customer.phone) || '',
      items,
      total: parseFloat(enriched.total) || 0,
      type: enriched.type === 'domicilio' ? 'delivery' : enriched.type === 'asporto' ? 'takeaway' : 'table',
      minutesAgo: mins,
      timestamp: enriched.created_at || enriched.timestamp || enriched.createdAt || new Date().toISOString(),
      address: enriched.customer_address || (enriched.customer && enriched.customer.address) || enriched.address || '',
      tableNumber: enriched.table_number || enriched.tableNumber,
      // Un ordine al tavolo senza numero di tavolo ma con un orario nasce da una prenotazione con pre-ordine
      // (un ordine dal QR del tavolo ha sempre il numero e nessun orario).
      isBookingPreOrder:
        enriched.type === 'prenotazione_tavolo' ||
        (enriched.id && enriched.id.startsWith('PRE-')) ||
        (enriched.type === 'tavolo' && !enriched.table_number && !!enriched.scheduled_at),
      status: getOrderStatus(enriched),
      deliveryTime: enriched.deliveryTime || '',
      deliveryDate: enriched.deliveryDate || '',
      paymentMethod: enriched.payment_method ?? null,
      paymentStatus: enriched.payment_status ?? null,
      acceptDeadline: enriched.accept_deadline ?? null,
      acceptanceMode: enriched.acceptance_mode ?? null,
      scheduledAt: enriched.scheduled_at || null,
    };
  };

  const showToast = (message: string, type: 'success' | 'danger') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const formatMinutesAgo = (mins: number) => {
    if (mins < 1) return 'ora';
    if (mins < 60) return `${mins}m fa`;
    if (mins < 1440) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m fa` : `${h}h fa`;
    }
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    return h > 0 ? `${d}g ${h}h fa` : `${d}g fa`;
  };

  const acceptOrder = async (orderId: string) => {
    const found = orders.find((o) => o.id === orderId);
    if (!found) return;
    try {
      await updateOrderStatus(orderId, 'preparing');
      const orderCode = found.order_number || found.id.replace('ord-', '').toUpperCase();
      showToast(
        `Ordine #${orderCode} di ${found.customer_name || found.customerName || 'Cliente'} accettato`,
        'success'
      );
    } catch (e) {
      showToast(`Errore durante l'accettazione dell'ordine`, 'danger');
    }
  };

  // Riattiva un ordine scaduto (solo contanti e POS): il cliente ha già letto
  // "nessuna risposta dal locale", quindi si chiede conferma prima di preparare.
  const reactivateExpired = async (orderId: string, orderNumber?: string) => {
    const ok = await confirmAction({
      title: 'Riattivare l’ordine scaduto?',
      message:
        'Il cliente ha già visto "Nessuna risposta dal locale". Chiamalo prima di prepararlo, per essere sicuro che lo stia ancora aspettando.',
      confirmLabel: 'Riattiva comunque',
    });
    if (!ok) return;
    try {
      await updateOrderStatus(orderId, 'preparing');
      const orderCode = orderNumber || orderId.replace('ord-', '').toUpperCase();
      showToast(`Ordine #${orderCode} riattivato in preparazione`, 'success');
    } catch (err) {
      showToast(`Errore durante la riattivazione dell'ordine`, 'danger');
    }
  };

  const completeOrder = async (orderId: string) => {
    const found = orders.find((o) => o.id === orderId);
    if (!found) return;
    try {
      await updateOrderStatus(orderId, 'delivered');
      const orderCode = found.order_number || found.id.replace('ord-', '').toUpperCase();
      showToast(`Ordine #${orderCode} completato`, 'success');
    } catch (e) {
      showToast(`Errore durante il completamento dell'ordine`, 'danger');
    }
  };

  const rejectOrder = async (status: OrderStatus, orderId: string) => {
    const found = orders.find((o) => o.id === orderId);
    if (!found) return;
    try {
      await updateOrderStatus(orderId, 'cancelled');
      const orderCode = found.order_number || found.id.replace('ord-', '').toUpperCase();
      const wasPaid = found.payment_status === 'paid';
      const wasAuthorized = found.payment_status === 'authorized';
      showToast(
        wasPaid
          ? `Ordine #${orderCode} rifiutato, rimborso avviato al cliente`
          : wasAuthorized
            ? `Ordine #${orderCode} rifiutato, al cliente non verrà addebitato nulla`
            : `Ordine #${orderCode} rifiutato`,
        'danger'
      );
    } catch (e: any) {
      // Per un ordine pagato online il messaggio spiega che il rimborso non è
      // riuscito e l'ordine non è stato annullato.
      showToast(e?.message || `Errore durante il rifiuto dell'ordine`, 'danger');
    }
  };

  // Quando è scaduto: la scadenza decisa dal server, o 3 minuti dalla creazione per gli ordini più vecchi.
  const lostSince = (o: any) =>
    o.accept_deadline
      ? new Date(o.accept_deadline).getTime()
      : new Date(o.created_at || o.timestamp || o.createdAt).getTime() + 3 * 60000;
  const isLostVisible = (o: any) => !dismissed.includes(o.id) && Date.now() - lostSince(o) < LOST_VISIBLE_MS;
  const lostCount = orders.filter(
    (o) =>
      (o.status === 'new' || o.status === 'pending' || o.status === 'expired') &&
      getOrderStatus(o) === 'expired' &&
      isLostVisible(o)
  ).length;
  const scheduledCount = orders.filter((o) => isScheduledLater(o)).length;
  const viewColumns = columns.map((c) =>
    c.key === 'pending' && showLost ? lostColumn : c.key === 'accepted' && showScheduled ? scheduledColumn : c
  );

  const filteredOrders = (colKey: OrderStatus) => {
    return orders
      .filter((o) => {
        const orderStatus = o.status;
        if (colKey === 'pending') {
          if (orderStatus !== 'new' && orderStatus !== 'pending' && orderStatus !== 'expired') return false;
          const lost = getOrderStatus(o) === 'expired';
          return showLost ? lost && isLostVisible(o) : !lost;
        }
        if (colKey === 'accepted') {
          if (
            orderStatus !== 'accepted' &&
            orderStatus !== 'preparing' &&
            orderStatus !== 'ready' &&
            orderStatus !== 'delivering'
          )
            return false;
          // Programmati e in cucina sono due viste dello stesso passaggio: un ordine è in una sola.
          return showScheduled ? isScheduledLater(o) : !isScheduledLater(o);
        }
        if (colKey === 'completed')
          return (
            (orderStatus === 'completed' || orderStatus === 'delivered') &&
            romeDay(o.created_at || o.timestamp || o.createdAt) === romeDay(new Date())
          );
        return false;
      })
      .sort((a, b) =>
        colKey === 'accepted' && showScheduled
          ? String(a.scheduled_at || '').localeCompare(String(b.scheduled_at || ''))
          : 0
      )
      .map(mapFlatOrder)
      .filter((order) => {
        const matchesSearch =
          order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = orderTypeFilter === 'all' || order.type === orderTypeFilter;
        
        return matchesSearch && matchesType;
      });
  };

  const handlePrintSingleOrder = (orderId: string) => {
    const baseOrder = orders.find((o) => o.id === orderId);
    if (!baseOrder) return;
    const rawOrder = withAliases(baseOrder);
    if (rawOrder.scheduled_at && !rawOrder.deliveryTime) {
      const d = new Date(rawOrder.scheduled_at);
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      rawOrder.deliveryTime = `${hours}:${minutes}`;
      rawOrder.deliveryDate = rawOrder.scheduled_at.split('T')[0];
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const restName = user?.restaurantName || 'iGOdelivering';

    const itemsHtml = orderLines(rawOrder)
      .map((item: any) => {
        const customNotes =
          item.addedIngredients?.length > 0 || item.removedIngredients?.length > 0
            ? `<div style="font-size: 11px; color: #555; margin-left: 10px; margin-top: 2px;">` +
              item.addedIngredients
                ?.map((i: any) => '+' + extraLabel(i))
                .concat(item.removedIngredients?.map((i: string) => '-' + i))
                .join(', ') +
              `</div>`
            : '';
        const itemNote = item.note
          ? `<div style="font-size: 11px; color: #ef4444; font-style: italic; margin-left: 10px; margin-top: 2px;">Nota: ${item.note}</div>`
          : '';

        return `
        <div style="border-bottom: 1px dashed #eee; padding: 6px 0; font-size: 14px;">
          <div style="display: flex; justify-content: space-between;">
            <strong>${item.qty}x ${item.name}</strong>
            <strong>€ ${((item.price || item.originalPrice || 0) * item.qty).toFixed(2)}</strong>
          </div>
          ${customNotes}
          ${itemNote}
        </div>
      `;
      })
      .join('');

    const formattedType =
      rawOrder.type === 'domicilio'
        ? 'CONSEGNA A DOMICILIO'
        : rawOrder.type === 'asporto'
          ? 'ASPORTO (RITIRO)'
          : `AL TAVOLO ${rawOrder.tableNumber || ''}`;

    const scheduledTime = rawOrder.deliveryTime
      ? `<div style="font-size: 15px; margin-top: 5px; color: #d97706; font-weight: bold; border: 1px solid #f59e0b; padding: 4px; border-radius: 4px; text-align: center;">
          PROGRAMMATO PER: ${
            rawOrder.deliveryDate
              ? `${new Date(rawOrder.deliveryDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} `
              : ''
          }
          ${rawOrder.deliveryTime === 'asap' ? 'IL PRIMA POSSIBILE' : `alle ${rawOrder.deliveryTime}`}
         </div>`
      : rawOrder.type === 'domicilio' || rawOrder.type === 'asporto'
        ? `<div style="font-size: 13px; margin-top: 5px; text-align: center; font-weight: bold;">${rawOrder.type === 'domicilio' ? 'CONSEGNA' : 'RITIRO'}: IL PRIMA POSSIBILE</div>`
        : '';

    const kitchenNotes = rawOrder.notes
      ? `<div style="margin-top: 10px; padding: 8px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 4px; font-size: 12px; color: #b45309;">
          <strong>NOTA CUCINA:</strong> ${rawOrder.notes}
         </div>`
      : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Comanda ${rawOrder.id}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; padding: 10px; color: #000; }
            h2, h3 { text-align: center; margin: 5px 0; }
            .divider { border-top: 2px dashed #000; margin: 10px 0; }
            .footer { text-align: center; font-size: 10px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h2>${restName}</h2>
          <h3>COMANDA CUCINA</h3>
          <div style="text-align: center; font-size: 11px;">ID: ${rawOrder.order_number || rawOrder.id.replace('ord-', '').toUpperCase()}</div>
          <div style="text-align: center; font-size: 11px;">Data: ${new Date(rawOrder.timestamp || rawOrder.createdAt).toLocaleString('it-IT')}</div>
          
          <div class="divider"></div>
          
          <div style="font-weight: bold; font-size: 14px; text-align: center;">
            ${formattedType}
          </div>
          ${scheduledTime}
          
          <div class="divider"></div>
          
          <div>
            ${itemsHtml}
          </div>
          
          ${kitchenNotes}
          
          <div class="divider"></div>
          
          <div style="font-size: 13px;">
            <div><strong>Cliente:</strong> ${rawOrder.customerName || (rawOrder.customer && rawOrder.customer.name) || 'Cliente'}</div>
            ${(rawOrder.customer_phone || rawOrder.customer?.phone) ? `<div><strong>Tel:</strong> ${rawOrder.customer_phone || rawOrder.customer?.phone}</div>` : ''}
            ${rawOrder.type === 'domicilio' && rawOrder.customer?.address ? `<div><strong>Indirizzo:</strong> ${rawOrder.customer.address}</div>` : ''}
          </div>
          
          <div class="divider"></div>
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
            <span>TOTALE ORDINE:</span>
            <span>€ ${(rawOrder.total || 0).toFixed(2)}</span>
          </div>
          
          <div class="footer">
            Generato da iGOdelivering<br>
            *** Grazie per il tuo ordine ***
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintAllAcceptedOrders = (colOrders: LiveOrder[]) => {
    if (colOrders.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const restName = user?.restaurantName || 'iGOdelivering';

    const slipsHtml = colOrders
      .map((flatOrder, index) => {
        // Come nella stampa singola: alias dei campi del database (nome, data) e orario programmato.
        const baseOrder = orders.find((o) => o.id === flatOrder.id);
        const rawOrder: any = baseOrder
          ? withAliases({
              ...baseOrder,
              deliveryTime: flatOrder.deliveryTime || baseOrder.deliveryTime,
              deliveryDate: flatOrder.deliveryDate || baseOrder.deliveryDate,
            })
          : flatOrder;

        const itemsHtml = orderLines(rawOrder)
          .map((item: any) => {
            const customNotes =
              item.addedIngredients?.length > 0 || item.removedIngredients?.length > 0
                ? `<div style="font-size: 11px; color: #555; margin-left: 10px; margin-top: 2px;">` +
                  item.addedIngredients
                    ?.map((i: any) => '+' + extraLabel(i))
                    .concat(item.removedIngredients?.map((i: string) => '-' + i))
                    .join(', ') +
                  `</div>`
                : '';
            const itemNote = item.note
              ? `<div style="font-size: 11px; color: #ef4444; font-style: italic; margin-left: 10px; margin-top: 2px;">Nota: ${item.note}</div>`
              : '';

            return `
          <div style="border-bottom: 1px dashed #eee; padding: 6px 0; font-size: 14px;">
            <div style="display: flex; justify-content: space-between;">
              <strong>${item.qty}x ${item.name}</strong>
              <strong>€ ${((item.price || item.originalPrice || 0) * item.qty).toFixed(2)}</strong>
            </div>
            ${customNotes}
            ${itemNote}
          </div>
        `;
          })
          .join('');

        const formattedType =
          rawOrder.type === 'domicilio'
            ? 'CONSEGNA A DOMICILIO'
            : rawOrder.type === 'asporto'
              ? 'ASPORTO (RITIRO)'
              : `AL TAVOLO ${rawOrder.tableNumber || ''}`;

        const scheduledTime = rawOrder.deliveryTime
          ? `<div style="font-size: 15px; margin-top: 5px; color: #d97706; font-weight: bold; border: 1px solid #f59e0b; padding: 4px; border-radius: 4px; text-align: center;">
              PROGRAMMATO PER: ${
                rawOrder.deliveryDate
                  ? `${new Date(rawOrder.deliveryDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} `
                  : ''
              }
              ${rawOrder.deliveryTime === 'asap' ? 'IL PRIMA POSSIBILE' : `alle ${rawOrder.deliveryTime}`}
             </div>`
          : rawOrder.type === 'domicilio' || rawOrder.type === 'asporto'
            ? `<div style="font-size: 13px; margin-top: 5px; text-align: center; font-weight: bold;">${rawOrder.type === 'domicilio' ? 'CONSEGNA' : 'RITIRO'}: IL PRIMA POSSIBILE</div>`
            : '';

        const kitchenNotes = rawOrder.notes
          ? `<div style="margin-top: 10px; padding: 8px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 4px; font-size: 12px; color: #b45309;">
              <strong>NOTA CUCINA:</strong> ${rawOrder.notes}
             </div>`
          : '';

        return `
        <div style="page-break-after: always; padding: 10px 0;">
          <h2 style="text-align: center; margin: 5px 0;">${restName}</h2>
          <h3 style="text-align: center; margin: 5px 0;">COMANDA IN CORSO (#${index + 1}/${colOrders.length})</h3>
          <div style="text-align: center; font-size: 11px;">ID: ${rawOrder.order_number || rawOrder.id.replace('ord-', '').toUpperCase()}</div>
          <div style="text-align: center; font-size: 11px;">Data: ${new Date(rawOrder.timestamp || rawOrder.createdAt).toLocaleString('it-IT')}</div>
          
          <div class="divider" style="border-top: 2px dashed #000; margin: 10px 0;"></div>
          
          <div style="font-weight: bold; font-size: 14px; text-align: center;">
            ${formattedType}
          </div>
          ${scheduledTime}
          
          <div class="divider" style="border-top: 2px dashed #000; margin: 10px 0;"></div>
          
          <div>
            ${itemsHtml}
          </div>
          
          ${kitchenNotes}
          
          <div class="divider" style="border-top: 2px dashed #000; margin: 10px 0;"></div>
          
          <div style="font-size: 13px;">
            <div><strong>Cliente:</strong> ${rawOrder.customerName || (rawOrder.customer && rawOrder.customer.name) || 'Cliente'}</div>
            ${(rawOrder.customer_phone || rawOrder.customer?.phone) ? `<div><strong>Tel:</strong> ${rawOrder.customer_phone || rawOrder.customer?.phone}</div>` : ''}
            ${rawOrder.type === 'domicilio' && rawOrder.customer?.address ? `<div><strong>Indirizzo:</strong> ${rawOrder.customer.address}</div>` : ''}
          </div>
          
          <div class="divider" style="border-top: 2px dashed #000; margin: 10px 0;"></div>
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
            <span>TOTALE ORDINE:</span>
            <span>€ ${(rawOrder.total || 0).toFixed(2)}</span>
          </div>
        </div>
      `;
      })
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Comande In Corso - ${restName}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; padding: 10px; color: #000; }
            .divider { border-top: 2px dashed #000; margin: 10px 0; }
            @media print {
              .no-print { display: none; }
              div { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${slipsHtml}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Pulsante d'azione di una scheda: alto almeno 44px (tablet), testo leggibile.
  const actionBase =
    'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-bold transition-colors cursor-pointer';
  // Un solo pulsante pieno per scheda; l'azione contraria è solo testo.
  const actionGhost = `${actionBase} flex-none text-muted-foreground hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-400`;
  const actionNeutral = `${actionBase} flex-1 bg-muted/70 text-foreground hover:bg-muted`;
  const actionPrimary = `${actionBase} flex-1 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700`;

  const renderActions = (colKey: OrderStatus, order: LiveOrder) => {
    if (order.status === 'expired') {
      // Un ordine scaduto è già stato comunicato al cliente ("nessuna risposta"):
      // rifiutarlo non avrebbe senso e gli manderebbe un secondo messaggio di
      // annullamento. Resta la possibilità di chiamarlo e, solo per contanti e
      // POS, di riattivare l'ordine. Un ordine online scaduto ha l'autorizzazione
      // annullata: il cliente non è addebitato e non si può più incassare.
      return (
        <div className="space-y-2">
          {order.paymentMethod === 'online' && (
            <p className="text-xs font-medium leading-snug text-muted-foreground">
              Scaduto: il cliente non è stato addebitato.
            </p>
          )}
          <div className="flex gap-2">
            {order.phone && (
              <a
                href={`tel:${order.phone}`}
                onClick={(e) => e.stopPropagation()}
                className={actionNeutral}
              >
                <Phone size={15} />
                Chiama
              </a>
            )}
            {order.paymentMethod !== 'online' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  reactivateExpired(order.id, order.orderNumber);
                }}
                className={actionPrimary}
              >
                <Check size={14} />
                Riattiva
              </button>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              dismissLost(order.id);
            }}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X size={14} />
            Nascondi dalla vista
          </button>
        </div>
      );
    }

    if (colKey === 'pending') {
      return (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              rejectOrder('pending', order.id);
            }}
            className={actionGhost}
          >
            <X size={14} />
            Rifiuta
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              acceptOrder(order.id);
            }}
            className={actionPrimary}
          >
            <Check size={14} />
            Accetta
          </button>
        </div>
      );
    }

    if (colKey === 'accepted') {
      const later = isScheduledLater(order);
      return (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              rejectOrder('accepted', order.id);
            }}
            className={actionGhost}
          >
            <X size={14} />
            Annulla
          </button>
          {!later && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              completeOrder(order.id);
            }}
            className={actionPrimary}
          >
            <CheckCheck size={14} />
            Completa
          </button>
          )}
        </div>
      );
    }

    return null;
  };

  const chip = 'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold';
  const getOrderTypeBadge = (
    type: LiveOrder['type'],
    tableNumber?: string,
    isBookingPreOrder?: boolean
  ) => {
    if (isBookingPreOrder) {
      return (
        <span className={`${chip} bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300`}>
          <Calendar size={12} /> Prenotazione
        </span>
      );
    }
    switch (type) {
      case 'delivery':
        return (
          <span className={`${chip} bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300`}>
            <Bike size={12} /> Domicilio
          </span>
        );
      case 'takeaway':
        return (
          <span className={`${chip} bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300`}>
            <ShoppingBag size={12} /> Asporto
          </span>
        );
      case 'table':
        return (
          <span className={`${chip} bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300`}>
            <Utensils size={12} /> Tavolo {tableNumber || '-'}
          </span>
        );
      default:
        return null;
    }
  };

  // ─── Completati: gli ultimi in righe compatte, tutti gli altri nello storico di oggi ───
  const COMPLETED_VISIBLE = 5;
  const allCompleted = filteredOrders('completed');
  const completedRevenue = allCompleted.reduce((sum, o) => sum + o.total, 0);
  const timeOf = (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }) : '';
  // Orario richiesto dal cliente. Senza orario scelto (scheduled_at vuoto) vale "appena possibile".
  const serviceWhen = (o: LiveOrder): { kind: string; scheduled: boolean; label: string } | null => {
    // Pre-ordine di una prenotazione: l'orario è quello del tavolo.
    if (o.isBookingPreOrder && o.scheduledAt) {
      const d = new Date(o.scheduledAt);
      const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
      const otherDay = romeDay(d) !== romeDay(new Date());
      const day = otherDay
        ? d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Rome' }) + ' '
        : '';
      return { kind: 'Tavolo', scheduled: true, label: `${day}alle ${time}` };
    }
    if (o.type !== 'delivery' && o.type !== 'takeaway') return null;
    const kind = o.type === 'delivery' ? 'Consegna' : 'Ritiro';
    if (!o.scheduledAt) return { kind, scheduled: false, label: 'appena possibile' };
    const d = new Date(o.scheduledAt);
    const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
    const otherDay = romeDay(d) !== romeDay(new Date());
    const day = otherDay
      ? d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Rome' }) + ' '
      : '';
    return { kind, scheduled: true, label: `${day}alle ${time}` };
  };
  const typeLabel = (o: LiveOrder) =>
    o.isBookingPreOrder ? 'Prenotazione' : o.type === 'delivery' ? 'Domicilio' : o.type === 'takeaway' ? 'Asporto' : 'Tavolo';
  const typeIcon = (o: LiveOrder) =>
    o.isBookingPreOrder ? <Calendar size={14} /> : o.type === 'delivery' ? <Bike size={14} /> : o.type === 'takeaway' ? <ShoppingBag size={14} /> : <Utensils size={14} />;
  const renderCompactRow = (order: LiveOrder, large = false) => (
    <button
      key={order.id}
      type="button"
      onClick={() => setSelectedOrderId(order.id)}
      className={`flex w-full flex-shrink-0 items-center gap-3 rounded-xl bg-card px-3 py-2 text-left shadow-sm transition-shadow hover:shadow-md cursor-pointer ${
        large ? 'min-h-[3.5rem]' : 'min-h-[3rem]'
      }`}
    >
      <span
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
        title={typeLabel(order)}
      >
        {typeIcon(order)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{order.customer}</span>
        <span className="block truncate text-xs tabular-nums text-muted-foreground">
          #{order.orderNumber} · {timeOf(order.timestamp)}
        </span>
      </span>
      <span className="flex-shrink-0 text-sm font-bold tabular-nums text-foreground">€ {order.total.toFixed(2)}</span>
    </button>
  );

  const channelFilters: { key: typeof orderTypeFilter; label: string; icon?: React.ReactNode }[] = [
    { key: 'all', label: 'Tutti' },
    { key: 'delivery', label: 'Domicilio', icon: <Bike size={14} /> },
    { key: 'takeaway', label: 'Asporto', icon: <ShoppingBag size={14} /> },
    { key: 'table', label: 'Tavolo', icon: <Utensils size={14} /> },
  ];

  return (
    <div ref={rootRef} className="relative flex h-full min-h-0 flex-col gap-3">
      {/* Toast notifications */}
      <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-fade-in rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${
              toast.type === 'success' ? 'bg-slate-900 dark:bg-slate-100 dark:text-slate-900' : 'bg-red-600'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Intestazione */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
          Ordini live
          <span className="relative flex h-2.5 w-2.5" title="Connesso">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
        </h1>
        <div className="flex items-center gap-2">
          <AudioSettings />
          <button
            type="button"
            aria-pressed={immersive}
            aria-label={immersive ? 'Esci dallo schermo intero' : 'Schermo intero'}
            title={immersive ? 'Esci dallo schermo intero (Esc)' : 'Schermo intero'}
            onClick={toggleImmersive}
            className="touch-target inline-flex h-10 items-center gap-2 rounded-xl bg-muted/60 px-3 text-sm font-semibold text-foreground/80 transition-colors hover:bg-muted cursor-pointer"
          >
            {immersive ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            <span className="hidden sm:inline">{immersive ? 'Esci' : 'Schermo intero'}</span>
          </button>
        </div>
      </div>

      {/* Filtri: ricerca e pillole (canale + ordini persi) */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative w-full lg:w-auto lg:min-w-[14rem] lg:max-w-sm lg:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cerca per cliente o numero…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-xl border border-transparent bg-muted/60 pl-9 pr-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <FilterPills
          ariaLabel="Filtri"
          pills={[
            ...channelFilters.map((f) => ({
              key: f.key,
              label: f.label,
              icon: f.icon,
              active: orderTypeFilter === f.key,
              onClick: () => setOrderTypeFilter(f.key),
            })),
            {
              key: 'lost',
              label: 'Persi',
              icon: <Ban size={15} />,
              active: showLost,
              tone: 'danger' as const,
              badge: lostCount,
              dividerBefore: true,
              title: "Ordini non accettati in tempo: restano un'ora",
              onClick: () => setShowLost((v) => !v),
            },
            {
              key: 'scheduled',
              label: 'Programmati',
              icon: <CalendarClock size={15} />,
              active: showScheduled,
              badge: scheduledCount,
              title: 'Ordini già confermati per un altro giorno: passano in cucina da soli quel giorno',
              onClick: () => setShowScheduled((v) => !v),
            },
          ]}
        />
      </div>

      {/* Schede delle colonne (pannello stretto: una colonna alla volta) */}
      <div className={`${wide ? 'hidden' : 'flex'} gap-1.5 rounded-2xl bg-muted/60 p-1.5`} role="tablist">
        {viewColumns.map((col) => {
          const count = filteredOrders(col.key).length;
          const isActive = activeMobileTab === col.key;
          return (
            <button
              key={`tab-${col.key}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveMobileTab(col.key)}
              className={`touch-target flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[13px] font-bold leading-tight transition-colors cursor-pointer min-[480px]:h-11 min-[480px]:flex-row min-[480px]:gap-1.5 min-[480px]:text-sm ${
                isActive ? col.ui.tab : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <span className="hidden min-[480px]:inline">{col.icon}</span>
              <span className="whitespace-nowrap min-[480px]:order-2">{col.label}</span>
              <span
                className={`order-first min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-xs font-extrabold tabular-nums min-[480px]:order-last ${
                  isActive ? 'bg-white/25 text-inherit' : 'bg-card text-foreground'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban: ogni colonna scorre per conto suo, l'intestazione resta ferma */}
      <div className={`grid min-h-0 flex-1 gap-3 ${wide ? 'grid-cols-3' : 'grid-cols-1'}`}>
        {viewColumns.map((col) => {
          const isMobileHidden = !wide && activeMobileTab !== col.key;
          const colOrders = filteredOrders(col.key);
          const isCompleted = col.key === 'completed';
          const shownOrders = isCompleted ? colOrders.slice(0, COMPLETED_VISIBLE) : colOrders;
          return (
            <section
              key={`col-${col.key}`}
              aria-label={col.label}
              className={`min-h-0 flex-col overflow-hidden rounded-2xl ${col.ui.wrap} ${isMobileHidden ? 'hidden' : 'flex'}`}
            >
              <header className={`${wide ? 'flex' : 'hidden'} flex-shrink-0 items-center justify-between gap-2 px-3.5 pb-2 pt-3.5`}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${col.ui.iconWrap}`}>
                    {col.icon}
                  </span>
                  <h2 className="truncate text-base font-bold text-foreground">{col.label}</h2>
                  <span
                    className={`min-w-[1.75rem] rounded-full px-2 py-0.5 text-center text-sm font-extrabold tabular-nums ${col.ui.count} ${
                      col.key === 'pending' && colOrders.length > 0 && !showLost ? 'motion-safe:animate-pulse' : ''
                    }`}
                  >
                    {colOrders.length}
                  </span>
                </div>
                {col.key === 'accepted' && colOrders.length > 0 && (
                  <button
                    onClick={() => handlePrintAllAcceptedOrders(colOrders)}
                    className="inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-sky-700 transition-colors hover:bg-sky-500/10 dark:text-sky-300 cursor-pointer"
                    title="Stampa tutte le comande in corso"
                  >
                    <Printer size={14} /> Stampa tutto
                  </button>
                )}
                {isCompleted && colOrders.length > 0 && (
                  <span className="flex-shrink-0 text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    € {completedRevenue.toFixed(2)}
                  </span>
                )}
              </header>
              {!wide && col.key === 'accepted' && colOrders.length > 0 && (
                <div className="flex flex-shrink-0 justify-end px-2.5 pt-2.5">
                  <button
                    onClick={() => handlePrintAllAcceptedOrders(colOrders)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-bold text-sky-700 transition-colors hover:bg-sky-500/10 dark:text-sky-300 cursor-pointer"
                  >
                    <Printer size={14} /> Stampa tutto
                  </button>
                </div>
              )}
              {!wide && isCompleted && colOrders.length > 0 && (
                <p className="flex-shrink-0 px-3.5 pt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Oggi · {colOrders.length} {colOrders.length === 1 ? 'ordine' : 'ordini'} · € {completedRevenue.toFixed(2)}
                </p>
              )}

              <div
                className={`flex-1 gap-2.5 overflow-y-auto overscroll-contain px-2.5 pb-3 pt-2.5 ${
                  !wide && twoCols ? 'grid grid-cols-2 auto-rows-max content-start items-stretch' : 'flex flex-col'
                }`}
              >
                {colOrders.length === 0 && (
                  <div className="col-span-2 flex flex-1 flex-col items-center justify-center gap-2 rounded-xl bg-card/70 px-4 py-10 text-center">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-full ${col.ui.iconWrap}`}>{col.icon}</span>
                    <p className="text-sm font-semibold text-foreground">Nessun ordine</p>
                    <p className="text-xs text-muted-foreground">{col.hint}</p>
                  </div>
                )}
                {shownOrders.map((order) => {
                  if (isCompleted) return renderCompactRow(order);
                  const expired = order.status === 'expired';
                  return (
                    <article
                      key={order.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedOrderId(order.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedOrderId(order.id);
                        }
                      }}
                      className={`group flex flex-shrink-0 flex-col gap-2 rounded-xl p-3 shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary cursor-pointer ${
                        expired ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-card'
                      }`}
                    >
                      {/* Riga 1: numero e canale, tempo trascorso e stampa */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          {expired && (
                            <span className="inline-flex flex-shrink-0 items-center rounded-md bg-rose-500 px-1.5 py-0.5 text-xs font-extrabold uppercase text-white">
                              Scaduto
                            </span>
                          )}
                          <span className="text-sm font-bold tabular-nums text-muted-foreground">#{order.orderNumber}</span>
                          {getOrderTypeBadge(order.type, order.tableNumber, order.isBookingPreOrder)}
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-muted-foreground">
                            <Clock size={12} />
                            {formatMinutesAgo(order.minutesAgo)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintSingleOrder(order.id);
                            }}
                            className="-mr-1 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                            title="Stampa comanda"
                            aria-label="Stampa comanda"
                          >
                            <Printer size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Riga 2: cliente e totale */}
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="line-clamp-2 min-w-0 break-words text-base font-bold leading-tight text-foreground">
                          {order.customer}
                        </h3>
                        <span className="flex-shrink-0 text-base font-black tabular-nums text-foreground">
                          € {order.total.toFixed(2)}
                        </span>
                      </div>

                      {/* Riga 3: telefono, orario richiesto e scadenza, affiancati */}
                      {(() => {
                        const when = serviceWhen(order);
                        const waiting = (order.status === 'new' || order.status === 'pending') && order.acceptDeadline;
                        if (!order.phone && !when && !waiting) return null;
                        const chipCls = 'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold';
                        return (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            {order.phone && (
                              <a
                                href={`tel:${order.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                                title="Chiama il cliente"
                              >
                                <Phone size={12} />
                                {order.phone}
                              </a>
                            )}
                            {when && (
                              <span
                                className={`${chipCls} ${
                                  when.scheduled
                                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200'
                                    : 'bg-muted text-foreground/70'
                                }`}
                              >
                                <Clock size={13} className="flex-shrink-0" />
                                {when.kind} {when.label}
                              </span>
                            )}
                            {waiting &&
                              (() => {
                                const deadline = new Date(order.acceptDeadline as string).getTime();
                                if (order.acceptanceMode === 'deferred') {
                                  return (
                                    <span className={`${chipCls} bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300`}>
                                      <Timer size={13} className="flex-shrink-0" />
                                      Conferma entro{' '}
                                      {new Date(deadline).toLocaleString('it-IT', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  );
                                }
                                const left = Math.max(0, Math.ceil((deadline - nowMs) / 1000));
                                const urgent = left <= 60;
                                return (
                                  <span
                                    className={`${chipCls} ${
                                      urgent
                                        ? 'bg-red-50 text-red-700 motion-safe:animate-pulse dark:bg-red-500/10 dark:text-red-300'
                                        : 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300'
                                    }`}
                                  >
                                    <Timer size={13} className="flex-shrink-0" />
                                    Accetta entro
                                    <span className="font-mono tabular-nums">
                                      {String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}
                                    </span>
                                  </span>
                                );
                              })()}
                          </div>
                        );
                      })()}

                      {/* Piatti: quantità davanti, come su una comanda */}
                      <ul className="space-y-1">
                        {order.items.map((item, idx) => (
                          <li key={`${order.id}-item-${idx}`} className="flex items-start gap-2 text-sm text-foreground">
                            <span className="min-w-[1.75rem] rounded-md bg-muted px-1 py-0.5 text-center text-[13px] font-extrabold tabular-nums">
                              {item.qty}×
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="block font-semibold leading-snug">{item.name}</span>
                              {(item.addedIngredients?.length || item.removedIngredients?.length) ? (
                                <span className="block text-xs font-medium leading-snug text-muted-foreground">
                                  {[
                                    ...(item.addedIngredients || []).map((a) => '+' + extraLabel(a)),
                                    ...(item.removedIngredients || []).map((r) => '-' + r),
                                  ].join(', ')}
                                </span>
                              ) : null}
                              {item.note ? (
                                <span className="block text-xs font-semibold italic leading-snug text-amber-700 dark:text-amber-400">
                                  “{item.note}”
                                </span>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>

                      {/* Informazioni di servizio */}
                      {(order.address ||
                        (order.type === 'table' && !order.isBookingPreOrder && order.tableNumber) ||
                        order.isBookingPreOrder) && (
                        <div className="flex flex-col gap-1 text-xs">
                          {order.isBookingPreOrder && (
                            <div className="flex items-center gap-1.5 font-semibold text-purple-700 dark:text-purple-300">
                              <Calendar size={13} className="flex-shrink-0" />
                              Pre-ordine tavolo
                            </div>
                          )}
                          {order.type === 'table' && !order.isBookingPreOrder && order.tableNumber && (
                            <div className="flex items-center gap-1.5 font-semibold text-sky-700 dark:text-sky-300">
                              <Utensils size={13} className="flex-shrink-0" />
                              Servire al tavolo {order.tableNumber}
                            </div>
                          )}
                          {order.address && (
                            <div className="flex items-start gap-1.5 font-medium text-muted-foreground">
                              <MapPin size={13} className="mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{order.address}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Piede: pagamento e azioni sulla stessa riga (vanno a capo solo se manca lo spazio) */}
                      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2">
                        {order.paymentStatus === 'paid' ? (
                          <span className="inline-flex flex-shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                            Pagato online
                          </span>
                        ) : order.paymentStatus === 'refunded' || order.paymentStatus === 'partially_refunded' ? (
                          <span className="inline-flex flex-shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                            Rimborsato
                          </span>
                        ) : order.paymentMethod === 'cash' || order.paymentMethod === 'pos' ? (
                          <span className="inline-flex flex-shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                            Da incassare · {order.paymentMethod === 'pos' ? 'POS' : 'Contanti'}
                          </span>
                        ) : null}
                        <div className="min-w-[13rem] flex-1">{renderActions(col.key, order)}</div>
                      </div>
                    </article>
                  );
                })}
                {isCompleted && colOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowHistory(true)}
                    className="touch-target col-span-2 mt-0.5 flex h-11 w-full flex-shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/10 dark:text-emerald-300 cursor-pointer"
                  >
                    <History size={16} />
                    {colOrders.length > COMPLETED_VISIBLE ? `Vedi tutti gli ordini di oggi (${colOrders.length})` : 'Storico di oggi'}
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Storico di oggi: tutti gli ordini completati della giornata, solo consultazione */}
      {showHistory && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => setShowHistory(false)} />
          <aside
            className="relative z-10 flex h-full w-full flex-col bg-card shadow-2xl animate-in slide-in-from-right duration-200 sm:w-[clamp(24rem,45vw,30rem)]"
            aria-label="Storico di oggi"
          >
            <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-foreground">Storico di oggi</h2>
                <p className="text-sm text-muted-foreground">Ordini completati dalla mezzanotte</p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                aria-label="Chiudi"
                className="touch-target rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 px-4 pb-3">
              {[
                { label: 'Ordini', value: String(allCompleted.length) },
                { label: 'Incasso', value: `€ ${completedRevenue.toFixed(2)}` },
                {
                  label: 'Scontrino medio',
                  value: `€ ${(allCompleted.length ? completedRevenue / allCompleted.length : 0).toFixed(2)}`,
                },
              ].map((k) => (
                <div key={k.label} className="rounded-xl bg-muted/60 px-3 py-2.5">
                  <p className="text-xs font-semibold text-muted-foreground">{k.label}</p>
                  <p className="mt-0.5 text-base font-black tabular-nums text-foreground">{k.value}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-3 pb-4">
              {allCompleted.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Nessun ordine completato oggi.</p>
              ) : (
                allCompleted.map((order) => renderCompactRow(order, true))
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Right Sidebar Drawer Modal */}
      {(() => {
        const selectedBase = orders.find((o) => o.id === selectedOrderId);
        if (!selectedOrderId || !selectedBase) return null;
        const selectedOrder = withAliases(selectedBase);

        const selectedOrderStatus = getOrderStatus(selectedOrder);

        return (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300 cursor-pointer"
              onClick={() => setSelectedOrderId(null)}
            />

            <div className="relative w-full sm:w-[clamp(26rem,50vw,30rem)] h-full bg-white dark:bg-slate-950 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">
                      #{selectedOrder.order_number || selectedOrder.id.replace('ord-', '').toUpperCase()}
                    </span>
                    {selectedOrderStatus === 'new' || selectedOrderStatus === 'pending' ? (
                      <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-bold px-2 py-0.5 rounded border border-amber-500/20">
                        Da Accettare
                      </span>
                    ) : selectedOrderStatus === 'expired' ? (
                      <span className="bg-rose-500 text-white dark:bg-rose-950/40 dark:text-rose-450 text-[11px] font-extrabold px-2 py-0.5 rounded border border-rose-500/20 animate-pulse">
                        Scaduto
                      </span>
                    ) : selectedOrderStatus === 'accepted' ||
                      selectedOrderStatus === 'preparing' ||
                      selectedOrderStatus === 'delivering' ? (
                      <span className="bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[11px] font-bold px-2 py-0.5 rounded border border-blue-500/20">
                        In Corso
                      </span>
                    ) : selectedOrderStatus === 'completed' ||
                      selectedOrderStatus === 'delivered' ? (
                      <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                        Completato
                      </span>
                    ) : (
                      <span className="bg-rose-500/10 text-rose-700 dark:text-rose-450 text-[11px] font-bold px-2 py-0.5 rounded border border-rose-500/20">
                        Rifiutato
                      </span>
                    )}
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {selectedOrder.customerName ||
                      selectedOrder.customer?.name ||
                      'Dettaglio Ordine'}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedOrderId(null)}
                  className="touch-target p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Canale / Tipo Ordine & Data */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-100 dark:border-slate-900/60">
                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider mb-1">
                      Tipo Canale
                    </span>
                    <div className="flex items-center gap-1.5">
                      {selectedOrder.type === 'domicilio' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <Bike size={13} className="text-slate-500" /> Domicilio
                        </span>
                      ) : selectedOrder.type === 'asporto' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <ShoppingBag size={13} className="text-slate-500" /> Asporto
                        </span>
                      ) : selectedOrder.type === 'prenotazione_tavolo' ||
                        selectedOrder.id.startsWith('PRE-') ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-400">
                          <Calendar size={13} className="text-purple-500" /> Prenotazione
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                          <Utensils size={13} className="text-blue-500" /> Tavolo{' '}
                          {selectedOrder.tableNumber || ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider mb-1">
                      Ricevuto Il
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block tabular-nums">
                      {new Date(selectedOrder.timestamp || selectedOrder.createdAt).toLocaleString(
                        'it-IT',
                        {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </span>
                  </div>

                  {(selectedOrder.deliveryTime ||
                    selectedOrder.type === 'domicilio' ||
                    selectedOrder.type === 'asporto') && (
                    <div className="col-span-2 border-t border-slate-100 dark:border-slate-900/60 pt-2 mt-1">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider mb-0.5">
                        Orario Consegna/Ritiro
                      </span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        {!selectedOrder.deliveryTime || selectedOrder.deliveryTime === 'asap'
                          ? 'IL PRIMA POSSIBILE (ASAP)'
                          : `ALLE ${selectedOrder.deliveryTime}`}
                        {selectedOrder.deliveryDate &&
                          ` del ${new Date(selectedOrder.deliveryDate).toLocaleDateString('it-IT')}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Informazioni Cliente */}
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Dettaglio Cliente
                  </h3>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <User size={13} />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-none mb-0.5">
                          Nominativo
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {selectedOrder.customerName || selectedOrder.customer?.name || 'Cliente'}
                        </span>
                      </div>
                    </div>

                    {(selectedOrder.customer_phone || selectedOrder.customer?.phone) && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400">
                          <Phone size={13} />
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-none mb-0.5">
                            Telefono
                          </span>
                          <a
                            href={`tel:${selectedOrder.customer_phone || selectedOrder.customer?.phone}`}
                            className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400 block"
                          >
                            {selectedOrder.customer_phone || selectedOrder.customer?.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedOrder.customer?.email &&
                      selectedOrder.customer.email !== 'mock@example.com' &&
                      selectedOrder.customer.email !== 'prenotazione@internal.it' && (
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400">
                            <Mail size={13} />
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-none mb-0.5">
                              Email
                            </span>
                            <a
                              href={`mailto:${selectedOrder.customer.email}`}
                              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline block truncate max-w-[280px]"
                            >
                              {selectedOrder.customer.email}
                            </a>
                          </div>
                        </div>
                      )}

                    {selectedOrder.type === 'domicilio' &&
                      (selectedOrder.address || selectedOrder.customer?.address) && (
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400 mt-0.5">
                            <MapPin size={13} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-none mb-0.5">
                              Indirizzo Consegna
                            </span>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block leading-tight">
                              {selectedOrder.address || selectedOrder.customer?.address}
                            </span>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.address || selectedOrder.customer?.address || '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400 mt-1 cursor-pointer"
                            >
                              Mappa Google <ExternalLink size={9} />
                            </a>
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* Note Cucina / Ordine */}
                {selectedOrder.notes && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2">
                    <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block mb-0.5">
                        Note dalla Cucina
                      </span>
                      <p className="text-xs text-amber-900 dark:text-amber-300 italic leading-tight">
                        &quot;{selectedOrder.notes}&quot;
                      </p>
                    </div>
                  </div>
                )}

                {/* Dettagli Piatti / Carrello */}
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Riepilogo Piatti
                  </h3>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <div className="divide-y divide-slate-100 dark:divide-slate-900">
                      {orderLines(selectedOrder).map((item: any, idx: number) => {
                        const customNotes =
                          item.addedIngredients?.length > 0 || item.removedIngredients?.length > 0
                            ? item.addedIngredients
                                ?.map((i: any) => '+' + extraLabel(i))
                                .concat(item.removedIngredients?.map((i: string) => '-' + i))
                                .join(', ')
                            : '';
                        const itemNote = item.note;

                        return (
                          <div
                            key={idx}
                            className="p-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/35 transition-colors"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                                    {item.qty}x
                                  </span>
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {item.name}
                                  </span>
                                </div>
                                {customNotes && (
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                    <strong>Personalizzazioni:</strong> {customNotes}
                                  </div>
                                )}
                                {itemNote && (
                                  <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium italic mt-0.5 leading-snug flex items-center gap-1">
                                    <MessageSquare size={10} /> {itemNote}
                                  </div>
                                )}
                              </div>
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums flex-shrink-0">
                                € {((item.price || item.originalPrice || 0) * item.qty).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Totali */}
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-3 border-t border-slate-100 dark:border-slate-900 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        TOTALE COMPLESSIVO
                      </span>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                        € {(selectedOrder.total || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visual Mockup Thermal Receipt Comanda */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-sans font-bold">
                      Scontrino Comanda
                    </h3>
                    <button
                      onClick={() => handlePrintSingleOrder(selectedOrder.id)}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-sans"
                    >
                      <Printer size={10} /> Stampa Comanda
                    </button>
                  </div>

                  <div className="bg-[#fcfbf9] text-black border border-amber-100/50 shadow-inner rounded-xl p-4 font-mono text-[11px] select-none max-w-sm mx-auto relative overflow-hidden dark:bg-[#faf9f6] dark:text-black">
                    <div className="absolute top-0 inset-x-0 h-1 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 to-transparent" />

                    <div className="text-center space-y-0.5">
                      <div className="text-xs font-bold tracking-widest uppercase">
                        {user?.restaurantName || 'iGOdelivering'}
                      </div>
                      <div className="text-[11px] uppercase font-bold text-slate-600">
                        COMANDA CUCINA
                      </div>
                      <div className="text-[8px] text-slate-500">
                        ID: {selectedOrder.order_number || selectedOrder.id.replace('ord-', '').toUpperCase()}
                      </div>
                      <div className="text-[8px] text-slate-500">
                        {new Date(
                          selectedOrder.timestamp || selectedOrder.createdAt
                        ).toLocaleString('it-IT')}
                      </div>
                    </div>

                    <div className="border-t border-dashed border-black/35 my-2" />

                    <div className="text-center font-bold text-[11px] tracking-wide py-0.5 border-y border-dashed border-black/35 my-1.5">
                      {selectedOrder.type === 'domicilio'
                        ? 'CONSEGNA A DOMICILIO'
                        : selectedOrder.type === 'asporto'
                          ? 'ASPORTO (RITIRO)'
                          : selectedOrder.type === 'prenotazione_tavolo' ||
                              selectedOrder.id.startsWith('PRE-')
                            ? 'PRENOTAZIONE TAVOLO'
                            : `AL TAVOLO ${selectedOrder.tableNumber || ''}`}
                    </div>

                    {(selectedOrder.deliveryTime ||
                      selectedOrder.type === 'domicilio' ||
                      selectedOrder.type === 'asporto') && (
                      <div className="text-center font-bold text-[11px] bg-black/5 p-1 rounded my-1.5 border border-black/10">
                        ORARIO:{' '}
                        {!selectedOrder.deliveryTime || selectedOrder.deliveryTime === 'asap'
                          ? 'IL PRIMA POSSIBILE'
                          : `ALLE ${selectedOrder.deliveryTime}`}
                      </div>
                    )}

                    <div className="border-t border-dashed border-black/35 my-1.5" />

                    <div className="space-y-2 my-2">
                      {orderLines(selectedOrder).map((item: any, idx: number) => {
                        const itemCustomStr =
                          item.addedIngredients?.length > 0 || item.removedIngredients?.length > 0
                            ? item.addedIngredients
                                ?.map((i: any) => '+' + extraLabel(i))
                                .concat(item.removedIngredients?.map((i: string) => '-' + i))
                                .join(', ')
                            : '';
                        return (
                          <div key={idx} className="space-y-0.5">
                            <div className="flex justify-between font-bold">
                              <span>
                                {item.qty}x {item.name}
                              </span>
                              <span>
                                € {((item.price || item.originalPrice || 0) * item.qty).toFixed(2)}
                              </span>
                            </div>
                            {itemCustomStr && (
                              <div className="text-[11px] text-slate-700 pl-3 leading-tight">
                                * {itemCustomStr}
                              </div>
                            )}
                            {item.note && (
                              <div className="text-[11px] text-red-600 pl-3 font-bold italic leading-tight">
                                NOTA: {item.note}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {selectedOrder.notes && (
                      <div className="bg-black/5 p-1.5 border border-black/10 rounded text-[11px] leading-tight my-1.5">
                        <strong>NOTA CUCINA:</strong> {selectedOrder.notes}
                      </div>
                    )}

                    <div className="border-t border-dashed border-black/35 my-2" />

                    <div className="space-y-0.5 text-[11px] text-slate-700">
                      <div>
                        <strong>Cliente:</strong>{' '}
                        {selectedOrder.customerName || selectedOrder.customer?.name || 'Cliente'}
                      </div>
                      {(selectedOrder.customer_phone || selectedOrder.customer?.phone) && (
                        <div>
                          <strong>Tel:</strong> {selectedOrder.customer_phone || selectedOrder.customer?.phone}
                        </div>
                      )}
                      {selectedOrder.type === 'domicilio' &&
                        (selectedOrder.address || selectedOrder.customer?.address) && (
                          <div className="leading-tight">
                            <strong>Indirizzo:</strong>{' '}
                            {selectedOrder.address || selectedOrder.customer?.address}
                          </div>
                        )}
                    </div>

                    <div className="border-t-2 border-dashed border-black my-2" />

                    <div className="flex justify-between font-extrabold text-[12px]">
                      <span>TOTALE CUCINA:</span>
                      <span>€ {(selectedOrder.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Action Bar / Footer */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex gap-2.5">
                <button
                  onClick={() => handlePrintSingleOrder(selectedOrder.id)}
                  className="min-h-11 min-w-11 p-2 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center cursor-pointer"
                  title="Stampa comanda"
                >
                  <Printer size={16} />
                </button>

                {selectedOrderStatus === 'new' || selectedOrderStatus === 'pending' ? (
                  <>
                    <button
                      onClick={() => {
                        rejectOrder('pending', selectedOrder.id);
                        setSelectedOrderId(null);
                      }}
                      className="min-h-11 flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-700 dark:border-slate-850 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-all font-bold text-sm cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <X size={14} /> Rifiuta
                    </button>
                    <button
                      onClick={() => {
                        acceptOrder(selectedOrder.id);
                      }}
                      className="min-h-11 flex-1 py-2 px-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all font-bold text-sm cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Check size={14} /> Accetta
                    </button>
                  </>
                ) : selectedOrderStatus === 'expired' ? (
                  <>
                    {selectedOrder.customer_phone && (
                      <a
                        href={`tel:${selectedOrder.customer_phone}`}
                        className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-850 dark:hover:bg-slate-900 dark:text-slate-300 transition-all font-bold text-xs cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Phone size={14} /> Chiama il cliente
                      </a>
                    )}
                    {selectedOrder.payment_method !== 'online' ? (
                      <button
                        onClick={async () => {
                          await reactivateExpired(selectedOrder.id, selectedOrder.order_number);
                          setSelectedOrderId(null);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-550 text-white dark:bg-emerald-600 dark:hover:bg-emerald-750 transition-all font-bold text-xs cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                      >
                        <ChefHat size={14} /> Riattiva in Preparazione
                      </button>
                    ) : (
                      <p className="flex-1 self-center text-[11px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                        Scaduto: il cliente non è stato addebitato.
                      </p>
                    )}
                  </>
                ) : selectedOrderStatus === 'accepted' ||
                  selectedOrderStatus === 'preparing' ||
                  selectedOrderStatus === 'delivering' ? (
                  <>
                    <button
                      onClick={() => {
                        rejectOrder('accepted', selectedOrder.id);
                        setSelectedOrderId(null);
                      }}
                      className="min-h-11 flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-700 dark:border-slate-850 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-all font-bold text-sm cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <X size={14} /> Annulla
                    </button>
                    {!isScheduledLater(selectedOrder as any) && (
                    <button
                      onClick={() => {
                        completeOrder(selectedOrder.id);
                      }}
                      className="min-h-11 flex-1 py-2 px-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all font-bold text-sm cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <CheckCheck size={14} /> Completa
                    </button>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
