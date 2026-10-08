import React from 'react';
import { AudioNotificationProvider } from '@/components/ristoratore/AudioNotificationProvider';
import PanelShell from '@/components/layout/PanelShell';

export default function RistoratoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <AudioNotificationProvider>
      <PanelShell role="ristoratore">{children}</PanelShell>
    </AudioNotificationProvider>
  );
}
