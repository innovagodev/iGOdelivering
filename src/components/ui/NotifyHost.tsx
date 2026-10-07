'use client';

import React, { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { subscribeConfirm, type ConfirmRequest } from '@/lib/notify';

/**
 * Toast e finestra di conferma dell'applicazione (vedi src/lib/notify.ts).
 * Da montare una sola volta, nel layout radice.
 */
export default function NotifyHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    subscribeConfirm((next) => setRequest(next));
    return () => subscribeConfirm(null);
  }, []);

  const close = (value: boolean) => {
    request?.resolve(value);
    setRequest(null);
  };

  useEffect(() => {
    if (!request) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        request.resolve(false);
        setRequest(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [request]);

  const options = request?.options;

  return (
    <>
      <Toaster
        position="top-center"
        duration={3500}
        gap={8}
        toastOptions={{
          style: {
            background: 'var(--card)',
            color: 'var(--card-foreground)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
          },
        }}
      />

      {options && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
          onClick={() => close(false)}
          role="alertdialog"
          aria-modal="true"
          aria-label={options.title || 'Conferma'}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {options.title && (
              <h2 className="text-base font-bold text-foreground">{options.title}</h2>
            )}
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {options.message}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {options.cancelLabel || 'Annulla'}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => close(true)}
                className={`rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors ${
                  options.destructive
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {options.confirmLabel || 'Conferma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
