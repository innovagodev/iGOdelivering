'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import PanelShell from '@/components/layout/PanelShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // /admin è la schermata di accesso: senza sidebar né topbar.
  if (pathname === '/admin' || pathname === '/admin/') return <>{children}</>;
  return <PanelShell role="admin">{children}</PanelShell>;
}
