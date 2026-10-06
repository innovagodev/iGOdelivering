'use client';

import React, { useMemo, useState } from 'react';
import { loadStripe, type Stripe as StripeJs } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Lock } from 'lucide-react';

/**
 * Pagamento online nel checkout della vetrina (piano pagamenti, fase 4).
 *
 * Mostra il Payment Element di Stripe — un iframe del gateway: numero di
 * carta e CVV non passano mai dalla pagina — per il PaymentIntent che
 * /api/orders ha creato sull'account Stripe del ristorante. Carte, Apple Pay,
 * Google Pay e gli altri metodi attivi sul suo account compaiono da soli.
 *
 * L'esito mostrato qui NON fa entrare l'ordine in cucina: lo fa il webhook
 * quando Stripe conferma il pagamento al server (fase 5). Qui si informa solo
 * il cliente.
 */

const stripeCache = new Map<string, Promise<StripeJs | null>>();
const stripeFor = (account: string) => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  if (!stripeCache.has(account)) stripeCache.set(account, loadStripe(key, { stripeAccount: account }));
  return stripeCache.get(account) as Promise<StripeJs | null>;
};

export interface StripePaymentProps {
  clientSecret: string;
  stripeAccount: string;
  amountCents: number;
  orderId: string;
  lang: 'it' | 'en';
  onPaid: (status: 'succeeded' | 'processing') => void;
  onCancel: () => void;
}

export default function StripePayment(props: StripePaymentProps) {
  const stripePromise = useMemo(() => stripeFor(props.stripeAccount), [props.stripeAccount]);
  if (!stripePromise) {
    return (
      <p className="text-xs text-red-500 font-semibold">
        {props.lang === 'en' ? 'Online payment is not available.' : 'Il pagamento online non è disponibile.'}
      </p>
    );
  }
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        locale: props.lang,
        appearance: {
          theme: 'stripe',
          variables: { colorPrimary: '#ea580c', borderRadius: '10px', fontSizeBase: '15px' },
        },
      }}
    >
      <PaymentForm {...props} />
    </Elements>
  );
}

function PaymentForm({ amountCents, orderId, lang, onPaid, onCancel }: StripePaymentProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const amount = (amountCents / 100).toFixed(2).replace('.', ',');

  const pay = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Usata solo dai metodi che richiedono un reindirizzamento: il
        // cliente torna sulla pagina di tracking del suo ordine.
        return_url: `${window.location.origin}/ordine/tracking?id=${encodeURIComponent(orderId)}`,
      },
      redirect: 'if_required',
    });
    if (confirmError) {
      // Carta rifiutata, 3D Secure non superato, dati incompleti: il cliente
      // può correggere e riprovare sullo stesso pagamento.
      setError(confirmError.message || (lang === 'en' ? 'Payment failed.' : 'Pagamento non riuscito.'));
      setSubmitting(false);
      return;
    }
    if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
      onPaid(paymentIntent.status);
      return;
    }
    setError(
      lang === 'en'
        ? 'The payment was not completed. Please try again.'
        : 'Il pagamento non è stato completato. Riprova.'
    );
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <PaymentElement
        options={{ layout: 'tabs' }}
        onReady={() => setReady(true)}
        onChange={() => error && setError(null)}
      />
      {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
      <button
        type="button"
        onClick={pay}
        disabled={!stripe || !elements || !ready || submitting}
        className="w-full py-3 bg-primary text-white font-extrabold rounded-lg hover:bg-primary-hover transition-all active:scale-95 text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {lang === 'en' ? 'Processing…' : 'Pagamento in corso…'}
          </>
        ) : (
          <>
            <Lock size={14} />
            {lang === 'en' ? `Pay € ${amount}` : `Paga € ${amount}`}
          </>
        )}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="w-full text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        {lang === 'en' ? 'Cancel and choose another method' : 'Annulla e scegli un altro metodo'}
      </button>
      <p className="text-[10px] text-muted-foreground text-center">
        {lang === 'en'
          ? 'Payment processed securely by Stripe. Card details never reach our servers.'
          : 'Pagamento gestito in sicurezza da Stripe. I dati della carta non passano dai nostri server.'}
      </p>
    </div>
  );
}
