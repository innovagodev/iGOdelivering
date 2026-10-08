'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';

// Lenis smooth scroll is active ONLY on public/landing pages.
// Admin and ristoratore panels use native overflow-y-auto scroll on <main>.
const LENIS_DISABLED_PREFIXES = ['/admin', '/ristoratore', '/login'];

// Un'unica istanza di Lenis per tutta l'app: le pagine che devono fermare o
// far scorrere la pagina (modali, ancoraggi) la leggono da qui invece di
// crearne una propria, che si contenderebbe lo scroll con questa.
const LenisContext = createContext<React.MutableRefObject<Lenis | null> | null>(null);

export function useLenisRef() {
  const ref = useContext(LenisContext);
  if (!ref) throw new Error('useLenisRef va usato dentro LenisProvider');
  return ref;
}

export default function LenisProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  const isDisabled = LENIS_DISABLED_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  useEffect(() => {
    if (isDisabled) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });
    lenisRef.current = lenis;

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenisRef.current = null;
      lenis.destroy();
    };
  }, [isDisabled]);

  return <LenisContext.Provider value={lenisRef}>{children}</LenisContext.Provider>;
}
