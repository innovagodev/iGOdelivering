'use client';
import React from 'react';
import { CreditCard, Banknote, Bike, ShoppingBag } from 'lucide-react';
import Toggle from '@/components/ui/Toggle';

export interface PaymentConfig {
  card_delivery: boolean;
  card_pickup: boolean;
  cash_delivery: boolean;
  cash_pickup: boolean;
  onlinePaymentAccount?: string;
}

interface PaymentStepProps {
  paymentConfig: PaymentConfig;
  setPaymentConfig: React.Dispatch<React.SetStateAction<PaymentConfig>>;
}

interface PaymentRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}

function PaymentRow({ icon, label, description, checked, onToggle }: PaymentRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
        checked
          ? 'bg-primary/5 border-primary/30'
          : 'bg-muted/30 border-border hover:bg-muted/60'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
            checked ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
      {/* prevent double-fire from Toggle's own click + div onClick */}
      <div onClick={(e) => e.stopPropagation()}>
        <Toggle checked={checked} onChange={onToggle} size="sm" />
      </div>
    </div>
  );
}

interface PaymentCardProps {
  icon: React.ReactNode;
  title: string;
  accentClass: string;
  children: React.ReactNode;
}

function PaymentCard({ icon, title, accentClass, children }: PaymentCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      {/* Card header */}
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accentClass}`}>
          {icon}
        </div>
        <span className="text-sm font-bold text-foreground uppercase tracking-wide">{title}</span>
      </div>
      {/* Rows */}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export default function PaymentStep({ paymentConfig, setPaymentConfig }: PaymentStepProps) {
  const toggleField = (field: 'card_delivery' | 'card_pickup' | 'cash_delivery' | 'cash_pickup') => {
    setPaymentConfig((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Metodi di Pagamento</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Abilita i metodi di pagamento supportati per ciascuna tipologia di servizio
        </p>
      </div>

      <div className="space-y-4">
        {/* Card / Electronic */}
        <PaymentCard
          title="Pagamenti Elettronici"
          icon={<CreditCard size={18} className="text-primary" />}
          accentClass="bg-primary/10"
        >
          <PaymentRow
            icon={<Bike size={15} />}
            label="Carta alla Consegna"
            description="Il cliente paga con carta tramite POS portatile alla consegna."
            checked={paymentConfig.card_delivery}
            onToggle={() => toggleField('card_delivery')}
          />
          <PaymentRow
            icon={<ShoppingBag size={15} />}
            label="Carta al Ritiro (Asporto)"
            description="Il cliente paga con carta al momento del ritiro presso il locale."
            checked={paymentConfig.card_pickup}
            onToggle={() => toggleField('card_pickup')}
          />
        </PaymentCard>

        {/* Cash */}
        <PaymentCard
          title="Pagamento in Contanti"
          icon={<Banknote size={18} className="text-emerald-600" />}
          accentClass="bg-emerald-100 dark:bg-emerald-900/30"
        >
          <PaymentRow
            icon={<Bike size={15} />}
            label="Contanti alla Consegna"
            description="Il cliente paga in contanti direttamente al fattorino."
            checked={paymentConfig.cash_delivery}
            onToggle={() => toggleField('cash_delivery')}
          />
          <PaymentRow
            icon={<ShoppingBag size={15} />}
            label="Contanti al Ritiro (Asporto)"
            description="Il cliente paga in contanti al momento del ritiro in cassa."
            checked={paymentConfig.cash_pickup}
            onToggle={() => toggleField('cash_pickup')}
          />
        </PaymentCard>

        {/* Online Payment Account (IBAN) */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600">
              <CreditCard size={18} />
            </div>
            <span className="text-sm font-bold text-foreground uppercase tracking-wide">Accredito Pagamenti Online</span>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              IBAN / Conto di accredito pagamenti online (Facoltativo)
            </label>
            <input
              type="text"
              value={paymentConfig.onlinePaymentAccount || ''}
              onChange={(e) => setPaymentConfig((prev) => ({ ...prev, onlinePaymentAccount: e.target.value }))}
              placeholder="Inserisci l'IBAN per ricevere i pagamenti"
              className="w-full px-3.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
