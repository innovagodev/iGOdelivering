'use client';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Check,
  ChefHat,
  Send,
  BellRing,
  Bell,
  Bike,
  MapPin,
  Phone,
  MessageCircle,
  ShoppingBag,
  Utensils,
  ChevronRight,
  Package,
  AlertCircle,
  XCircle,
  Navigation,
  CalendarClock,
} from 'lucide-react';
import Link from 'next/link';
import { useLang } from '@/context/LanguageContext';
import type { TranslationKey } from '@/lib/i18n';
import { mapsHref, safeHttpsHref, telHref, whatsappHref } from '@/lib/contacts';

// ─── Tipi ────────────────────────────────────────────────────────────────────

/**
 * Quello che il cliente può sapere davvero. Il ristorante muove l'ordine in tre soli
 * stati (da accettare → in preparazione → completato): il tracker mostra solo quelli,
 * senza passaggi che nessuno può far avanzare (niente "in consegna": non c'è alcun dato
 * sul corriere).
 */
type Stage = 'sent' | 'scheduled' | 'preparing' | 'ready' | 'cancelled' | 'rejected' | 'expired';

interface RestaurantInfo {
  name?: string;
  slug?: string;
  phone?: string | null;
  whatsapp?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  cap?: string | null;
}


const stageOf = (dbStatus: string): Stage => {
  switch (dbStatus) {
    case 'accepted':
    case 'preparing':
      return 'preparing';
    case 'ready':
    case 'delivering':
    case 'delivered':
    case 'completed':
      return 'ready';
    case 'cancelled':
      return 'cancelled';
    case 'rejected':
      return 'rejected';
    case 'expired':
      return 'expired';
    default:
      // new, pending, awaiting_payment e qualunque stato sconosciuto: ancora da confermare
      return 'sent';
  }
};

const isFinal = (s: Stage) => s === 'ready' || s === 'cancelled' || s === 'rejected' || s === 'expired';
const isLive = (s: Stage) => s === 'sent' || s === 'scheduled' || s === 'preparing';

const ROME = 'Europe/Rome';
const timeOf = (iso: string) =>
  new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: ROME }).format(new Date(iso));
const dayOf = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ROME }).format(new Date(iso));
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', timeZone: ROME }).format(new Date(iso));

// ─── Componente ──────────────────────────────────────────────────────────────

export default function OrderTrackingContent() {
  const { t, lang } = useLang();
  const tRef = React.useRef(t);
  tRef.current = t;
  const searchParams = useSearchParams();
  // UUID dell'ordine. Non `order_number`: quello è corto e sequenziale per
  // ristorante, quindi enumerabile da chiunque. Resta mostrato a schermo come
  // riferimento leggibile, ma non è più la chiave di lookup.
  const orderId = searchParams.get('id') ?? '';

  const [stage, setStage] = useState<Stage>('sent');
  // Stato grezzo del database: serve a distinguere un ordine ancora in attesa
  // di pagamento online ('awaiting_payment') o scaduto senza essere pagato.
  const [rawStatus, setRawStatus] = useState<string>('');
  // Esito del reindirizzamento di Stripe (metodi come PayPal o i bonifici
  // istantanei riportano qui il cliente con ?redirect_status=…).
  const redirectStatus = searchParams.get('redirect_status');
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [orderType, setOrderType] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [acceptDeadline, setAcceptDeadline] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<'not_found' | 'fetch_failed' | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [notifPerm, setNotifPerm] = useState<'unsupported' | NotificationPermission>('unsupported');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) setNotifPerm(Notification.permission);
  }, []);

  // I permessi si chiedono con un clic, non all'apertura: i browser li considerano invasivi.
  const askNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setNotifPerm(await Notification.requestPermission());
  };

  const [placedForLater, setPlacedForLater] = useState(false);
  const stageRef = React.useRef<Stage>('sent');

  const apply = React.useCallback((data: any, announce: boolean) => {
    // Accettato ma per un altro giorno: programmato, non ancora in preparazione.
    const next: Stage = data.scheduledLater ? 'scheduled' : stageOf(String(data.status || ''));
    setPlacedForLater(!!data.placedForLater);
    setRawStatus(data.status || '');
    setStage(next);
    setUpdatedAt(data.updatedAt || null);
    setAcceptDeadline(data.acceptDeadline || null);
    setScheduledAt(data.scheduledAt || null);
    setPaymentMethod(data.paymentMethod || '');
    setPaymentStatus(data.paymentStatus || '');

    if (announce && next !== stageRef.current && next !== 'scheduled') {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const title =
          next === 'preparing'
            ? tRef.current('ord_step_preparing')
            : next === 'ready'
              ? tRef.current('ord_s_ready')
              : next === 'cancelled'
                ? tRef.current('ord_cancelled')
                : next === 'rejected'
                  ? tRef.current('ord_rejected')
                  : tRef.current('ord_expired');
        try {
          new Notification(tRef.current('ord_notif_title', { label: title }), { icon: '/favicon.ico' });
        } catch {
          /* alcuni browser mobili non permettono Notification() fuori da un service worker */
        }
      }
    }
    stageRef.current = next;
  }, []);

  // Lettura iniziale.
  //
  // Passa da /api/order-status/[orderId], che gira lato server con la service
  // role key. Una query diretta su `orders` con la chiave anon non funziona: il
  // cliente non ha alcuna policy di lettura, quindi RLS filtra la riga e la
  // query torna `data: null` con `error: null` — la pagina restava vuota senza
  // alcun segnale.
  useEffect(() => {
    if (!orderId) {
      setLoadError('not_found');
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/order-status/${encodeURIComponent(orderId)}`, {
          cache: 'no-store',
        });

        if (cancelled) return;

        if (!res.ok) {
          // 400 = id non è un UUID (tipicamente un vecchio link che portava
          // ancora `order_number`), 404 = ordine inesistente. Per il cliente
          // sono lo stesso caso: il link non porta a un ordine valido.
          const notFound = res.status === 404 || res.status === 400;
          setLoadError(notFound ? 'not_found' : 'fetch_failed');
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        setLoadError(null);
        apply(data, false);
        setOrderNumber(data.orderNumber || '');
        setOrderType(data.orderType || '');
        setAddress(data.address || '');
        setSubtotal(data.subtotal || 0);
        setDeliveryFee(data.deliveryFee || 0);
        setDiscount(data.discount || 0);
        setTotal(data.total || 0);
        setItems(data.items || []);
        setRestaurant(data.restaurant || null);
        setIsLoading(false);
      } catch (e) {
        if (cancelled) return;
        console.error('[tracking] fetch error:', e);
        setLoadError('fetch_failed');
        setIsLoading(false);
      }
    };

    fetchOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId, apply]);

  // Aggiornamenti: stesso endpoint, a intervalli.
  //
  // Sostituisce la subscription Realtime su `orders`: anche i postgres_changes
  // passano da RLS, quindi con la chiave anon il canale si sottoscrive ma non
  // consegna mai un evento. Si ferma quando l'ordine è arrivato a uno stato finale.
  useEffect(() => {
    if (!orderId || loadError || isLoading) return;
    if (isFinal(stage)) return;

    // In attesa della conferma del pagamento si controlla più spesso: il
    // webhook di Stripe arriva di norma entro pochi secondi.
    const POLL_MS = rawStatus === 'awaiting_payment' ? 4000 : 15000;

    const poll = async () => {
      try {
        const res = await fetch(`/api/order-status/${encodeURIComponent(orderId)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.status) return;
        apply(data, true);
      } catch (e) {
        console.error('[tracking] poll error:', e);
      }
    };

    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [orderId, loadError, isLoading, stage, rawStatus, apply]);

  const awaitingPayment = rawStatus === 'awaiting_payment';
  const finished = stage === 'ready';
  const stageOrder: Stage[] =
    placedForLater || stage === 'scheduled'
      ? ['sent', 'scheduled', 'preparing', 'ready']
      : ['sent', 'preparing', 'ready'];
  const currentIdx = stageOrder.indexOf(stage);

  const typeLabel =
    orderType === 'domicilio'
      ? t('checkout_home_delivery')
      : orderType === 'asporto'
        ? t('checkout_takeaway')
        : t('ord_type_table');

  const TypeIcon = orderType === 'domicilio' ? Bike : orderType === 'asporto' ? ShoppingBag : Utensils;

  // Quando: l'orario scelto dal cliente, oppure "appena possibile". Mai una stima inventata.
  const whenLabel =
    orderType === 'domicilio' ? t('ord_when_delivery') : orderType === 'asporto' ? t('ord_when_pickup') : t('ord_when_table');
  const todayRome = dayOf(new Date().toISOString());
  const whenValue = scheduledAt
    ? `${dayOf(scheduledAt) === todayRome ? '' : `${dayLabel(scheduledAt)} `}${timeOf(scheduledAt)}`
    : null;

  const logoSrc = safeHttpsHref(restaurant?.logoUrl);
  const callHref = restaurant?.phone ? telHref(restaurant.phone) : null;
  const waHref = restaurant?.whatsapp ? whatsappHref(restaurant.whatsapp) : null;
  const pickupMaps =
    orderType === 'asporto'
      ? mapsHref({ address: restaurant?.address, city: restaurant?.city, province: restaurant?.province, cap: restaurant?.cap })
      : null;

  const payChip = awaitingPayment
    ? null
    : paymentStatus === 'paid'
      ? t('ord_paid_online')
      : paymentMethod === 'cash' || paymentMethod === 'pos'
        ? orderType === 'domicilio'
          ? t('ord_pay_at_delivery_chip')
          : orderType === 'asporto'
            ? t('ord_pay_at_pickup_chip')
            : t('ord_pay_at_table_chip')
        : null;

  const readyDesc: TranslationKey =
    orderType === 'domicilio' ? 'ord_s_ready_delivery' : orderType === 'asporto' ? 'ord_s_ready_pickup' : 'ord_s_ready_table';

  const deadlineFuture = acceptDeadline && new Date(acceptDeadline).getTime() > Date.now();

  // ── Errore: ordine non trovato o endpoint irraggiungibile ──
  // Prima questo caso era silenzioso (return anticipato senza stato d'errore) e
  // la pagina restava sullo scheletro vuoto, con il primo step acceso come se
  // l'ordine fosse stato confermato.
  if (!isLoading && loadError) {
    const isNotFound = loadError === 'not_found';

    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center py-10 px-4">
        <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-sm px-6 py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} className="text-muted-foreground" />
          </div>
          <h1 className="text-lg font-bold text-foreground mb-2">
            {isNotFound ? t('ord_not_found') : t('ord_load_failed')}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {isNotFound ? t('ord_not_found_d') : t('ord_load_failed_d')}
          </p>
          <div className="flex gap-3">
            {!isNotFound && (
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
              >
                {t('ord_retry')}
              </button>
            )}
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-foreground bg-muted hover:bg-border rounded-xl py-3 border border-border transition-colors"
            >
              {t('ord_home')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // "sabato 11 ottobre alle 20:00": quando il ristorante preparerà un ordine programmato.
  const scheduledWhen = scheduledAt
    ? `${new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: ROME,
      }).format(new Date(scheduledAt))} ${t('ord_at_time', { time: timeOf(scheduledAt) })}`
    : '';

  const allSteps: { id: Stage; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'sent',
      label: t('ord_s_sent'),
      desc: stage === 'sent' ? t('ord_s_sent_wait') : t('ord_s_sent_done'),
      icon: <Send size={18} />,
    },
    {
      id: 'scheduled',
      label: t('ord_s_scheduled'),
      desc: t('ord_s_scheduled_d', { when: scheduledWhen }),
      icon: <CalendarClock size={18} />,
    },
    { id: 'preparing', label: t('ord_step_preparing'), desc: t('ord_step_preparing_d'), icon: <ChefHat size={18} /> },
    { id: 'ready', label: t('ord_s_ready'), desc: t(readyDesc), icon: <BellRing size={18} /> },
  ];
  const steps = allSteps.filter((s) => stageOrder.includes(s.id));

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-start py-6 sm:py-10 px-4">
      {/* Telefono: una colonna. Da lg: due colonne, a sinistra lo stato, a destra i dettagli. */}
      <div className="w-full max-w-lg lg:max-w-5xl">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4 min-w-0">
        {/* ── Pagamento online ── */}
        {!isLoading && awaitingPayment && redirectStatus === 'failed' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/40 px-5 py-4 text-sm text-red-700 dark:text-red-400">
            <p className="font-bold">{t('ord_pay_failed')}</p>
            <p className="text-xs mt-1">{t('ord_pay_failed_d')}</p>
          </div>
        )}
        {!isLoading && awaitingPayment && redirectStatus !== 'failed' && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900/40 px-5 py-4 text-sm text-blue-700 dark:text-blue-400 flex items-center gap-3">
            <span className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
            <div>
              <p className="font-bold">{t('ord_pay_confirming')}</p>
              <p className="text-xs mt-0.5">{t('ord_pay_confirming_d')}</p>
            </div>
          </div>
        )}

        {/* ── Testata: ristorante e ordine ── */}
        <div className="bg-card rounded-2xl border border-border shadow-sm px-5 sm:px-6 py-5">
          {isLoading ? (
            <div className="flex items-center gap-3 animate-pulse">
              <div className="w-11 h-11 bg-muted rounded-full" />
              <div className="space-y-2">
                <div className="w-24 h-3 bg-muted rounded" />
                <div className="w-32 h-3 bg-muted rounded" />
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                {logoSrc && (
                  // Logo del ristorante, non quello di iGOdelivering.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoSrc}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover border border-border bg-muted flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="min-w-0">
                  {restaurant?.name && (
                    <p className="text-sm font-bold text-foreground leading-tight truncate">{restaurant.name}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('ord_order')} <span className="font-semibold text-foreground">{orderNumber || '—'}</span>
                  </p>
                  <span className="inline-flex items-center gap-1 mt-1.5 text-xs text-muted-foreground bg-muted rounded px-2 py-0.5">
                    <TypeIcon size={11} />
                    {typeLabel}
                  </span>
                </div>
              </div>
              {!finished && isLive(stage) && !awaitingPayment && (
                <div className="flex-shrink-0 text-right">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">
                    {whenLabel}
                  </p>
                  {whenValue ? (
                    <p className="text-2xl font-bold text-primary tabular-nums leading-none">{whenValue}</p>
                  ) : (
                    <p className="text-sm font-bold text-primary leading-tight max-w-[8rem]">
                      {t('ord_asap').charAt(0).toUpperCase() + t('ord_asap').slice(1)}
                    </p>
                  )}
                </div>
              )}
              {finished && (
                <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-[var(--success)] text-white">
                  <Check size={20} />
                </div>
              )}
            </div>
          )}

          {!isLoading && (payChip || updatedAt) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
              {payChip && (
                <span className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-0.5 font-medium text-foreground">
                  {payChip}
                </span>
              )}
              {updatedAt && !awaitingPayment && <span>{t('ord_updated', { time: timeOf(updatedAt) })}</span>}
            </div>
          )}

          {/* Indirizzo di consegna */}
          {address && orderType === 'domicilio' && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2 border border-border">
              <MapPin size={14} className="text-primary flex-shrink-0" />
              <span className="truncate">{address}</span>
            </div>
          )}
        </div>

        {/* ── Ordine non andato a buon fine ── */}
        {!isLoading && (stage === 'cancelled' || stage === 'rejected' || stage === 'expired') && (
          <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/40 px-5 py-4 text-sm text-red-700 dark:text-red-400 flex gap-3">
            <XCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {stage === 'cancelled' ? t('ord_cancelled') : stage === 'rejected' ? t('ord_rejected') : t('ord_expired')}
              </p>
              <p className="text-xs mt-1">
                {stage === 'cancelled' ? t('ord_cancelled_d') : stage === 'rejected' ? t('ord_rejected_d') : t('ord_expired_d')}
              </p>
            </div>
          </div>
        )}

        {/* ── Avanzamento ── */}
        {!isLoading && !awaitingPayment && (isLive(stage) || stage === 'ready') && (
          <div className="bg-card rounded-2xl border border-border shadow-sm px-5 sm:px-6 py-5">
            <h2 className="text-sm font-semibold text-foreground mb-5">{t('ord_status')}</h2>
            <div className="space-y-0">
              {steps.map((step, idx) => {
                const isDone = idx < currentIdx || (finished && idx === currentIdx);
                const isActive = idx === currentIdx && !finished;
                const isPending = idx > currentIdx;
                const isLast = idx === steps.length - 1;

                return (
                  <div key={step.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                          isDone
                            ? 'bg-[var(--success)] text-white'
                            : isActive
                              ? 'bg-primary text-white shadow-md ring-4 ring-primary/20'
                              : 'bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        {isDone ? <Check size={18} /> : step.icon}
                      </div>
                      {!isLast && (
                        <div
                          className={`w-0.5 flex-1 my-1 min-h-[24px] transition-all duration-700 ${
                            isDone ? 'bg-[var(--success)]' : 'bg-border'
                          }`}
                        />
                      )}
                    </div>

                    <div className={`pb-5 flex-1 min-w-0 ${isLast ? 'pb-0' : ''}`}>
                      <p
                        className={`text-sm font-semibold leading-tight ${
                          isPending ? 'text-muted-foreground' : 'text-foreground'
                        }`}
                      >
                        {step.label}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${isPending ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}
                      >
                        {step.desc}
                      </p>
                      {isActive && step.id === 'sent' && deadlineFuture && (
                        <p className="text-xs mt-1 text-muted-foreground">
                          {t('ord_reply_by', { time: timeOf(acceptDeadline as string) })}
                        </p>
                      )}
                      {isActive && (
                        <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-primary bg-secondary px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          {stage === 'scheduled' ? t('ord_scheduled_pill') : t('ord_in_progress')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {notifPerm !== 'unsupported' && !finished && (
              <div className="mt-5 pt-4 border-t border-border">
                {notifPerm === 'default' ? (
                  <button
                    onClick={askNotifications}
                    className="inline-flex items-center gap-2 text-sm font-medium text-foreground bg-muted hover:bg-border rounded-xl px-3 py-2 border border-border transition-colors"
                  >
                    <Bell size={15} className="text-primary" />
                    {t('ord_notify_me')}
                  </button>
                ) : notifPerm === 'granted' ? (
                  <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Bell size={13} className="text-primary" />
                    {t('ord_notify_on')}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        )}

        </div>
        <div className="space-y-4 min-w-0">
        {/* ── Dove ritirare ── */}
        {!isLoading && pickupMaps && (isLive(stage) || stage === 'ready') && (
          <div className="bg-card rounded-2xl border border-border shadow-sm px-5 sm:px-6 py-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
                {t('ord_pickup_where')}
              </p>
              <p className="text-sm font-semibold text-foreground truncate">
                {[restaurant?.address, restaurant?.city].filter(Boolean).join(', ')}
              </p>
            </div>
            <a
              href={pickupMaps}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-foreground bg-muted hover:bg-border rounded-xl px-3 py-2 border border-border transition-colors"
            >
              <Navigation size={14} className="text-primary" />
              {t('ord_directions')}
            </a>
          </div>
        )}

        {/* ── Riepilogo ── */}
        {!isLoading && items.length > 0 && (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <button
              onClick={() => setReceiptOpen((o) => !o)}
              className="w-full flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Package size={16} className="text-primary" />
                {t('ord_summary')}
              </div>
              <ChevronRight
                size={16}
                className={`text-muted-foreground transition-transform duration-200 ${receiptOpen ? 'rotate-90' : ''}`}
              />
            </button>

            {receiptOpen && (
              <div className="px-5 sm:px-6 pb-5 border-t border-border pt-4">
                <ul className="space-y-2 mb-4">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 text-sm">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-muted border border-border text-xs font-bold text-muted-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
                          {item.qty}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{item.name}</p>
                          {(item.addedIngredients || []).map((a: any, k: number) => (
                            <p key={`add-${k}`} className="text-xs text-primary font-medium">
                              + {a.name}
                              {Number(a.price) > 0 && ` (+€${Number(a.price).toFixed(2)})`}
                            </p>
                          ))}
                          {(item.removedIngredients || []).map((r: string, k: number) => (
                            <p key={`rem-${k}`} className="text-xs text-red-500">
                              − Senza {r}
                            </p>
                          ))}
                          {item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}
                        </div>
                      </div>
                      <span className="font-medium text-foreground tabular-nums flex-shrink-0">
                        €{(parseFloat(item.price) * item.qty).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-border pt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('cart_subtotal')}</span>
                    <span className="tabular-nums">€{subtotal.toFixed(2)}</span>
                  </div>
                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t('ord_delivery')}</span>
                      <span className="tabular-nums">€{deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-[var(--success)]">
                      <span>{t('cart_discount')}</span>
                      <span className="tabular-nums">−€{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-foreground text-base pt-1 border-t border-border">
                    <span>{t('order_total_label')}</span>
                    <span className="tabular-nums">€{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Assistenza: solo i canali che il ristorante ha davvero ── */}
        {!isLoading && (callHref || waHref) && (
          <div className="bg-card rounded-2xl border border-border shadow-sm px-5 sm:px-6 py-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">
              {t('ord_support')}
            </p>
            <div className="flex gap-3">
              {callHref && (
                <a
                  href={callHref}
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-foreground bg-muted hover:bg-border rounded-xl py-2.5 border border-border transition-colors"
                >
                  <Phone size={15} className="text-primary" />
                  {t('ord_call')}
                </a>
              )}
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-foreground bg-muted hover:bg-border rounded-xl py-2.5 border border-border transition-colors"
                >
                  <MessageCircle size={15} className="text-primary" />
                  {t('ord_whatsapp')}
                </a>
              )}
            </div>
          </div>
        )}

        </div>
        </div>

        {/* ── Ritorno al menu ── */}
        <div className="text-center pt-6 space-y-2">
          <Link
            href={restaurant?.slug ? `/menu/${restaurant.slug}` : '/'}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            {restaurant?.slug && restaurant?.name ? t('ord_back_menu', { name: restaurant.name }) : t('ord_home')}
          </Link>
          <p className="text-[11px] text-muted-foreground/70">Tecnologia di iGOdelivering</p>
        </div>
      </div>
    </div>
  );
}
