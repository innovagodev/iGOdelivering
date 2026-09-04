import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import '../styles/globals.css';
import { AuthProvider } from '@/context/AuthContext';
import LenisProvider from '@/components/layout/LenisProvider';
import MaintenanceWrapper from '@/components/layout/MaintenanceWrapper';

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
  metadataBase: new URL('https://app.igodelivering.it'),
  title: 'iGOdelivering — Ordini Online per Ristoranti',
  description:
    'iGOdelivering aiuta i ristoranti italiani a gestire ordini online, menu e consegne da un unico pannello professionale.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/png' }],
  },
  openGraph: {
    title: 'iGOdelivering — Ordini Online per Ristoranti',
    description:
      'Piattaforma di ordini online e menù digitale per ristoranti. Gestisci asporto, consegne e ordini al tavolo da un unico pannello.',
    url: 'https://app.igodelivering.it',
    siteName: 'iGOdelivering',
    images: [
      {
        url: '/assets/images/igo-button-ok.png',
        width: 1200,
        height: 630,
        alt: 'iGOdelivering Logo',
      },
    ],
    locale: 'it_IT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'iGOdelivering — Ordini Online per Ristoranti',
    description:
      'Piattaforma di ordini online e menù digitale per ristoranti. Gestisci asporto, consegne e ordini al tavolo da un unico pannello.',
    images: ['/assets/images/igo-button-ok.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={plusJakartaSans.variable} suppressHydrationWarning>
      <body className={plusJakartaSans.className} suppressHydrationWarning>
        <AuthProvider>
          <MaintenanceWrapper>
            <LenisProvider>{children}</LenisProvider>
          </MaintenanceWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
