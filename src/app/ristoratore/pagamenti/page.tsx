'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PageTopbar from '@/components/layout/PageTopbar';
import Toggle from '@/components/ui/Toggle';
import { useAuth } from '@/context/AuthContext';
import {
  Save,
  CheckCircle,
  CreditCard,
  Store,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';

/**
 * Pagina Pagamenti del ristoratore.
 *
 * - POS e contanti: scelti per servizio e salvati direttamente.
 * - Stripe: collegamento reale (piano pagamenti, fase 3). Lo stato viene da
 *   /api/stripe/status, che lo rilegge da Stripe; il pulsante apre la
 *   procedura di Stripe tramite /api/stripe/connect. Le colonne del
 *   collegamento (stripe_connected, stripe_account_id, …) le scrive solo il
 *   server: un trigger rifiuta le modifiche dal browser (migration 028–029).
 *   Al tavolo niente pagamento online: solo cassa e POS.
 * - PayPal: in arrivo con l'integrazione nativa.
 */

type StripeState = 'not_connected' | 'onboarding' | 'pending' | 'active';

interface StripeStatus {
  state: StripeState;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  currentlyDue: string[];
  pastDue: string[];
  disabledReason: string | null;
  syncedAt: string | null;
}

const STATE_LABEL: Record<StripeState, { text: string; className: string }> = {
  not_connected: {
    text: 'Non collegato',
    className: 'bg-muted text-muted-foreground border-border',
  },
  onboarding: {
    text: 'Collegamento da completare',
    className:
      'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
  pending: {
    text: 'In verifica da Stripe',
    className:
      'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  active: {
    text: 'Attivo',
    className:
      'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  },
};

export default function PagamentiPage() {
  const { user, isLoading } = useAuth();
  const restaurantId = user?.restaurantId || '';

  const [showFeedback, setShowFeedback] = useState(false);
  const [loading, setLoading] = useState(true);

  // POS / contanti
  const [cardDelivery, setCardDelivery] = useState(true);
  const [cardPickup, setCardPickup] = useState(true);
  const [cardTable, setCardTable] = useState(false);
  const [cashDelivery, setCashDelivery] = useState(true);
  const [cashPickup, setCashPickup] = useState(true);
  const [cashTable, setCashTable] = useState(false);

  // Pagamento online con Stripe: servizi su cui offrirlo
  const [stripeDelivery, setStripeDelivery] = useState(true);
  const [stripePickup, setStripePickup] = useState(true);

  // Stato del collegamento, letto dal server
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeBusy, setStripeBusy] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  const refreshStripeStatus = useCallback(async () => {
    setStripeLoading(true);
    setStripeError(null);
    try {
      const res = await fetch('/api/stripe/status', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Stato del collegamento non disponibile');
      setStripeStatus(json.status);
      if (json.stale && json.error) setStripeError(json.error);
    } catch (e: any) {
      setStripeError(e.message || 'Stato del collegamento non disponibile');
    } finally {
      setStripeLoading(false);
    }
  }, []);

  const startStripeConnect = useCallback(async () => {
    setStripeBusy(true);
    setStripeError(null);
    try {
      const res = await fetch('/api/stripe/connect', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url)
        throw new Error(json.error || 'Impossibile aprire la procedura di Stripe');
      // Il link di Stripe scade in pochi minuti: si apre subito.
      window.location.href = json.url;
    } catch (e: any) {
      setStripeError(e.message || 'Impossibile aprire la procedura di Stripe');
      setStripeBusy(false);
    }
  }, []);

  // Impostazioni salvate su restaurants
  useEffect(() => {
    async function loadData() {
      if (!restaurantId || restaurantId === 'r-001') {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select(
            'card_delivery, card_pickup, card_table, cash_delivery, cash_pickup, cash_table, stripe_delivery, stripe_pickup'
          )
          .eq('id', restaurantId)
          .single();

        if (error) {
          console.warn('Error loading settings from Supabase:', error.message || error);
        }
        if (data) {
          setCardDelivery(!!data.card_delivery);
          setCardPickup(!!data.card_pickup);
          setCardTable(!!data.card_table);
          setCashDelivery(!!data.cash_delivery);
          setCashPickup(!!data.cash_pickup);
          setCashTable(!!data.cash_table);
          setStripeDelivery(data.stripe_delivery !== false);
          setStripePickup(data.stripe_pickup !== false);
        }
      } catch (err: any) {
        console.warn('Error loading settings from Supabase:', err.message || err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [restaurantId]);

  // Stato Stripe, e ritorno dalla procedura (?stripe=return | refresh)
  useEffect(() => {
    if (!restaurantId || restaurantId === 'r-001') return;
    const params = new URLSearchParams(window.location.search);
    const stripeParam = params.get('stripe');
    if (stripeParam) {
      params.delete('stripe');
      const qs = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
    if (stripeParam === 'refresh') {
      // Stripe torna qui quando il link è scaduto o già usato: se ne apre
      // subito uno nuovo, come prevede la procedura.
      startStripeConnect();
      return;
    }
    refreshStripeStatus();
  }, [restaurantId, refreshStripeStatus, startStripeConnect]);

  const stripeActive = stripeStatus?.state === 'active';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          card_delivery: cardDelivery,
          card_pickup: cardPickup,
          card_table: cardTable,
          cash_delivery: cashDelivery,
          cash_pickup: cashPickup,
          cash_table: cashTable,
          stripe_delivery: stripeDelivery,
          stripe_pickup: stripePickup,
          // Al tavolo nessun pagamento online (decisione di prodotto).
          stripe_table: false,
          stripe_enabled: stripeActive && (stripeDelivery || stripePickup),
        })
        .eq('id', restaurantId);

      if (error) throw error;

      window.dispatchEvent(new Event('iGO_settings_updated'));
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 3000);
    } catch (e: any) {
      console.warn('Error saving settings to Supabase:', e.message || e);
      notify.error('Errore durante il salvataggio delle impostazioni di pagamento.');
    }
  };

  const pendingItems = stripeStatus
    ? stripeStatus.currentlyDue.length + stripeStatus.pastDue.length
    : 0;

  return (
    <div className="flex flex-1 min-h-0 min-w-0 bg-background overflow-hidden relative">

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <PageTopbar
          left={
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <Store size={16} className="text-primary flex-shrink-0" />
              <span className="font-semibold text-foreground text-base truncate">
                {user?.restaurantName || 'Il mio Ristorante'}
              </span>
            </div>
          }
        />

        <main className="flex-1 min-h-0 overflow-y-auto">
          {isLoading || loading ? (
            <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6">
              <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground text-sm font-medium animate-pulse">
                  Caricamento pagamenti in corso...
                </p>
              </div>
            </div>
          ) : !restaurantId || restaurantId === 'r-001' ? (
            <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6">
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-card border border-border rounded-2xl shadow-sm">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
                  <Store size={32} />
                </div>
                <h2 className="text-xl font-bold text-foreground">Nessun Ristorante Collegato</h2>
                <p className="text-muted-foreground text-sm max-w-md mt-2">
                  Il tuo account non è ancora collegato a un ristorante attivo. Contatta
                  l&apos;amministratore per completare la configurazione e l&apos;attivazione del
                  tuo profilo.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="max-w-4xl mx-auto px-6 lg:px-8 py-6 space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Metodi di Pagamento</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gestisci come i tuoi clienti pagano in base al servizio (consegna, asporto e
                    tavolo).
                  </p>
                </div>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors cursor-pointer w-full sm:w-auto"
                >
                  <Save size={16} />
                  Salva Modifiche
                </button>
              </div>

              {showFeedback && (
                <div className="bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
                  <CheckCircle size={20} className="text-[var(--success)] flex-shrink-0" />
                  <p className="text-sm font-semibold text-foreground">
                    Metodi di pagamento salvati con successo!
                  </p>
                </div>
              )}

              {/* ── Pagamenti online con Stripe ─────────────────────────── */}
              <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-foreground">
                          Pagamenti online con Stripe
                        </h3>
                        {stripeStatus && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATE_LABEL[stripeStatus.state].className}`}
                          >
                            {STATE_LABEL[stripeStatus.state].text}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                        I clienti pagano con carta, Apple Pay o Google Pay e l&apos;incasso arriva
                        direttamente sul tuo conto Stripe, poi sul tuo IBAN. iGOdelivering non
                        trattiene commissioni; Stripe applica le proprie tariffe al tuo account.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={refreshStripeStatus}
                    disabled={stripeLoading}
                    className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50 self-start"
                    title="Aggiorna lo stato da Stripe"
                  >
                    <RefreshCw size={13} className={stripeLoading ? 'animate-spin' : ''} />
                    Aggiorna
                  </button>
                </div>

                {stripeError && (
                  <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg p-3">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>{stripeError}</span>
                  </div>
                )}

                {!stripeStatus && stripeLoading && (
                  <p className="text-xs text-muted-foreground animate-pulse">
                    Lettura dello stato da Stripe…
                  </p>
                )}

                {stripeStatus?.state === 'not_connected' && (
                  <div className="space-y-3">
                    <ol className="space-y-1.5 text-sm text-foreground/80 list-decimal list-inside">
                      <li>Verrai portato sulla procedura sicura di Stripe.</li>
                      <li>Accedi al tuo account Stripe oppure creane uno: è gratuito.</li>
                      <li>
                        Stripe ti chiederà un documento del titolare e l&apos;IBAN su cui ricevere
                        gli incassi.
                      </li>
                      <li>Al termine tornerai qui, con i pagamenti online pronti.</li>
                    </ol>
                    <button
                      type="button"
                      onClick={startStripeConnect}
                      disabled={stripeBusy}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                    >
                      {stripeBusy ? 'Apertura di Stripe…' : 'Collega Stripe'}
                      <ExternalLink size={14} />
                    </button>
                  </div>
                )}

                {stripeStatus?.state === 'onboarding' && (
                  <div className="space-y-3">
                    <p className="text-sm text-foreground/80">
                      Il collegamento è iniziato ma Stripe ha ancora bisogno di alcuni dati
                      {pendingItems > 0 ? ` (${pendingItems} da completare)` : ''}. Riprendi la
                      procedura da dove l&apos;hai lasciata.
                    </p>
                    <button
                      type="button"
                      onClick={startStripeConnect}
                      disabled={stripeBusy}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                    >
                      {stripeBusy ? 'Apertura di Stripe…' : 'Completa il collegamento'}
                      <ExternalLink size={14} />
                    </button>
                  </div>
                )}

                {stripeStatus?.state === 'pending' && (
                  <div className="space-y-3">
                    <p className="text-sm text-foreground/80 flex items-start gap-2">
                      <Clock size={15} className="flex-shrink-0 mt-0.5 text-blue-600" />
                      <span>
                        Hai completato la procedura. Stripe sta verificando i dati: di solito
                        bastano pochi minuti, a volte qualche giorno.
                        {pendingItems > 0
                          ? ` Stripe chiede ancora ${pendingItems} informazioni.`
                          : ''}
                      </span>
                    </p>
                    {pendingItems > 0 && (
                      <button
                        type="button"
                        onClick={startStripeConnect}
                        disabled={stripeBusy}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                      >
                        {stripeBusy ? 'Apertura di Stripe…' : 'Fornisci i dati richiesti'}
                        <ExternalLink size={14} />
                      </button>
                    )}
                  </div>
                )}

                {stripeActive && (
                  <div className="space-y-4">
                    {!stripeStatus?.payoutsEnabled && (
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Puoi già ricevere pagamenti; i bonifici verso il tuo IBAN si attiveranno
                        quando Stripe avrà completato le verifiche.
                      </p>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Offri il pagamento online per
                      </p>
                      <div className="flex flex-wrap gap-6">
                        <label className="flex items-center gap-2 text-sm text-foreground">
                          <Toggle checked={stripeDelivery} onChange={setStripeDelivery} size="sm" />
                          Consegna 🛵
                        </label>
                        <label className="flex items-center gap-2 text-sm text-foreground">
                          <Toggle checked={stripePickup} onChange={setStripePickup} size="sm" />
                          Asporto 🛍
                        </label>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Al tavolo i clienti pagano in cassa o con il POS.
                      </p>
                    </div>
                    <a
                      href="https://dashboard.stripe.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Incassi, bonifici e rimborsi sul tuo pannello Stripe
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>

              {/* ── POS e contanti ─────────────────────────────────────── */}
              <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                    Pagamento alla consegna, al ritiro o al tavolo
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Associa ciascun metodo alle tipologie di servizio offerte.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left min-w-[500px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="p-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-2/5">
                          Metodo di Pagamento
                        </th>
                        <th className="p-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                          Consegna 🛵
                        </th>
                        <th className="p-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                          Asporto 🛍
                        </th>
                        <th className="p-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                          Al Tavolo 🍽
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="hover:bg-muted/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                              <CreditCard size={18} />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-foreground">
                                POS / Carta Fisico
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Corriere con POS portatile o pagamento in cassa
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center">
                            <Toggle checked={cardDelivery} onChange={setCardDelivery} size="sm" />
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center">
                            <Toggle checked={cardPickup} onChange={setCardPickup} size="sm" />
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center">
                            <Toggle checked={cardTable} onChange={setCardTable} size="sm" />
                          </div>
                        </td>
                      </tr>

                      <tr className="hover:bg-muted/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                €
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-foreground">Contanti</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Pagamento in contanti al corriere o in cassa
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center">
                            <Toggle checked={cashDelivery} onChange={setCashDelivery} size="sm" />
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center">
                            <Toggle checked={cashPickup} onChange={setCashPickup} size="sm" />
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center">
                            <Toggle checked={cashTable} onChange={setCashTable} size="sm" />
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── PayPal ─────────────────────────────────────────────── */}
              <div className="bg-card rounded-xl border border-dashed border-border p-5 flex items-center gap-3 opacity-80">
                <div className="w-9 h-9 rounded-xl bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0 text-[#003087] font-black text-sm">
                  P
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    PayPal{' '}
                    <span className="text-[10px] font-bold text-muted-foreground ml-1">
                      IN ARRIVO
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Il collegamento a PayPal sarà disponibile con un prossimo aggiornamento.
                  </p>
                </div>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
