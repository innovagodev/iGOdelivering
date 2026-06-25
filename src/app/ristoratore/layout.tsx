import React from 'react';
import { AudioNotificationProvider } from '@/components/ristoratore/AudioNotificationProvider';

export default function RistoratoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <AudioNotificationProvider>
      {children}
    </AudioNotificationProvider>
  );
}
