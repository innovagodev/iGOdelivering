'use client';

import { toast } from 'sonner';

/**
 * Notifiche dell'interfaccia: sostituiscono alert() e confirm() del browser,
 * che mostrano "app.igodelivering.it dice" in una finestra di sistema.
 *
 *   notify.success('Salvato');            // toast breve, si chiude da solo
 *   notify.error('Operazione non riuscita');
 *   if (await confirmAction({ message: 'Eliminare la zona?', destructive: true })) { … }
 *
 * Il rendering è in <NotifyHost />, montato una volta sola nel layout radice.
 */

export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast(message),
};

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Azione distruttiva: il pulsante di conferma è rosso. */
  destructive?: boolean;
}

export interface ConfirmRequest {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

let listener: ((request: ConfirmRequest) => void) | null = null;

export function subscribeConfirm(next: ((request: ConfirmRequest) => void) | null) {
  listener = next;
}

/** Chiede conferma all'utente. Risolve true se conferma, false se annulla. */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!listener) {
      // Host non ancora montato: ripiego sul controllo del browser.
      resolve(typeof window !== 'undefined' ? window.confirm(options.message) : false);
      return;
    }
    listener({ options, resolve });
  });
}
