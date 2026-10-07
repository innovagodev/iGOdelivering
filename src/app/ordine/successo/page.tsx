'use client';
import React, { Suspense } from 'react';
import { LanguageProvider, useLang } from '@/context/LanguageContext';
import OrderSuccessContent from './OrderSuccessContent';

function LoadingText() {
  const { t } = useLang();
  return <span className="text-muted-foreground text-sm">{t('ord_loading')}</span>;
}

export default function OrderSuccessPage() {
  return (
    <LanguageProvider>
      <Suspense
        fallback={
          <div className="min-h-screen bg-background flex items-center justify-center">
            <LoadingText />
          </div>
        }
      >
        <OrderSuccessContent />
      </Suspense>
    </LanguageProvider>
  );
}
