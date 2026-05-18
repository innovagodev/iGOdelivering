'use client';
import React, { Suspense } from 'react';
import OrderTrackingContent from './OrderTrackingContent';

export default function OrderTrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Caricamento tracking...</span>
        </div>
      }
    >
      <OrderTrackingContent />
    </Suspense>
  );
}
