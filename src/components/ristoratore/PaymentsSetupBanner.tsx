'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CreditCard, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * Invito ad attivare i pagamenti online, mostrato sulla dashboard del
 * ristoratore finché il suo account Stripe non è attivo (piano pagamenti,
 * fase 3). Si può chiudere; ricompare dopo 7 giorni se il collegamento non è
 * ancora completato.
 *
 * Legge lo stato dalla riga del proprio ristorante (policy "owner read"):
 * stripe_connected lo scrive solo il server, leggendolo da Stripe.
 */
const DISMISS_KEY = 'iGO_payments_invite_dismissed_at';
const DISMISS_DAYS = 7;

export default function PaymentsSetupBanner({ restaurantId }: { restaurantId: string }) {
  const [state, setState] = useState<'hidden' | 'not_connected' | 'in_progress'>('hidden');

  useEffect(() => {
    if (!restaurantId || restaurantId === 'r-001') return;
    try {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86400000) return;
    } catch {
      // storage non disponibile: si mostra comunque
    }
    let cancelled = false;
    supabase
      .from('restaurants')
      .select('stripe_connected, stripe_account_id')
      .eq('id', restaurantId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        if (data.stripe_connected) return;
        setState(data.stripe_account_id ? 'in_progress' : 'not_connected');
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  if (state === 'hidden') return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignorato
    }
    setState('hidden');
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-950/30 p-4">
      <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
        <CreditCard size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">
          {state === 'in_progress'
            ? 'Completa l’attivazione dei pagamenti online'
            : 'Attiva i pagamenti online'}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {state === 'in_progress'
            ? 'Il collegamento a Stripe è iniziato ma non è ancora completo.'
            : 'Collega il tuo account Stripe: i clienti potranno pagare con carta, Apple Pay o Google Pay e l’incasso arriverà direttamente sul tuo conto.'}
        </p>
        <Link
          href="/ristoratore/pagamenti"
          className="inline-block mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {state === 'in_progress' ? 'Riprendi il collegamento →' : 'Vai a Pagamenti →'}
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
        aria-label="Chiudi"
      >
        <X size={14} />
      </button>
    </div>
  );
}
