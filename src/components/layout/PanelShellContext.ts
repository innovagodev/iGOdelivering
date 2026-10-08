'use client';
import { createContext, useContext } from 'react';

/**
 * Elementi della topbar condivisa in cui le pagine "proiettano" il proprio
 * titolo e le proprie azioni (vedi Topbar). Se il valore è null la pagina non
 * sta dentro PanelShell e Sidebar/Topbar si disegnano da soli, come prima.
 */
export interface PanelShellValue {
  leftEl: HTMLElement | null;
  rightEl: HTMLElement | null;
}

export const PanelShellContext = createContext<PanelShellValue | null>(null);

export const usePanelShell = () => useContext(PanelShellContext);
