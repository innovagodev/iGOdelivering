'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Toggle from '@/components/ui/Toggle';
import { useAuth } from '@/context/AuthContext';
import { Save, Sparkles, CheckCircle, CreditCard, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function PagamentiPage() {
  const { user, isLoading } = useAuth();
  const restaurantId = user?.restaurantId || '';

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [loading, setLoading] = useState(true);

  // POS / Cash payment methods
  const [cardDelivery, setCardDelivery] = useState(true);
  const [cardPickup, setCardPickup] = useState(true);
  const [cashDelivery, setCashDelivery] = useState(true);
  const [cashPickup, setCashPickup] = useState(true);

  // Stripe Connect OAuth config
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeAccountLabel, setStripeAccountLabel] = useState('');
  const [showStripeModal, setShowStripeModal] = useState(false);

  // PayPal OAuth config
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [paypalConnected, setPaypalConnected] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [showPaypalModal, setShowPaypalModal] = useState(false);

  // IBAN payment details
  const [ibanEnabled, setIbanEnabled] = useState(false);
  const [onlinePaymentAccount, setOnlinePaymentAccount] = useState('');
  const [ibanHolder, setIbanHolder] = useState('');

  useEffect(() => {
    // Restore sidebar state
    const stored = localStorage.getItem('iGO_sidebar_collapsed');
    if (stored !== null) {
      setSidebarCollapsed(JSON.parse(stored));
    }
  }, []);

  // Hydrate payments configuration from Supabase
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
          .select('*')
          .eq('id', restaurantId)
          .single();

        if (error) {
          console.warn(
            'Error loading settings from Supabase (schema mismatch):',
            error.message || error
          );
        }
        if (data) {
          setCardDelivery(!!data.card_delivery);
          setCardPickup(!!data.card_pickup);
          setCashDelivery(!!data.cash_delivery);
          setCashPickup(!!data.cash_pickup);

          setPaypalEnabled(!!data.paypal_enabled);
          setPaypalConnected(!!data.paypal_connected);
          setPaypalEmail(data.paypal_email || '');

          setStripeEnabled(!!data.stripe_enabled);
          setStripeConnected(!!data.stripe_connected);
          setStripeAccountLabel(data.stripe_account_label || '');

          setIbanEnabled(!!data.iban_enabled);
          setOnlinePaymentAccount(data.online_payment_account || '');
          setIbanHolder(data.iban_holder || '');
        }
      } catch (err: any) {
        console.warn('Error loading settings from Supabase:', err.message || err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [restaurantId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          card_delivery: cardDelivery,
          card_pickup: cardPickup,
          cash_delivery: cashDelivery,
          cash_pickup: cashPickup,
          paypal_enabled: paypalEnabled,
          paypal_connected: paypalConnected,
          paypal_email: paypalEmail,
          stripe_enabled: stripeEnabled,
          stripe_connected: stripeConnected,
          stripe_account_label: stripeAccountLabel,
          iban_enabled: ibanEnabled,
          online_payment_account: onlinePaymentAccount,
          iban_holder: ibanHolder,
        })
        .eq('id', restaurantId);

      if (error) throw error;

      // Trigger update event for UI sync
      window.dispatchEvent(new Event('iGO_settings_updated'));

      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 3000);
    } catch (e: any) {
      console.warn('Error saving settings to Supabase:', e.message || e);
      alert('Errore durante il salvataggio delle impostazioni di pagamento.');
    }
  };



  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        activeSection="nav-pagamenti"
        onSectionChange={() => {}}
        role="ristoratore"
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Topbar
          role="ristoratore"
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMobileMenuOpen={() => setIsMobileOpen(true)}
          leftContent={
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
                <p className="text-muted-foreground text-sm font-medium animate-pulse">Caricamento pagamenti in corso...</p>
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
                  Il tuo account non è ancora collegato a un ristorante attivo. Contatta l'amministratore per completare la configurazione e l'attivazione del tuo profilo.
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
                  Gestisci come i tuoi clienti pagano per consegne, asporto e ordini online.
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

            {/* Success Feedback Notification */}
            {showFeedback && (
              <div className="bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
                <CheckCircle size={20} className="text-[var(--success)] flex-shrink-0" />
                <p className="text-sm font-semibold text-foreground">
                  Metodi di pagamento salvati con successo!
                </p>
              </div>
            )}

            <div className="space-y-6">
              {/* Payment Methods */}
              <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                    Opzioni di Pagamento
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configura i canali di pagamento per la consegna, l&apos;asporto e i pagamenti
                    online.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Delivery POS / Cash */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      POS Fisico & Contanti
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1">
                      <div className="flex items-center justify-between text-sm p-3 bg-muted/20 border border-border rounded-xl">
                        <div>
                          <p className="font-semibold text-foreground">POS alla Consegna</p>
                          <p className="text-[10px] text-muted-foreground">
                            POS portatile del corriere
                          </p>
                        </div>
                        <Toggle checked={cardDelivery} onChange={setCardDelivery} size="sm" />
                      </div>
                      <div className="flex items-center justify-between text-sm p-3 bg-muted/20 border border-border rounded-xl">
                        <div>
                          <p className="font-semibold text-foreground">POS al Ritiro</p>
                          <p className="text-[10px] text-muted-foreground">
                            POS in cassa per asporto
                          </p>
                        </div>
                        <Toggle checked={cardPickup} onChange={setCardPickup} size="sm" />
                      </div>
                      <div className="flex items-center justify-between text-sm p-3 bg-muted/20 border border-border rounded-xl">
                        <div>
                          <p className="font-semibold text-foreground">Contanti alla Consegna</p>
                          <p className="text-[10px] text-muted-foreground">
                            Pagamento al fattorino
                          </p>
                        </div>
                        <Toggle checked={cashDelivery} onChange={setCashDelivery} size="sm" />
                      </div>
                      <div className="flex items-center justify-between text-sm p-3 bg-muted/20 border border-border rounded-xl">
                        <div>
                          <p className="font-semibold text-foreground">Contanti al Ritiro</p>
                          <p className="text-[10px] text-muted-foreground">Pagamento in cassa</p>
                        </div>
                        <Toggle checked={cashPickup} onChange={setCashPickup} size="sm" />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/60 my-6" />

                  {/* ── STRIPE CONNECT ─────────────────────────── */}
                  <div
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      stripeConnected
                        ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Stripe Logo Icon */}
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                          <CreditCard size={20} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-foreground">Stripe</span>
                            {stripeConnected && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Attivo
                              </span>
                            )}
                          </div>
                          {stripeConnected && stripeAccountLabel ? (
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {stripeAccountLabel}
                            </p>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">
                              Accetta pagamenti con carta di credito online
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {stripeConnected ? (
                          <>
                            <Toggle checked={stripeEnabled} onChange={setStripeEnabled} size="sm" />
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    'Vuoi disconnettere il tuo account Stripe? Il pagamento con carta online verrà disabilitato.'
                                  )
                                ) {
                                  setStripeConnected(false);
                                  setStripeAccountLabel('');
                                  setStripeEnabled(false);
                                }
                              }}
                              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors underline whitespace-nowrap"
                            >
                              Disconnetti
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowStripeModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all active:scale-95 whitespace-nowrap shadow-sm cursor-pointer"
                          >
                            Connetti Stripe →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── PAYPAL CONNECT ──────────────────────────── */}
                  <div
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      paypalConnected
                        ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0">
                          <CreditCard size={20} className="text-yellow-600 dark:text-yellow-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-foreground">PayPal</span>
                            {paypalConnected && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Attivo
                              </span>
                            )}
                          </div>
                          {paypalConnected && paypalEmail ? (
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {paypalEmail}
                            </p>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">
                              Accetta pagamenti PayPal e carte online
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {paypalConnected ? (
                          <>
                            <Toggle checked={paypalEnabled} onChange={setPaypalEnabled} size="sm" />
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Vuoi disconnettere il tuo account PayPal?')) {
                                  setPaypalConnected(false);
                                  setPaypalEmail('');
                                  setPaypalEnabled(false);
                                }
                              }}
                              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors underline whitespace-nowrap"
                            >
                              Disconnetti
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowPaypalModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#003087] hover:bg-[#00256b] text-white text-[11px] font-bold transition-all active:scale-95 whitespace-nowrap shadow-sm cursor-pointer"
                          >
                            Connetti PayPal →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </form>
          )}
        </main>
      </div>

      {/* STRIPE CONNECT MODAL */}
      {showStripeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <CreditCard size={24} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Connetti il tuo account Stripe
                </h3>
                <p className="text-xs text-muted-foreground">
                  Pochi click, nessuna chiave da copiare
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              {[
                { n: '1', text: 'Verrai reindirizzato alla pagina di autorizzazione di Stripe' },
                { n: '2', text: 'Accedi con il tuo account Stripe (o creane uno gratuito)' },
                { n: '3', text: 'Autorizza iGOdelivering ad accettare pagamenti per te' },
                { n: '4', text: 'Torni qui con il tuo account Stripe collegato ✓' },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {s.n}
                  </span>
                  <p className="text-sm text-foreground/80">{s.text}</p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl mb-5">
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                <strong>Nota:</strong> La connessione OAuth con Stripe sarà attiva dopo la
                migrazione al database. Per ora, simuliamo la connessione per testare il flusso.
              </p>
            </div>

            <div className="space-y-1 mb-4">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Email del tuo account Stripe (demo)
              </label>
              <input
                type="email"
                placeholder="tuaemail@esempio.it"
                className="w-full px-3.5 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                id="stripe-connect-email-input"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowStripeModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  const emailInput = document.getElementById(
                    'stripe-connect-email-input'
                  ) as HTMLInputElement;
                  const emailVal = emailInput?.value?.trim() || 'account@stripe.com';
                  setStripeConnected(true);
                  setStripeEnabled(true);
                  setStripeAccountLabel(emailVal);
                  setShowStripeModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                Connetti a Stripe →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYPAL CONNECT MODAL */}
      {showPaypalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
                <CreditCard size={24} className="text-yellow-600 dark:text-yellow-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Connetti il tuo account PayPal
                </h3>
                <p className="text-xs text-muted-foreground">
                  Autorizza iGOdelivering a ricevere pagamenti per te
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              {[
                { n: '1', text: 'Verrai reindirizzato a PayPal per autorizzare la connessione' },
                { n: '2', text: 'Accedi con il tuo account PayPal Business' },
                { n: '3', text: 'Conferma le autorizzazioni per iGOdelivering' },
                {
                  n: '4',
                  text: 'Il tuo account è collegato, i clienti potranno pagarti con PayPal ✓',
                },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {s.n}
                  </span>
                  <p className="text-sm text-foreground/80">{s.text}</p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl mb-5">
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                <strong>Nota:</strong> L&apos;integrazione OAuth con PayPal sarà attiva dopo la
                migrazione al database. Per ora, simuliamo la connessione per testare il flusso.
              </p>
            </div>

            <div className="space-y-1 mb-4">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Email account PayPal Business (demo)
              </label>
              <input
                type="email"
                placeholder="tuaemail@paypal.com"
                className="w-full px-3.5 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                id="paypal-connect-email-input"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPaypalModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  const emailInput = document.getElementById(
                    'paypal-connect-email-input'
                  ) as HTMLInputElement;
                  const emailVal = emailInput?.value?.trim() || 'account@paypal.com';
                  setPaypalConnected(true);
                  setPaypalEnabled(true);
                  setPaypalEmail(emailVal);
                  setShowPaypalModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#003087] hover:bg-[#00256b] text-white text-sm font-bold transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                Connetti a PayPal →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
