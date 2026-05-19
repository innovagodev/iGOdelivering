'use client';
import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

interface PublishedSuccessProps {
  restaurantName: string;
  email: string;
}

export default function PublishedSuccess({ restaurantName, email }: PublishedSuccessProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--success-bg)] flex items-center justify-center mx-auto mb-6">
          <Check size={36} className="text-[var(--success)]" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Ristorante Pubblicato!</h2>
        <p className="text-muted-foreground mb-8">
          <strong>{restaurantName || 'Il ristorante'}</strong> è ora online. Le credenziali di
          accesso sono state generate per il ristoratore.
        </p>
        <div className="bg-card border border-border rounded-xl p-5 mb-6 text-left space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Credenziali generate
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-semibold text-foreground">
              {email || 'ristoratore@example.it'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Password temporanea</span>
            <span className="text-sm font-mono font-bold text-primary">Temp2026!</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Ruolo</span>
            <span className="text-sm font-semibold text-foreground">Ristoratore</span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href={`/admin/restaurants/r-new/access`}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-[#d43d22] transition-all"
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
