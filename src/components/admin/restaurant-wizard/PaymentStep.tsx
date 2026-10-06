'use client';
import React, { useState } from 'react';
import { Banknote, ShoppingBag } from 'lucide-react';
import Toggle from '@/components/ui/Toggle';

export interface PaymentConfig {
  card_delivery: boolean;
  card_pickup: boolean;
  card_table: boolean;
  cash_delivery: boolean;
  cash_pickup: boolean;
  cash_table: boolean;
  // Stripe: lo stato del collegamento è in sola lettura (lo scrive il
  // server); stripe_delivery/pickup li sceglie il titolare dal suo pannello.
  stripe_enabled: boolean;
  stripe_connected: boolean;
  stripe_account_label: string;
  stripe_delivery: boolean;
  stripe_pickup: boolean;
  stripe_table: boolean;
  // PayPal: in arrivo, nessun collegamento possibile per ora.
  paypal_enabled: boolean;
  paypal_connected: boolean;
  paypal_email: string;
  paypal_delivery: boolean;
  paypal_pickup: boolean;
  paypal_table: boolean;
}

interface PaymentStepProps {
  paymentConfig: PaymentConfig;
  setPaymentConfig: React.Dispatch<React.SetStateAction<PaymentConfig>>;
}

export default function PaymentStep({ paymentConfig, setPaymentConfig }: PaymentStepProps) {
  const [copied, setCopied] = useState(false);
  const pagamentiUrl =
    (typeof window !== 'undefined' ? window.location.origin : 'https://app.igodelivering.it') +
    '/ristoratore/pagamenti';

  const toggle = (field: keyof PaymentConfig) => {
    setPaymentConfig((prev) => {
      const next = { ...prev, [field]: !prev[field] };
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Metodi di Pagamento</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configura come il ristorante accetterà i pagamenti per ogni tipologia di servizio (Consegna, Asporto, Tavolo).
        </p>
      </div>

      {/* ── MATRICE DEI PAGAMENTI (PREMIUM DESIGN) ─────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <span className="text-xs font-bold text-foreground uppercase tracking-wide">
            Associazione Metodi & Servizi
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Seleziona per quali servizi abilitare ciascun metodo di pagamento.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[500px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="p-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-2/5">
                  Metodo di Pagamento
                </th>
                <th className="p-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                  Consegna 🛵
                </th>
                <th className="p-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                  Asporto 🛍
                </th>
                <th className="p-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">
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
                      <ShoppingBag size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">POS / Carta Fisico</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Pagamento con carta tramite POS fisico</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center">
                    <Toggle
                      checked={paymentConfig.card_delivery}
                      onChange={() => toggle('card_delivery')}
                      size="sm"
                    />
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center">
                    <Toggle
                      checked={paymentConfig.card_pickup}
                      onChange={() => toggle('card_pickup')}
                      size="sm"
                    />
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center">
                    <Toggle
                      checked={paymentConfig.card_table}
                      onChange={() => toggle('card_table')}
                      size="sm"
                    />
                  </div>
                </td>
              </tr>

              {/* Contanti */}
              <tr className="hover:bg-muted/5 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <Banknote size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Contanti</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Pagamento in contanti alla consegna o in cassa</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center">
                    <Toggle
                      checked={paymentConfig.cash_delivery}
                      onChange={() => toggle('cash_delivery')}
                      size="sm"
                    />
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center">
                    <Toggle
                      checked={paymentConfig.cash_pickup}
                      onChange={() => toggle('cash_pickup')}
                      size="sm"
                    />
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center">
                    <Toggle
                      checked={paymentConfig.cash_table}
                      onChange={() => toggle('cash_table')}
                      size="sm"
                    />
                  </div>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagamenti online ─────────────────────────────────────────────
          Il collegamento a Stripe lo completa il TITOLARE dal suo pannello
          (documento, IBAN, termini di Stripe): l'admin vede solo lo stato,
          che scrive il server leggendolo da Stripe. Le colonne del
          collegamento non sono modificabili dal browser (migration 028). */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-foreground uppercase tracking-wide">
            Pagamenti online con Stripe
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              paymentConfig.stripe_connected
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            {paymentConfig.stripe_connected ? 'Attivo' : 'Da collegare dal titolare'}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Ogni ristorante incassa sul proprio conto Stripe. Il titolare collega l&apos;account
          dalla pagina <strong>Pagamenti</strong> del suo pannello, dopo l&apos;attivazione: la
          procedura di Stripe gli chiede un documento e l&apos;IBAN, e non può essere completata
          al suo posto. Da lì sceglie anche se offrire il pagamento online per consegna e
          asporto; al tavolo restano cassa e POS.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="text-[11px] bg-muted px-2 py-1 rounded-md text-foreground">
            {pagamentiUrl}
          </code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(pagamentiUrl).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            className="text-[11px] font-bold text-primary hover:underline"
          >
            {copied ? 'Copiato' : 'Copia link da inviare al titolare'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-card p-4 flex items-center gap-3 opacity-80">
        <div className="w-8 h-8 rounded-xl bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0 text-[#003087] font-black text-xs">
          P
        </div>
        <div>
          <div className="text-xs font-bold text-foreground">
            PayPal <span className="text-[10px] text-muted-foreground ml-1">IN ARRIVO</span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            Il collegamento a PayPal sarà disponibile con un prossimo aggiornamento.
          </div>
        </div>
      </div>
    </div>
  );
}
