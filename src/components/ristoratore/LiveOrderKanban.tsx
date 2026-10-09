'use client';
import React, { useState, useEffect, useRef } from 'react';
import { confirmAction } from '@/lib/notify';
import {
  Clock,
  ChefHat,
  CheckCheck,
  AlertCircle,
  Bell,
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
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/hooks/useOrders';
import { useAudioNotification } from '@/components/ristoratore/AudioNotificationProvider';

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
      wrap: 'border-amber-300/70 bg-amber-50/60 dark:border-amber-500/25 dark:bg-amber-500/[0.06]',
      bar: 'bg-amber-500',
      iconWrap: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
      count: 'bg-amber-500 text-white',
      tab: 'bg-amber-500 text-white shadow-sm',
      accent: 'border-l-amber-500',
    },
  },
  {
    key: 'accepted',
    label: 'In corso',
    hint: 'Gli ordini accettati restano qui finché non sono pronti',
    icon: <ChefHat size={16} />,
    ui: {
      wrap: 'border-sky-300/70 bg-sky-50/60 dark:border-sky-500/25 dark:bg-sky-500/[0.06]',
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
      wrap: 'border-emerald-300/60 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/[0.05]',
      bar: 'bg-emerald-500/70',
      iconWrap: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
      count: 'bg-emerald-600/80 text-white',
      tab: 'bg-emerald-600 text-white shadow-sm',
      accent: 'border-l-emerald-500/60',
    },
  },
];

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
  return {
    ...o,
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [ticker, setTicker] = useState(0);
  const [activeMobileTab, setActiveMobileTab] = useState<OrderStatus>('pending');
  // Tre colonne solo se il pannello è largo abbastanza: dipende dalla larghezza
  // reale (sidebar compresa), non da quella dello schermo.
  const rootRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= 800));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      isBookingPreOrder: enriched.type === 'prenotazione_tavolo' || (enriched.id && enriched.id.startsWith('PRE-')),
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

  const filteredOrders = (colKey: OrderStatus) => {
    return orders
      .filter((o) => {
        const orderStatus = o.status;
        if (colKey === 'pending') return orderStatus === 'new' || orderStatus === 'pending' || orderStatus === 'expired';
        if (colKey === 'accepted')
          return (
            orderStatus === 'accepted' ||
            orderStatus === 'preparing' ||
            orderStatus === 'ready' ||
            orderStatus === 'delivering'
          );
        if (colKey === 'completed')
          return orderStatus === 'completed' || orderStatus === 'delivered';
        return false;
      })
      .map(mapFlatOrder)
      .filter((order) => {
        const matchesSearch =
          order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = orderTypeFilter === 'all' || order.type === orderTypeFilter;
        
        let matchesStatus = true;
        if (statusFilter === 'active') {
          matchesStatus = order.status !== 'expired';
        } else if (statusFilter === 'expired') {
          matchesStatus = order.status === 'expired';
        }

        return matchesSearch && matchesType && matchesStatus;
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
        const rawOrder = orders.find((o) => o.id === flatOrder.id) || flatOrder;

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
    'touch-target inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold transition-colors cursor-pointer';
  const actionGhost = `${actionBase} border border-border bg-card text-foreground hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:hover:border-red-500/40 dark:hover:bg-red-950/30 dark:hover:text-red-400`;
  const actionNeutral = `${actionBase} border border-border bg-card text-foreground hover:bg-muted`;
  const actionPrimary = `${actionBase} bg-emerald-600 text-white shadow-sm hover:bg-emerald-700`;

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
                <Check size={15} />
                Riattiva
              </button>
            )}
          </div>
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
            <X size={15} />
            Rifiuta
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              acceptOrder(order.id);
            }}
            className={actionPrimary}
          >
            <Check size={15} />
            Accetta
          </button>
        </div>
      );
    }

    if (colKey === 'accepted') {
      return (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              rejectOrder('accepted', order.id);
            }}
            className={actionGhost}
          >
            <X size={15} />
            Annulla
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              completeOrder(order.id);
            }}
            className={actionPrimary}
          >
            <CheckCheck size={15} />
            Completa
          </button>
        </div>
      );
    }

    if (colKey === 'completed') {
      return (
        <div className="flex justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              rejectOrder('completed', order.id);
            }}
            className="touch-target -mb-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 cursor-pointer"
          >
            Rimuovi dalla vista
          </button>
        </div>
      );
    }

    return null;
  };

  const chip = 'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold';
  const getOrderTypeBadge = (
    type: LiveOrder['type'],
    tableNumber?: string,
    isBookingPreOrder?: boolean
  ) => {
    if (isBookingPreOrder) {
      return (
        <span className={`${chip} border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300`}>
          <Calendar size={12} /> Prenotazione
        </span>
      );
    }
    switch (type) {
      case 'delivery':
        return (
          <span className={`${chip} border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300`}>
            <Bike size={12} /> Domicilio
          </span>
        );
      case 'takeaway':
        return (
          <span className={`${chip} border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300`}>
            <ShoppingBag size={12} /> Asporto
          </span>
        );
      case 'table':
        return (
          <span className={`${chip} border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300`}>
            <Utensils size={12} /> Tavolo {tableNumber || '-'}
          </span>
        );
      default:
        return null;
    }
  };

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

      {/* Intestazione: titolo, stato della connessione, suoni */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            Ordini live
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
          </h1>
          <span className="hidden text-sm text-muted-foreground sm:inline">Gestione ordinazioni in tempo reale</span>
        </div>
        <button
          type="button"
          aria-pressed={!isMuted}
          onClick={() => setIsMuted(!isMuted)}
          className={`touch-target inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors cursor-pointer ${
            isMuted
              ? 'border-border bg-card text-muted-foreground hover:bg-muted'
              : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
          }`}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          {isMuted ? 'Suoni disattivati' : 'Suoni attivi'}
        </button>
      </div>

      {/* Filtri: ricerca, canale (a pulsanti, comodi al tocco), stato */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cerca per cliente o numero…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1" role="group" aria-label="Canale">
          {channelFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={orderTypeFilter === f.key}
              onClick={() => setOrderTypeFilter(f.key)}
              className={`touch-target inline-flex h-9 flex-shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors cursor-pointer ${
                orderTypeFilter === f.key
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          aria-label="Stato"
          className="h-11 rounded-xl border border-border bg-card pl-3 pr-9 text-base text-foreground focus:border-primary focus:outline-none"
        >
          <option value="all">Tutti gli stati</option>
          <option value="active">Solo attivi</option>
          <option value="expired">Solo persi</option>
        </select>
      </div>

      {/* Schede delle colonne (pannello stretto: una colonna alla volta) */}
      <div className={`${wide ? 'hidden' : 'flex'} gap-1.5 rounded-2xl border border-border bg-card p-1.5`} role="tablist">
        {columns.map((col) => {
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
                  isActive ? 'bg-white/25 text-inherit' : 'bg-muted text-foreground'
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
        {columns.map((col) => {
          const isMobileHidden = !wide && activeMobileTab !== col.key;
          const colOrders = filteredOrders(col.key);
          return (
            <section
              key={`col-${col.key}`}
              aria-label={col.label}
              className={`min-h-0 flex-col overflow-hidden rounded-2xl border ${col.ui.wrap} ${
                isMobileHidden ? 'hidden' : 'flex'
              }`}
            >
              <div className={`h-1 flex-shrink-0 ${col.ui.bar}`} />
              <header className={`${wide ? 'flex' : 'hidden'} flex-shrink-0 items-center justify-between gap-2 px-3 pb-2 pt-3`}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${col.ui.iconWrap}`}>
                    {col.icon}
                  </span>
                  <h2 className="truncate text-base font-bold text-foreground">{col.label}</h2>
                  <span
                    className={`min-w-[1.75rem] rounded-full px-2 py-0.5 text-center text-sm font-extrabold tabular-nums ${col.ui.count} ${
                      col.key === 'pending' && colOrders.length > 0 ? 'motion-safe:animate-pulse' : ''
                    }`}
                  >
                    {colOrders.length}
                  </span>
                </div>
                {col.key === 'accepted' && colOrders.length > 0 && (
                  <button
                    onClick={() => handlePrintAllAcceptedOrders(colOrders)}
                    className="touch-target inline-flex h-9 flex-shrink-0 items-center gap-1.5 rounded-lg border border-sky-200 bg-white/70 px-2.5 text-xs font-bold text-sky-700 transition-colors hover:bg-white dark:border-sky-500/30 dark:bg-transparent dark:text-sky-300 cursor-pointer"
                    title="Stampa tutte le comande in corso"
                  >
                    <Printer size={14} /> Stampa tutto
                  </button>
                )}
              </header>

              {!wide && col.key === 'accepted' && colOrders.length > 0 && (
                <div className="flex flex-shrink-0 justify-end px-2.5 pt-2.5">
                  <button
                    onClick={() => handlePrintAllAcceptedOrders(colOrders)}
                    className="touch-target inline-flex h-10 items-center gap-1.5 rounded-lg border border-sky-200 bg-white/70 px-3 text-sm font-bold text-sky-700 transition-colors hover:bg-white dark:border-sky-500/30 dark:bg-transparent dark:text-sky-300 cursor-pointer"
                  >
                    <Printer size={14} /> Stampa tutto
                  </button>
                </div>
              )}
              <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain px-2.5 pb-3 pt-2.5">
                {colOrders.length === 0 && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/60 px-4 py-10 text-center">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-full ${col.ui.iconWrap}`}>{col.icon}</span>
                    <p className="text-sm font-semibold text-foreground">Nessun ordine</p>
                    <p className="text-xs text-muted-foreground">{col.hint}</p>
                  </div>
                )}
                {colOrders.map((order) => {
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
                      className={`group flex flex-shrink-0 flex-col gap-3 rounded-xl border border-l-4 bg-card p-3.5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary cursor-pointer ${
                        expired
                          ? 'border-2 border-dashed border-rose-400/80 bg-rose-500/5 opacity-70 hover:opacity-100'
                          : `border-border ${col.ui.accent}`
                      } ${col.key === 'completed' && !expired ? 'opacity-90 hover:opacity-100' : ''}`}
                    >
                      {/* Testa: numero, canale, tempo trascorso, stampa */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {expired && (
                              <span className="inline-flex flex-shrink-0 items-center rounded-md bg-rose-500 px-1.5 py-0.5 text-xs font-extrabold uppercase text-white">
                                Scaduto
                              </span>
                            )}
                            <span className="text-sm font-bold tabular-nums text-muted-foreground">#{order.orderNumber}</span>
                            {getOrderTypeBadge(order.type, order.tableNumber, order.isBookingPreOrder)}
                          </div>
                          <h3 className="line-clamp-2 break-words text-base font-bold leading-tight text-foreground">{order.customer}</h3>
                        </div>
                        <div className="flex flex-shrink-0 flex-col items-end gap-1">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-muted-foreground">
                            <Clock size={12} />
                            {formatMinutesAgo(order.minutesAgo)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintSingleOrder(order.id);
                            }}
                            className="touch-target -mr-1.5 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                            title="Stampa comanda"
                            aria-label="Stampa comanda"
                          >
                            <Printer size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Piatti: quantità davanti, come su una comanda */}
                      <ul className="space-y-2">
                        {order.items.map((item, idx) => (
                          <li key={`${order.id}-item-${idx}`} className="flex items-start gap-2.5 text-sm text-foreground">
                            <span className="min-w-[2rem] rounded-md bg-muted px-1.5 py-0.5 text-center text-sm font-extrabold tabular-nums">
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
                                <span className="mt-0.5 block text-xs font-semibold italic leading-snug text-amber-700 dark:text-amber-400">
                                  “{item.note}”
                                </span>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>

                      {/* Scadenza per accettare */}
                      {(order.status === 'new' || order.status === 'pending') &&
                        order.acceptDeadline &&
                        (() => {
                          const deadline = new Date(order.acceptDeadline).getTime();
                          if (order.acceptanceMode === 'deferred') {
                            return (
                              <div className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                                Preordine: da confermare entro{' '}
                                {new Date(deadline).toLocaleString('it-IT', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            );
                          }
                          const left = Math.max(0, Math.ceil((deadline - nowMs) / 1000));
                          const urgent = left <= 60;
                          return (
                            <div
                              className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                                urgent
                                  ? 'bg-red-50 text-red-700 motion-safe:animate-pulse dark:bg-red-500/10 dark:text-red-300'
                                  : 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300'
                              }`}
                            >
                              <span>Accetta entro</span>
                              <span className="font-mono text-sm tabular-nums">
                                {String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}
                              </span>
                            </div>
                          );
                        })()}

                      {/* Informazioni di servizio */}
                      {(order.phone ||
                        order.address ||
                        (order.type === 'table' && !order.isBookingPreOrder && order.tableNumber) ||
                        order.isBookingPreOrder ||
                        (order.scheduledAt && order.deliveryTime)) && (
                        <div className="flex flex-col gap-1.5 text-xs">
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
                          {order.scheduledAt && order.deliveryTime && (
                            <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                              <Clock size={13} className="flex-shrink-0" />
                              <span>
                                Programmato:{' '}
                                {order.deliveryDate
                                  ? `${new Date(order.deliveryDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} `
                                  : ''}
                                alle {order.deliveryTime}
                              </span>
                            </div>
                          )}
                          {order.phone && (
                            <a
                              href={`tel:${order.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="touch-target inline-flex items-center gap-1.5 self-start font-semibold text-primary hover:underline"
                              title="Chiama il cliente"
                            >
                              <Phone size={13} />
                              {order.phone}
                            </a>
                          )}
                        </div>
                      )}

                      {/* Piede: pagamento e totale */}
                      <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
                        <div className="min-w-0">
                          {order.paymentStatus === 'paid' ? (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                              Pagato online
                            </span>
                          ) : order.paymentStatus === 'refunded' || order.paymentStatus === 'partially_refunded' ? (
                            <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                              Rimborsato
                            </span>
                          ) : order.paymentMethod === 'cash' || order.paymentMethod === 'pos' ? (
                            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                              Da incassare · {order.paymentMethod === 'pos' ? 'POS' : 'Contanti'}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-lg font-black tabular-nums text-foreground">€ {order.total.toFixed(2)}</span>
                      </div>

                      {renderActions(col.key, order)}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

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

                  {selectedOrder.deliveryTime && (
                    <div className="col-span-2 border-t border-slate-100 dark:border-slate-900/60 pt-2 mt-1">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider mb-0.5">
                        Orario Consegna/Ritiro
                      </span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        {selectedOrder.deliveryTime === 'asap'
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

                    {selectedOrder.deliveryTime && (
                      <div className="text-center font-bold text-[11px] bg-black/5 p-1 rounded my-1.5 border border-black/10">
                        ORARIO:{' '}
                        {selectedOrder.deliveryTime === 'asap'
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
                    <button
                      onClick={() => {
                        completeOrder(selectedOrder.id);
                      }}
                      className="min-h-11 flex-1 py-2 px-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all font-bold text-sm cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <CheckCheck size={14} /> Completa
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      rejectOrder('completed', selectedOrder.id);
                      setSelectedOrderId(null);
                    }}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-850 dark:hover:bg-slate-900 dark:text-slate-300 transition-all font-semibold text-xs cursor-pointer"
                  >
                    Rimuovi dalla vista
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
