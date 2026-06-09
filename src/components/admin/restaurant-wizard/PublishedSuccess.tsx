import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, CheckSquare } from 'lucide-react';

interface PublishedSuccessProps {
  restaurantName: string;
  email: string;
  restaurantId?: string;
}

export default function PublishedSuccess({ restaurantName, email, restaurantId }: PublishedSuccessProps) {
  const [copied, setCopied] = useState(false);
  const activationLink = typeof window !== 'undefined'
    ? `${window.location.origin}/register?email=${encodeURIComponent(email)}&restaurant_id=${restaurantId || ''}`
    : '';

  const handleCopy = () => {
    if (!activationLink) return;
    navigator.clipboard.writeText(activationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--success-bg)] flex items-center justify-center mx-auto mb-6">
          <Check size={36} className="text-[var(--success)]" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Ristorante Pubblicato!</h2>
        <p className="text-muted-foreground mb-8">
          <strong>{restaurantName || 'Il ristorante'}</strong> è ora online. Di seguito trovi il link di attivazione generato per il proprietario.
        </p>
        <div className="bg-card border border-border rounded-xl p-5 mb-6 text-left space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Attivazione Proprietario Ristorante
          </p>
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <span className="text-sm text-muted-foreground">Email di invio</span>
            <span className="text-sm font-semibold text-foreground">
              {email || 'ristoratore@example.it'}
            </span>
          </div>
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-semibold text-muted-foreground">Link di attivazione</span>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={activationLink}
                className="w-full px-3 py-2 text-xs bg-muted border border-border rounded-xl text-muted-foreground focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-colors cursor-pointer shrink-0"
              >
                {copied ? <CheckSquare size={13} /> : <Copy size={13} />}
                {copied ? 'Copiato' : 'Copia'}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
              Il proprietario dovrà cliccare su questo link per impostare la propria password e attivare l'utenza.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href={`/admin/restaurants/${restaurantId || 'new'}/access`}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-primary-hover transition-all"
          >
            Gestisci Accessi
          </Link>
          <Link
            href="/admin/restaurants"
            className="w-full flex items-center justify-center gap-2 bg-muted text-foreground px-4 py-3 rounded-xl text-sm font-semibold hover:bg-border transition-all"
          >
            Torna alla lista ristoranti
          </Link>
        </div>
      </div>
    </div>
  );
}
