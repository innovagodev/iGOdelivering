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
  const [immersive, setImmersive] = useState(false);

  // Il drawer mobile si chiude da solo a ogni cambio pagina.
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const value = useMemo(() => ({ leftEl, rightEl, setImmersive }), [leftEl, rightEl]);

  return (
    <PanelShellContext.Provider value={value}>
      <div className="panel-shell flex h-dvh bg-background overflow-hidden relative">
        {/* Schermo pieno: nascosti ma montati, così non perdono stato né la proiezione del titolo. */}
        <div className={immersive ? 'hidden' : 'contents'}>
          <Sidebar
            role={role}
            isMobileOpen={isMobileOpen}
            onCloseMobile={() => setIsMobileOpen(false)}
          />
        </div>
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className={immersive ? 'hidden' : 'contents'}>
            <Topbar
              role={role}
              leftSlotRef={setLeftEl}
              rightSlotRef={setRightEl}
              onMobileMenuOpen={() => setIsMobileOpen(true)}
            />
          </div>
          {children}
        </div>
      </div>
    </PanelShellContext.Provider>
  );
}
