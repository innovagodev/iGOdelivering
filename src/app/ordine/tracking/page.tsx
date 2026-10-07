'use client';
import React, { Suspense } from 'react';
import { LanguageProvider, useLang } from '@/context/LanguageContext';
import OrderTrackingContent from './OrderTrackingContent';

function LoadingText() {
  const { t } = useLang();
  return <span className="text-muted-foreground text-sm">{t('ord_loading')}</span>;
}

export default function OrderTrackingPage() {
  return (
    <LanguageProvider>
      <Suspense
        fallback={
          <div className="min-h-screen bg-background flex items-center justify-center">
            <LoadingText />
          </div>
        }
      >
        <OrderTrackingContent />
      </Suspense>
    </LanguageProvider>
  );
}
