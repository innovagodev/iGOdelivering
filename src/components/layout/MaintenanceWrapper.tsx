'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Wrench, Mail, Phone, Lock } from 'lucide-react';
import Link from 'next/link';

export default function MaintenanceWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkMaintenance() {
      try {
        const { data, error } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'maintenance_mode')
          .maybeSingle();

        if (data && data.value) {
          setMaintenanceMode(!!data.value.active);
        }
      } catch (e) {
        console.error('Error fetching maintenance mode:', e);
      } finally {
        setLoading(false);
      }
    }

    checkMaintenance();

    // Listen to changes in real-time
    const channel = supabase
      .channel('platform_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'platform_settings',
          filter: 'key=eq.maintenance_mode',
        },
        (payload: any) => {
          if (payload.new && payload.new.value) {
            setMaintenanceMode(!!payload.new.value.active);
          } else {
            setMaintenanceMode(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Exclude admin routes, API, login, and static files
  const isAdminRoute =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/api') ||
    pathname === '/login' ||
    pathname === '/reset-password';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const showMaintenance = maintenanceMode && !isAdminRoute && user?.role !== 'admin';

  if (showMaintenance) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-between p-6 relative overflow-hidden select-none font-sans text-zinc-100">
        {/* Ambient background glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-amber-500/5 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] aspect-square rounded-full bg-primary/5 blur-[150px] pointer-events-none" />

        {/* Header */}
        <header className="max-w-screen-xl mx-auto w-full py-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
              iGOdelivering
            </span>
          </div>
          <Link
            href="/admin"
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5 transition-colors"
          >
            <Lock size={12} />
            Area Riservata
          </Link>
        </header>

        {/* Content */}
        <main className="max-w-md mx-auto w-full my-auto text-center space-y-6 z-10 py-12">
          <div className="inline-flex p-4 bg-amber-500/10 border border-amber-500/20 rounded-3xl text-amber-500 animate-pulse">
            <Wrench size={36} />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">
              Lavori in Corso
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              La piattaforma è momentaneamente offline per interventi di manutenzione ordinaria. Saremo di ritorno il prima possibile. Grazie per la pazienza!
            </p>
          </div>

          {/* Support contacts */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
              Hai bisogno di assistenza urgente?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs">
              <a
                href="mailto:info@innovago.it"
                className="flex items-center gap-1.5 text-zinc-300 hover:text-primary transition-colors"
              >
                <Mail size={14} className="text-zinc-500" />
                info@innovago.it
              </a>
              <span className="hidden sm:inline text-zinc-700">•</span>
              <a
                href="tel:+390282956598"
                className="flex items-center gap-1.5 text-zinc-300 hover:text-primary transition-colors"
              >
                <Phone size={14} className="text-zinc-500" />
                +39 02 8295 6598
              </a>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="max-w-screen-xl mx-auto w-full text-center py-4 text-xs text-zinc-600 z-10">
          <p>© {new Date().getFullYear()} Innovago. Tutti i diritti riservati.</p>
        </footer>
      </div>
    );
  }

  return <>{children}</>;
}
