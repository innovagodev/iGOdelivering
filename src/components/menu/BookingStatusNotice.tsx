'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Clock, Phone, X } from 'lucide-react';
import { LIVE_ACCEPT_SECONDS } from '@/lib/acceptance';
import { startAdaptivePolling } from '@/lib/polling';

/**
 * Stato di una prenotazione di solo tavolo, mostrato nella conferma della
 * prenotazione. Stessa regola degli ordini (migration 034):
 *   · locale aperto: il ristorante ha 3 minuti per confermare, il conto alla
 *     rovescia scorre in diretta;
 *   · locale chiuso: niente conto alla rovescia, il cliente legge fino a quando
 *     il ristorante può confermare;
 *   · confermata, non accettata o scaduta: lo si dice in chiaro.
 *
 * Lo stato e la scadenza li decide il server: qui si interroga
 * /api/order-status ogni 3 secondi, che segna anche la scadenza quando passa.
 */

type Status = 'pending' | 'confirmed' | 'cancelled' | 'expired';

interface Props {
  bookingId: string;
  lang: 'it' | 'en';
  /** Dati noti alla creazione, per non mostrare un attimo di vuoto. */
  initialDeadline?: string | null;
  initialMode?: string | null;
  restaurantPhone?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function BookingStatusNotice({
  bookingId,
  lang,
  initialDeadline,
  initialMode,
  restaurantPhone,
}: Props) {
  const [status, setStatus] = useState<Status>('pending');
  const [deadline, setDeadline] = useState<string | null>(initialDeadline ?? null);
  const [mode, setMode] = useState<string | null>(initialMode ?? null);
  const [now, setNow] = useState(() => Date.now());
  const statusRef = useRef<Status>('pending');
  statusRef.current = status;

  // Stato dal server.
  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    const poll = async () => {
      if (statusRef.current !== 'pending') return;
      try {
        const res = await fetch(`/api/order-status/${encodeURIComponent(bookingId)}`, {
          cache: 'no-store',
        });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (cancelled) return;
        if (json?.status) setStatus(json.status as Status);
        if (json?.acceptDeadline) setDeadline(json.acceptDeadline);
        if (json?.acceptanceMode) setMode(json.acceptanceMode);
      } catch {
        // Rete assente: si riprova al prossimo giro.
      }
    };
    // Ritmo che rallenta e pausa a scheda nascosta (src/lib/polling.ts).
    const stop = startAdaptivePolling(poll);
    return () => {
      cancelled = true;
      stop();
    };
  }, [bookingId]);

  // Orologio al secondo, solo mentre il conto alla rovescia serve.
  const live = mode !== 'deferred';
  useEffect(() => {
    if (status !== 'pending' || !live) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status, live]);

  const it = lang !== 'en';

  if (status === 'confirmed') {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-left text-xs text-green-800 dark:text-green-300">
        <Check size={16} className="mt-0.5 flex-shrink-0" />
        <span className="font-semibold">
          {it ? 'Prenotazione confermata dal ristorante!' : 'Booking confirmed by the restaurant!'}
        </span>
      </div>
    );
  }

  if (status === 'cancelled' || status === 'expired') {
    return (
      <div className="space-y-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-left text-xs text-red-700 dark:text-red-400">
        <div className="flex items-start gap-2">
          <X size={16} className="mt-0.5 flex-shrink-0" />
          <span className="font-semibold">
            {status === 'expired'
              ? it
                ? 'Nessuna risposta dal locale: la prenotazione non è stata confermata.'
                : 'No reply from the restaurant: the booking was not confirmed.'
              : it
                ? 'Il ristorante non ha potuto accettare la prenotazione.'
                : 'The restaurant could not accept the booking.'}
          </span>
        </div>
        {restaurantPhone && (
          <a
            href={`tel:${restaurantPhone}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white transition-all hover:bg-emerald-700 active:scale-95"
          >
            <Phone size={14} />
            {it ? `Chiama il locale (${restaurantPhone})` : `Call the restaurant (${restaurantPhone})`}
          </a>
        )}
      </div>
    );
  }

  // In attesa: locale chiuso → scadenza per esteso.
  if (!live) {
    const when = deadline
      ? new Date(deadline).toLocaleString(it ? 'it-IT' : 'en-GB', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;
    return (
      <div className="space-y-1 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-left text-xs text-amber-800 dark:text-amber-300">
        <p className="font-semibold">
          {it
            ? 'Il locale è chiuso in questo momento: il ristorante vedrà la tua richiesta all’apertura e la confermerà.'
            : 'The restaurant is closed right now: it will see your request when it opens and confirm it.'}
        </p>
        {when && (
          <p>
            {it
              ? `Se non conferma entro il ${when}, la prenotazione decade.`
              : `If it does not confirm by ${when}, the booking lapses.`}
          </p>
        )}
      </div>
    );
  }

  // In attesa: locale aperto → conto alla rovescia.
  const deadlineMs = deadline ? new Date(deadline).getTime() : 0;
  const left = deadlineMs > 0 ? Math.max(0, Math.ceil((deadlineMs - now) / 1000)) : LIVE_ACCEPT_SECONDS;
  return (
    <div className="space-y-2.5 rounded-xl border border-border/60 bg-card p-3 text-left">
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock size={14} className="animate-pulse text-primary" />
          {it ? 'Tempo rimasto per la risposta:' : 'Time remaining for response:'}
        </span>
        <span className="font-mono text-sm font-black tabular-nums text-foreground">
          {pad(Math.floor(left / 60))}:{pad(left % 60)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
          style={{ width: `${Math.min(100, (left / LIVE_ACCEPT_SECONDS) * 100)}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {it
          ? 'In attesa che il ristorante confermi la prenotazione.'
          : 'Waiting for the restaurant to confirm your booking.'}
      </p>
    </div>
  );
}
