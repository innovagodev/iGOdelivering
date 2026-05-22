'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';

// Lenis smooth scroll is active ONLY on public/landing pages.
// Admin and ristoratore panels use native overflow-y-auto scroll on <main>.
const LENIS_DISABLED_PREFIXES = ['/admin', '/ristoratore', '/login'];

export default function LenisProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, [isDisabled]);

  return <>{children}</>;
}
