'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, Compass } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';

export default function NotFound() {
  const router = useRouter();

  const handleGoHome = () => {
    router?.push('/');
  };

  const handleGoBack = () => {
    if (typeof window !== 'undefined') {
      window.history?.back();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 font-sans relative overflow-hidden">
      {/* Background soft glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="text-center max-w-lg space-y-6 relative z-10">
        {/* Transparent logo in high contrast */}
        <div className="flex justify-center mb-2 animate-fade-in">
          <div style={{ filter: 'brightness(0)' }} className="opacity-90">
            <AppLogo size={140} />
          </div>
        </div>

        {/* Big 404 Illustration wrapper */}
        <div className="relative inline-block">
          <h1 className="text-8xl sm:text-9xl font-extrabold tracking-widest bg-gradient-to-b from-primary to-accent bg-clip-text text-transparent opacity-80 leading-none">
            404
          </h1>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Pagina non trovata
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            La pagina che stai cercando non esiste o è stata spostata. Non preoccuparti, ti
            riportiamo subito sulla strada giusta!
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            onClick={handleGoBack}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-white font-bold px-6 py-3 rounded-xl hover:bg-[#d43d22] transition-all duration-150 active:scale-95 shadow-md hover:shadow-lg text-sm"
          >
            <ArrowLeft size={16} />
            Torna Indietro
          </button>

          <button
            onClick={handleGoHome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-card hover:bg-muted text-foreground border border-border font-bold px-6 py-3 rounded-xl transition-all duration-150 active:scale-95 text-sm"
          >
            <Home size={16} />
            Vai alla Home
          </button>
        </div>
      </div>
    </div>
  );
}
