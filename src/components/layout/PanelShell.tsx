'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { PanelShellContext } from '@/components/layout/PanelShellContext';

/**
 * Guscio comune dei pannelli admin e ristoratore: sidebar e topbar vivono qui,
 * una volta sola, e restano montate quando si cambia pagina (niente lampo,
 * niente stato ricaricato). Le pagine renderizzano solo il proprio contenuto.
 */
export default function PanelShell({
  role,
  children,
}: {
  role: 'admin' | 'ristoratore';
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [leftEl, setLeftEl] = useState<HTMLElement | null>(null);
  const [rightEl, setRightEl] = useState<HTMLElement | null>(null);

  // Il drawer mobile si chiude da solo a ogni cambio pagina.
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const value = useMemo(() => ({ leftEl, rightEl }), [leftEl, rightEl]);

  return (
    <PanelShellContext.Provider value={value}>
      <div className="panel-shell flex h-dvh bg-background overflow-hidden relative">
        <Sidebar
          role={role}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <Topbar
            role={role}
            leftSlotRef={setLeftEl}
            rightSlotRef={setRightEl}
            onMobileMenuOpen={() => setIsMobileOpen(true)}
          />
          {children}
        </div>
      </div>
    </PanelShellContext.Provider>
  );
}
