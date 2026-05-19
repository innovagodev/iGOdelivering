import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import '../styles/globals.css';
import { AuthProvider } from '@/context/AuthContext';
import LenisProvider from '@/components/layout/LenisProvider';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'iGOdelivering — Ordini Online per Ristoranti',
  description:
    'iGOdelivering aiuta i ristoranti italiani a gestire ordini online, menu e consegne da un unico pannello professionale.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={plusJakartaSans.variable} suppressHydrationWarning>
      <body className={plusJakartaSans.className} suppressHydrationWarning>
        <AuthProvider>
          <LenisProvider>{children}</LenisProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
