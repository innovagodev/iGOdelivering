import React from 'react';
import { PRIVACY_URL } from '@/lib/legal';

type Action = 'order' | 'booking' | 'account';

const TEXT: Record<'it' | 'en', Record<Action, { before: string; link: string }>> = {
  it: {
    order: { before: "Inviando l'ordine dichiari di aver letto l'", link: 'informativa privacy' },
    booking: { before: 'Inviando la prenotazione dichiari di aver letto l\'', link: 'informativa privacy' },
    account: { before: "Attivando l'account dichiari di aver letto l'", link: 'informativa privacy' },
  },
  en: {
    order: { before: 'By placing the order you confirm you have read the ', link: 'privacy policy' },
    booking: { before: 'By sending the booking you confirm you have read the ', link: 'privacy policy' },
    account: { before: 'By activating the account you confirm you have read the ', link: 'privacy policy' },
  },
};

/**
 * Avviso sul trattamento dei dati, con il collegamento all'informativa (che vive su
 * igodelivering.it). È un avviso, non una casella da spuntare: per ordinare non serve un
 * consenso, serve che l'informativa sia raggiungibile prima dell'invio dei dati.
 */
export default function PrivacyNotice({
  lang = 'it',
  action = 'order',
  className = '',
}: {
  lang?: 'it' | 'en';
  action?: Action;
  className?: string;
}) {
  const t = TEXT[lang][action];
  return (
    <p className={`text-[11px] leading-snug text-muted-foreground ${className}`}>
      {t.before}
      <a
        href={PRIVACY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-foreground underline underline-offset-2 hover:text-primary"
      >
        {t.link}
      </a>
      .
    </p>
  );
}
