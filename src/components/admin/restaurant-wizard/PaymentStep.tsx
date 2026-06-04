'use client';
import React, { useState } from 'react';
import { Banknote, Bike, ShoppingBag, ShieldCheck } from 'lucide-react';
import Toggle from '@/components/ui/Toggle';

export interface PaymentConfig {
  card_delivery: boolean;
  card_pickup: boolean;
  cash_delivery: boolean;
  cash_pickup: boolean;
  // Stripe Connect OAuth
  stripe_enabled: boolean;
  stripe_connected: boolean;
  stripe_account_label: string;
  // PayPal OAuth
  paypal_enabled: boolean;
  paypal_connected: boolean;
  paypal_email: string;
  // IBAN (dato pubblico, nessun OAuth)
  iban_enabled: boolean;
  onlinePaymentAccount: string;
  ibanHolder: string;
}

interface PaymentStepProps {
  paymentConfig: PaymentConfig;
  setPaymentConfig: React.Dispatch<React.SetStateAction<PaymentConfig>>;
}

function PaymentRow({
  icon,
  label,
  description,
  checked,
  onToggle,
  iconBgClass = 'bg-primary/10 text-primary',
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  iconBgClass?: string;
}) {
  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer ${checked
        ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20'
        : 'border-border bg-card hover:bg-muted/30'
        }`}
      onClick={onToggle}
    >
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${checked ? iconBgClass : 'bg-muted text-muted-foreground'
              }`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-bold text-foreground">{label}</span>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <Toggle checked={checked} onChange={onToggle} size="sm" />
        </div>
      </div>
    </div>
  );
}

export default function PaymentStep({ paymentConfig, setPaymentConfig }: PaymentStepProps) {
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [showPaypalModal, setShowPaypalModal] = useState(false);

  const toggle = (field: keyof PaymentConfig) => {
    setPaymentConfig((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleText = (field: keyof PaymentConfig, value: string) => {
    setPaymentConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Metodi di Pagamento</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configura come il ristorante accetterà i pagamenti. Tutti i metodi sono facoltativi e possono essere modificati in seguito.
        </p>
      </div>

      {/* ── POS Fisico e Contanti ─────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-foreground uppercase tracking-wide">Carta & Contanti</span>
        </div>
        <PaymentRow
          icon={<Bike size={16} />}
          label="POS alla Consegna"
          description="Carta tramite POS portatile del corriere"
          checked={paymentConfig.card_delivery}
          onToggle={() => toggle('card_delivery')}
          iconBgClass="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
        />
        <PaymentRow
          icon={<ShoppingBag size={16} />}
          label="POS al Ritiro"
          description="Carta in cassa per asporto"
          checked={paymentConfig.card_pickup}
          onToggle={() => toggle('card_pickup')}
          iconBgClass="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
        />
        <PaymentRow
          icon={<Bike size={16} />}
          label="Contanti alla Consegna"
          description="Pagamento in contanti al fattorino"
          checked={paymentConfig.cash_delivery}
          onToggle={() => toggle('cash_delivery')}
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
        />
        <PaymentRow
          icon={<ShoppingBag size={16} />}
          label="Contanti al Ritiro"
          description="Pagamento in contanti in cassa"
          checked={paymentConfig.cash_pickup}
          onToggle={() => toggle('cash_pickup')}
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
        />
      </div>

      {/* ── Pagamenti Online ─────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-foreground uppercase tracking-wide">Pagamenti Online</span>
        </div>

        {/* Stripe Connect */}
        <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${paymentConfig.stripe_connected
          ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20'
          : 'border-border bg-card'
          }`}>
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 -149 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5" preserveAspectRatio="xMidYMid">
                  <path d="M35.9822222,83.4844444 C35.9822222,77.9377778 40.5333333,75.8044444 48.0711111,75.8044444 C58.88,75.8044444 72.5333333,79.0755556 83.3422222,84.9066667 L83.3422222,51.4844444 C71.5377778,46.7911111 59.8755556,44.9422222 48.0711111,44.9422222 C19.2,44.9422222 0,60.0177778 0,85.1911111 C0,124.444444 54.0444444,118.186667 54.0444444,135.111111 C54.0444444,141.653333 48.3555556,143.786667 40.3911111,143.786667 C28.5866667,143.786667 13.5111111,138.951111 1.56444444,132.408889 L1.56444444,166.257778 C14.7911111,171.946667 28.16,174.364444 40.3911111,174.364444 C69.9733333,174.364444 90.3111111,159.715556 90.3111111,134.257778 C90.1688889,91.8755556 35.9822222,99.4133333 35.9822222,83.4844444 Z M132.124444,16.4977778 L97.4222222,23.8933333 L97.28,137.813333 C97.28,158.862222 113.066667,174.364444 134.115556,174.364444 C145.777778,174.364444 154.311111,172.231111 159.004444,169.671111 L159.004444,140.8 C154.453333,142.648889 131.982222,149.191111 131.982222,128.142222 L131.982222,77.6533333 L159.004444,77.6533333 L159.004444,47.36 L131.982222,47.36 L132.124444,16.4977778 Z M203.235556,57.8844444 L200.96,47.36 L170.24,47.36 L170.24,171.804444 L205.795556,171.804444 L205.795556,87.4666667 C214.186667,76.5155556 228.408889,78.5066667 232.817778,80.0711111 L232.817778,47.36 C228.266667,45.6533333 211.626667,42.5244444 203.235556,57.8844444 Z M241.493333,47.36 L277.191111,47.36 L277.191111,171.804444 L241.493333,171.804444 L241.493333,47.36 Z M241.493333,36.5511111 L277.191111,28.8711111 L277.191111,0 L241.493333,7.53777778 L241.493333,36.5511111 Z M351.431111,44.9422222 C337.493333,44.9422222 328.533333,51.4844444 323.555556,56.0355556 L321.706667,47.2177778 L290.417778,47.2177778 L290.417778,213.048889 L325.973333,205.511111 L326.115556,165.262222 C331.235556,168.96 338.773333,174.222222 351.288889,174.222222 C376.746667,174.222222 399.928889,153.742222 399.928889,108.657778 C399.786667,67.4133333 376.32,44.9422222 351.431111,44.9422222 Z M342.897778,142.933333 C334.506667,142.933333 329.528889,139.946667 326.115556,136.248889 L325.973333,83.4844444 C329.671111,79.36 334.791111,76.5155556 342.897778,76.5155556 C355.84,76.5155556 364.8,91.0222222 364.8,109.653333 C364.8,128.711111 355.982222,142.933333 342.897778,142.933333 Z M512,110.08 C512,73.6711111 494.364444,44.9422222 460.657778,44.9422222 C426.808889,44.9422222 406.328889,73.6711111 406.328889,109.795556 C406.328889,152.604444 430.506667,174.222222 465.208889,174.222222 C482.133333,174.222222 494.933333,170.382222 504.604444,164.977778 L504.604444,136.533333 C494.933333,141.368889 483.84,144.355556 469.76,144.355556 C455.964444,144.355556 443.733333,139.52 442.168889,122.737778 L511.715556,122.737778 C511.715556,120.888889 512,113.493333 512,110.08 Z M441.742222,96.5688889 C441.742222,80.4977778 451.555556,73.8133333 460.515556,73.8133333 C469.191111,73.8133333 478.435556,80.4977778 478.435556,96.5688889 L441.742222,96.5688889 L441.742222,96.5688889 Z" fill="#6772E5" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-foreground">Stripe</span>
                  {paymentConfig.stripe_connected && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Attivo
                    </span>
                  )}
                </div>
                {paymentConfig.stripe_connected && paymentConfig.stripe_account_label ? (
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{paymentConfig.stripe_account_label}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Carte di credito e debito online</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {paymentConfig.stripe_connected ? (
                <>
                  <Toggle checked={paymentConfig.stripe_enabled} onChange={() => toggle('stripe_enabled')} size="sm" />
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Disconnettere Stripe? Il pagamento con carta online verrà disabilitato.')) {
                        setPaymentConfig((p) => ({ ...p, stripe_connected: false, stripe_account_label: '', stripe_enabled: false }));
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all active:scale-95 whitespace-nowrap shadow-sm"
                >
                  Connetti Stripe
                </button>
              )}
            </div>
          </div>
        </div>

        {/* PayPal Connect */}
        <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${paymentConfig.paypal_connected
          ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20'
          : 'border-border bg-card'
          }`}>
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" aria-label="PayPal" role="img" viewBox="0 0 512 512" className="w-4.5 h-4.5">
                  <g id="SVGRepo_bgCarrier" strokeWidth="0" />
                  <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
                  <g id="SVGRepo_iconCarrier">
                    <path fill="#002c8a" d="M377 184.8L180.7 399h-72c-5 0-9-5-8-10l48-304c1-7 7-12 14-12h122c84 3 107 46 92 112z" />
                    <path fill="#009be1" d="M380.2 165c30 16 37 46 27 86-13 59-52 84-109 85l-16 1c-6 0-10 4-11 10l-13 79c-1 7-7 12-14 12h-60c-5 0-9-5-8-10l22-143c1-5 182-120 182-120z" />
                    <path fill="#001f6b" d="M197 292l20-127a14 14 0 0 1 13-11h96c23 0 40 4 54 11-5 44-26 115-128 117h-44c-5 0-10 4-11 10z" />
                  </g>
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-foreground">PayPal</span>
                  {paymentConfig.paypal_connected && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Attivo
                    </span>
                  )}
                </div>
                {paymentConfig.paypal_connected && paymentConfig.paypal_email ? (
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{paymentConfig.paypal_email}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">PayPal e carte tramite account PayPal Business</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {paymentConfig.paypal_connected ? (
                <>
                  <Toggle checked={paymentConfig.paypal_enabled} onChange={() => toggle('paypal_enabled')} size="sm" />
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Disconnettere PayPal?')) {
                        setPaymentConfig((p) => ({ ...p, paypal_connected: false, paypal_email: '', paypal_enabled: false }));
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#003087] hover:bg-[#00256b] text-white text-[11px] font-bold transition-all active:scale-95 whitespace-nowrap shadow-sm"
                >
                  Connetti PayPal
                </button>
              )}
            </div>
          </div>
        </div>

        {/* IBAN */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
              </div>
              <div>
                <span className="text-sm font-bold text-foreground">Accredito IBAN</span>
                <p className="text-[11px] text-muted-foreground">Mostra le coordinate bancarie ai clienti</p>
              </div>
            </div>
            <Toggle checked={paymentConfig.iban_enabled} onChange={() => toggle('iban_enabled')} size="sm" />
          </div>
          {paymentConfig.iban_enabled && (
            <div className="px-4 pb-4 space-y-3 border-t border-border/60 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Codice IBAN</label>
                <input
                  type="text"
                  value={paymentConfig.onlinePaymentAccount}
                  onChange={(e) => handleText('onlinePaymentAccount', e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ''))}
                  placeholder="IT60 X 00000 00000 000000000000"
                  maxLength={34}
                  className="w-full px-3.5 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring font-mono tracking-widest"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Intestatario Conto</label>
                <input
                  type="text"
                  value={paymentConfig.ibanHolder}
                  onChange={(e) => handleText('ibanHolder', e.target.value)}
                  placeholder="Nome Cognome / Ragione Sociale"
                  className="w-full px-3.5 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ STRIPE MODAL ══════════════════════════════════════ */}
      {showStripeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <svg viewBox="0 -149 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" preserveAspectRatio="xMidYMid">
                  <path d="M35.9822222,83.4844444 C35.9822222,77.9377778 40.5333333,75.8044444 48.0711111,75.8044444 C58.88,75.8044444 72.5333333,79.0755556 83.3422222,84.9066667 L83.3422222,51.4844444 C71.5377778,46.7911111 59.8755556,44.9422222 48.0711111,44.9422222 C19.2,44.9422222 0,60.0177778 0,85.1911111 C0,124.444444 54.0444444,118.186667 54.0444444,135.111111 C54.0444444,141.653333 48.3555556,143.786667 40.3911111,143.786667 C28.5866667,143.786667 13.5111111,138.951111 1.56444444,132.408889 L1.56444444,166.257778 C14.7911111,171.946667 28.16,174.364444 40.3911111,174.364444 C69.9733333,174.364444 90.3111111,159.715556 90.3111111,134.257778 C90.1688889,91.8755556 35.9822222,99.4133333 35.9822222,83.4844444 Z M132.124444,16.4977778 L97.4222222,23.8933333 L97.28,137.813333 C97.28,158.862222 113.066667,174.364444 134.115556,174.364444 C145.777778,174.364444 154.311111,172.231111 159.004444,169.671111 L159.004444,140.8 C154.453333,142.648889 131.982222,149.191111 131.982222,128.142222 L131.982222,77.6533333 L159.004444,77.6533333 L159.004444,47.36 L131.982222,47.36 L132.124444,16.4977778 Z M203.235556,57.8844444 L200.96,47.36 L170.24,47.36 L170.24,171.804444 L205.795556,171.804444 L205.795556,87.4666667 C214.186667,76.5155556 228.408889,78.5066667 232.817778,80.0711111 L232.817778,47.36 C228.266667,45.6533333 211.626667,42.5244444 203.235556,57.8844444 Z M241.493333,47.36 L277.191111,47.36 L277.191111,171.804444 L241.493333,171.804444 L241.493333,47.36 Z M241.493333,36.5511111 L277.191111,28.8711111 L277.191111,0 L241.493333,7.53777778 L241.493333,36.5511111 Z M351.431111,44.9422222 C337.493333,44.9422222 328.533333,51.4844444 323.555556,56.0355556 L321.706667,47.2177778 L290.417778,47.2177778 L290.417778,213.048889 L325.973333,205.511111 L326.115556,165.262222 C331.235556,168.96 338.773333,174.222222 351.288889,174.222222 C376.746667,174.222222 399.928889,153.742222 399.928889,108.657778 C399.786667,67.4133333 376.32,44.9422222 351.431111,44.9422222 Z M342.897778,142.933333 C334.506667,142.933333 329.528889,139.946667 326.115556,136.248889 L325.973333,83.4844444 C329.671111,79.36 334.791111,76.5155556 342.897778,76.5155556 C355.84,76.5155556 364.8,91.0222222 364.8,109.653333 C364.8,128.711111 355.982222,142.933333 342.897778,142.933333 Z M512,110.08 C512,73.6711111 494.364444,44.9422222 460.657778,44.9422222 C426.808889,44.9422222 406.328889,73.6711111 406.328889,109.795556 C406.328889,152.604444 430.506667,174.222222 465.208889,174.222222 C482.133333,174.222222 494.933333,170.382222 504.604444,164.977778 L504.604444,136.533333 C494.933333,141.368889 483.84,144.355556 469.76,144.355556 C455.964444,144.355556 443.733333,139.52 442.168889,122.737778 L511.715556,122.737778 C511.715556,120.888889 512,113.493333 512,110.08 Z M441.742222,96.5688889 C441.742222,80.4977778 451.555556,73.8133333 460.515556,73.8133333 C469.191111,73.8133333 478.435556,80.4977778 478.435556,96.5688889 L441.742222,96.5688889 L441.742222,96.5688889 Z" fill="#6772E5" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Connetti account Stripe</h3>
              </div>
            </div>
            <div className="space-y-3 mb-5">
              {[
                { n: '1', text: 'Reindirizzamento alla pagina di autorizzazione Stripe' },
                { n: '2', text: 'Accesso con le credenziali account Stripe del ristorante' },
                { n: '3', text: 'Autorizzazione a iGOdelivering di ricevere pagamenti' },
                { n: '4', text: 'Ritorno qui con account collegato ✓' },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.n}</span>
                  <p className="text-sm text-foreground/80">{s.text}</p>
                </div>
              ))}
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl mb-5">
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                <strong>Nota:</strong> La connessione OAuth reale sarà attiva dopo la migrazione al database. Per ora la connessione è simulata per testare il flusso.
              </p>
            </div>
            <div className="space-y-1 mb-4">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email account Stripe (demo)</label>
              <input type="email" placeholder="email@stripe.com" className="w-full px-3.5 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40" id="wizard-stripe-email" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowStripeModal(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('wizard-stripe-email') as HTMLInputElement;
                  const val = el?.value?.trim() || 'account@stripe.com';
                  setPaymentConfig((p) => ({ ...p, stripe_connected: true, stripe_enabled: true, stripe_account_label: val }));
                  setShowStripeModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all active:scale-95 shadow-sm"
              >
                Connetti a Stripe →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PAYPAL MODAL ══════════════════════════════════════ */}
      {showPaypalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" aria-label="PayPal" role="img" viewBox="0 0 512 512" className="w-6 h-6">
                  <g id="SVGRepo_bgCarrier" strokeWidth="0" />
                  <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
                  <g id="SVGRepo_iconCarrier">
                    <path fill="#002c8a" d="M377 184.8L180.7 399h-72c-5 0-9-5-8-10l48-304c1-7 7-12 14-12h122c84 3 107 46 92 112z" />
                    <path fill="#009be1" d="M380.2 165c30 16 37 46 27 86-13 59-52 84-109 85l-16 1c-6 0-10 4-11 10l-13 79c-1 7-7 12-14 12h-60c-5 0-9-5-8-10l22-143c1-5 182-120 182-120z" />
                    <path fill="#001f6b" d="M197 292l20-127a14 14 0 0 1 13-11h96c23 0 40 4 54 11-5 44-26 115-128 117h-44c-5 0-10 4-11 10z" />
                  </g>
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Connetti account PayPal</h3>
                <p className="text-xs text-muted-foreground">Autorizza iGOdelivering a ricevere pagamenti</p>
              </div>
            </div>
            <div className="space-y-3 mb-5">
              {[
                { n: '1', text: 'Reindirizzamento alla pagina di autorizzazione PayPal' },
                { n: '2', text: 'Accesso con account PayPal Business del ristorante' },
                { n: '3', text: 'Conferma autorizzazioni per iGOdelivering' },
                { n: '4', text: 'Account collegato, i clienti possono pagare con PayPal ✓' },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.n}</span>
                  <p className="text-sm text-foreground/80">{s.text}</p>
                </div>
              ))}
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl mb-5">
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                <strong>Nota:</strong> L&apos;integrazione OAuth reale sarà attiva dopo la migrazione al database.
              </p>
            </div>
            <div className="space-y-1 mb-4">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email account PayPal Business (demo)</label>
              <input type="email" placeholder="email@paypal.com" className="w-full px-3.5 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/40" id="wizard-paypal-email" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowPaypalModal(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('wizard-paypal-email') as HTMLInputElement;
                  const val = el?.value?.trim() || 'account@paypal.com';
                  setPaymentConfig((p) => ({ ...p, paypal_connected: true, paypal_enabled: true, paypal_email: val }));
                  setShowPaypalModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#003087] hover:bg-[#00256b] text-white text-sm font-bold transition-all active:scale-95 shadow-sm"
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
