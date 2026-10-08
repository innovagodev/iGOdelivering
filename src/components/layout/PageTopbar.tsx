'use client';
import React from 'react';
import { createPortal } from 'react-dom';
import { usePanelShell } from '@/components/layout/PanelShellContext';

interface PageTopbarProps {
  /** Titolo o percorso mostrato a sinistra nella topbar condivisa. */
  left?: React.ReactNode;
  /** Azioni della pagina, a destra accanto al profilo. */
  right?: React.ReactNode;
}

/**
 * Ogni pagina dei pannelli dichiara qui il proprio titolo e le proprie azioni:
 * il contenuto viene proiettato nella topbar di PanelShell, che resta montata
 * quando si cambia pagina. Non disegna nulla nel punto in cui è inserito.
 */
export default function PageTopbar({ left, right }: PageTopbarProps) {
  const shell = usePanelShell();
  if (!shell) return null;
  return (
    <>
      {shell.leftEl && left ? createPortal(left, shell.leftEl) : null}
      {shell.rightEl && right ? createPortal(right, shell.rightEl) : null}
    </>
  );
}
