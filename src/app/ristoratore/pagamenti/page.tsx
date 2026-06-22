'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Toggle from '@/components/ui/Toggle';
import { useAuth } from '@/context/AuthContext';
import { Save, CheckCircle, CreditCard, Store } from 'lucide-react';
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
  const [cardTable, setCardTable] = useState(false);
  const [cashDelivery, setCashDelivery] = useState(true);
  const [cashPickup, setCashPickup] = useState(true);
  const [cashTable, setCashTable] = useState(false);

  // Stripe Connect OAuth config
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeAccountLabel, setStripeAccountLabel] = useState('');
  const [stripeDelivery, setStripeDelivery] = useState(true);
  const [stripePickup, setStripePickup] = useState(true);
  const [stripeTable, setStripeTable] = useState(true);
  const [showStripeModal, setShowStripeModal] = useState(false);

  // PayPal OAuth config
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [paypalConnected, setPaypalConnected] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [paypalDelivery, setPaypalDelivery] = useState(true);
  const [paypalPickup, setPaypalPickup] = useState(true);
  const [paypalTable, setPaypalTable] = useState(true);
  const [showPaypalModal, setShowPaypalModal] = useState(false);

  // IBAN payment details (Not used in form currently, but kept for DB consistency)
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

  // Update stripeEnabled and paypalEnabled reactively
  useEffect(() => {
    setStripeEnabled(stripeConnected && (stripeDelivery || stripePickup || stripeTable));
  }, [stripeConnected, stripeDelivery, stripePickup, stripeTable]);

  useEffect(() => {
    setPaypalEnabled(paypalConnected && (paypalDelivery || paypalPickup || paypalTable));
  }, [paypalConnected, paypalDelivery, paypalPickup, paypalTable]);

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
            'Error loading settings from Supabase:',
            error.message || error
          );
        }
        if (data) {
          setCardDelivery(!!data.card_delivery);
          setCardPickup(!!data.card_pickup);
          setCardTable(!!data.card_table);
          setCashDelivery(!!data.cash_delivery);
          setCashPickup(!!data.cash_pickup);
          setCashTable(!!data.cash_table);

          setPaypalEnabled(!!data.paypal_enabled);
          setPaypalConnected(!!data.paypal_connected);
          setPaypalEmail(data.paypal_email || '');
          setPaypalDelivery(data.paypal_delivery !== false);
          setPaypalPickup(data.paypal_pickup !== false);
          setPaypalTable(data.paypal_table !== false);

          setStripeEnabled(!!data.stripe_enabled);
          setStripeConnected(!!data.stripe_connected);
          setStripeAccountLabel(data.stripe_account_label || '');
          setStripeDelivery(data.stripe_delivery !== false);
          setStripePickup(data.stripe_pickup !== false);
          setStripeTable(data.stripe_table !== false);

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
          card_table: cardTable,
          cash_delivery: cashDelivery,
          cash_pickup: cashPickup,
          cash_table: cashTable,
          paypal_enabled: paypalEnabled,
          paypal_connected: paypalConnected,
          paypal_email: paypalEmail,
          paypal_delivery: paypalDelivery,
          paypal_pickup: paypalPickup,
          paypal_table: paypalTable,
          stripe_enabled: stripeEnabled,
          stripe_connected: stripeConnected,
          stripe_account_label: stripeAccountLabel,
          stripe_delivery: stripeDelivery,
          stripe_pickup: stripePickup,
          stripe_table: stripeTable,
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
                    Gestisci come i tuoi clienti pagano in base al servizio (consegna, asporto e tavolo).
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
                {/* Payment Methods Card */}
                <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                      Associazione Metodi & Servizi
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Associa ciascun metodo di pagamento alle tipologie di servizio offerte.
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
                        {/* POS / Carta */}
                        <tr className="hover:bg-muted/5 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                                <CreditCard size={18} />
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-foreground">POS / Carta Fisico</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Corriere con POS portatile o pagamento in cassa</p>
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

                        {/* Contanti */}
                        <tr className="hover:bg-muted/5 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">€</span>
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-foreground">Contanti</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Pagamento in contanti al corriere o in cassa</p>
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

                        {/* Stripe */}
                        <tr className="hover:bg-muted/5 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                                <svg
                                  viewBox="0 -149 512 512"
                                  version="1.1"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="w-4.5 h-4.5"
                                  preserveAspectRatio="xMidYMid"
                                >
                                  <path
                                    d="M35.9822222,83.4844444 C35.9822222,77.9377778 40.5333333,75.8044444 48.0711111,75.8044444 C58.88,75.8044444 72.5333333,79.0755556 83.3422222,84.9066667 L83.3422222,51.4844444 C71.5377778,46.7911111 59.8755556,44.9422222 48.0711111,44.9422222 C19.2,44.9422222 0,60.0177778 0,85.1911111 C0,124.444444 54.0444444,118.186667 54.0444444,135.111111 C54.0444444,141.653333 48.3555556,143.786667 40.3911111,143.786667 C28.5866667,143.786667 13.5111111,138.951111 1.56444444,132.408889 L1.56444444,166.257778 C14.7911111,171.946667 28.16,174.364444 40.3911111,174.364444 C69.9733333,174.364444 90.3111111,159.715556 90.3111111,134.257778 C90.1688889,91.8755556 35.9822222,99.4133333 35.9822222,83.4844444 Z M132.124444,16.4977778 L97.4222222,23.8933333 L97.28,137.813333 C97.28,158.862222 113.066667,174.364444 134.115556,174.364444 C145.777778,174.364444 154.311111,172.231111 159.004444,169.671111 L159.004444,140.8 C154.453333,142.648889 131.982222,149.191111 131.982222,128.142222 L131.982222,77.6533333 L159.004444,77.6533333 L159.004444,47.36 L131.982222,47.36 L132.124444,16.4977778 Z M203.235556,57.8844444 L200.96,47.36 L170.24,47.36 L170.24,171.804444 L205.795556,171.804444 L205.795556,87.4666667 C214.186667,76.5155556 228.408889,78.5066667 232.817778,80.0711111 L232.817778,47.36 C228.266667,45.6533333 211.626667,42.5244444 203.235556,57.8844444 Z M241.493333,47.36 L277.191111,47.36 L277.191111,171.804444 L241.493333,171.804444 L241.493333,47.36 Z M241.493333,36.5511111 L277.191111,28.8711111 L277.191111,0 L241.493333,7.53777778 L241.493333,36.5511111 Z M351.431111,44.9422222 C337.493333,44.9422222 328.533333,51.4844444 323.555556,56.0355556 L321.706667,47.2177778 L290.417778,47.2177778 L290.417778,213.048889 L325.973333,205.511111 L326.115556,165.262222 C331.235556,168.96 338.773333,174.222222 351.288889,174.222222 C376.746667,174.222222 399.928889,153.742222 399.928889,108.657778 C399.786667,67.4133333 376.32,44.9422222 351.431111,44.9422222 Z M342.897778,142.933333 C334.506667,142.933333 329.528889,139.946667 326.115556,136.248889 L325.973333,83.4844444 C329.671111,79.36 334.791111,76.5155556 342.897778,76.5155556 C355.84,76.5155556 364.8,91.0222222 364.8,109.653333 C364.8,128.711111 355.982222,142.933333 342.897778,142.933333 Z M512,110.08 C512,73.6711111 494.364444,44.9422222 460.657778,44.9422222 C426.808889,44.9422222 406.328889,73.6711111 406.328889,109.795556 C406.328889,152.604444 430.506667,174.222222 465.208889,174.222222 C482.133333,174.222222 494.933333,170.382222 504.604444,164.977778 L504.604444,136.533333 C494.933333,141.368889 483.84,144.355556 469.76,144.355556 C455.964444,144.355556 443.733333,139.52 442.168889,122.737778 L511.715556,122.737778 C511.715556,120.888889 512,113.493333 512,110.08 Z M441.742222,96.5688889 C441.742222,80.4977778 451.555556,73.8133333 460.515556,73.8133333 C469.191111,73.8133333 478.435556,80.4977778 478.435556,96.5688889 L441.742222,96.5688889 L441.742222,96.5688889 Z"
                                    fill="#6772E5"
                                  />
                                </svg>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm text-foreground">Stripe (Online)</p>
                                  {stripeConnected && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                      Connesso
                                    </span>
                                  )}
                                </div>
                                {stripeConnected && stripeAccountLabel ? (
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                      {stripeAccountLabel}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (
                                          confirm(
                                            'Vuoi scollegare l\'account Stripe? Il pagamento online verrà disabilitato.'
                                          )
                                        ) {
                                          setStripeConnected(false);
                                          setStripeAccountLabel('');
                                        }
                                      }}
                                      className="text-[10px] text-destructive hover:underline"
                                    >
                                      Scollega
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-muted-foreground">Accetta carte di credito e debito online</p>
                                )}
                              </div>
                            </div>
                          </td>
                          {stripeConnected ? (
                            <>
                              <td className="p-4 text-center">
                                <div className="flex justify-center">
                                  <Toggle checked={stripeDelivery} onChange={setStripeDelivery} size="sm" />
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex justify-center">
                                  <Toggle checked={stripePickup} onChange={setStripePickup} size="sm" />
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex justify-center">
                                  <Toggle checked={stripeTable} onChange={setStripeTable} size="sm" />
                                </div>
                              </td>
                            </>
                          ) : (
                            <td colSpan={3} className="p-4 text-center">
                              <button
                                type="button"
                                onClick={() => setShowStripeModal(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all active:scale-95 whitespace-nowrap shadow-sm cursor-pointer"
                              >
                                Connetti Stripe →
                              </button>
                            </td>
                          )}
                        </tr>

                        {/* PayPal */}
                        <tr className="hover:bg-muted/5 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  aria-label="PayPal"
                                  role="img"
                                  viewBox="0 0 512 512"
                                  className="w-4.5 h-4.5"
                                >
                                  <g id="SVGRepo_bgCarrier" strokeWidth="0" />
                                  <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
                                  <g id="SVGRepo_iconCarrier">
                                    <path
                                      fill="#002c8a"
                                      d="M377 184.8L180.7 399h-72c-5 0-9-5-8-10l48-304c1-7 7-12 14-12h122c84 3 107 46 92 112z"
                                    />
                                    <path
                                      fill="#009be1"
                                      d="M380.2 165c30 16 37 46 27 86-13 59-52 84-109 85l-16 1c-6 0-10 4-11 10l-13 79c-1 7-7 12-14 12h-60c-5 0-9-5-8-10l22-143c1-5 182-120 182-120z"
                                    />
                                    <path
                                      fill="#001f6b"
                                      d="M197 292l20-127a14 14 0 0 1 13-11h96c23 0 40 4 54 11-5 44-26 115-128 117h-44c-5 0-10 4-11 10z"
                                    />
                                  </g>
                                </svg>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm text-foreground">PayPal (Online)</p>
                                  {paypalConnected && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                      Connesso
                                    </span>
                                  )}
                                </div>
                                {paypalConnected && paypalEmail ? (
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                      {paypalEmail}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (confirm('Vuoi scollegare l\'account PayPal?')) {
                                          setPaypalConnected(false);
                                          setPaypalEmail('');
                                        }
                                      }}
                                      className="text-[10px] text-destructive hover:underline"
                                    >
                                      Scollega
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-muted-foreground">Accetta pagamenti PayPal e carte online</p>
                                )}
                              </div>
                            </div>
                          </td>
                          {paypalConnected ? (
                            <>
                              <td className="p-4 text-center">
                                <div className="flex justify-center">
                                  <Toggle checked={paypalDelivery} onChange={setPaypalDelivery} size="sm" />
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex justify-center">
                                  <Toggle checked={paypalPickup} onChange={setPaypalPickup} size="sm" />
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex justify-center">
                                  <Toggle checked={paypalTable} onChange={setPaypalTable} size="sm" />
                                </div>
                              </td>
                            </>
                          ) : (
                            <td colSpan={3} className="p-4 text-center">
                              <button
                                type="button"
                                onClick={() => setShowPaypalModal(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#003087] hover:bg-[#00256b] text-white text-[11px] font-bold transition-all active:scale-95 whitespace-nowrap shadow-sm cursor-pointer"
                              >
                                Connetti PayPal →
                              </button>
                            </td>
                          )}
                        </tr>
                      </tbody>
                    </table>
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
                  setStripeDelivery(true);
                  setStripePickup(true);
                  setStripeTable(true);
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
                  setPaypalDelivery(true);
                  setPaypalPickup(true);
                  setPaypalTable(true);
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
