'use client';
import React, { Suspense } from 'react';
import OrderSuccessContent from './OrderSuccessContent';

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><span className="text-muted-foreground text-sm">Caricamento...</span></div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
