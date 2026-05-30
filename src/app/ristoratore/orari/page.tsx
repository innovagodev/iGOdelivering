'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ServiceHoursTab from '@/components/ristoratore/menu-management/ServiceHoursTab';
import { useAuth } from '@/context/AuthContext';
import { Zap, Store } from 'lucide-react';

const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

interface DayServiceHours {
  enabled: boolean;
  suspended: boolean;
  lunch: { from: string; to: string };
  dinner: { from: string; to: string };
  lunchEnabled?: boolean;
  dinnerEnabled?: boolean;
}

interface ServiceHoursState {
  general: Record<string, DayServiceHours>;
  pickup: Record<string, DayServiceHours>;
  delivery: Record<string, DayServiceHours>;
  reservation: Record<string, DayServiceHours>;
}

interface ServiceSuspendedState {
  pickup: boolean;
  delivery: boolean;
  reservation: boolean;
}

export default function RistoratoreOrariPage() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || 'r-001';

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const buildDefaultDays = (): Record<string, DayServiceHours> => {
    const h: Record<string, DayServiceHours> = {};
    DAYS.forEach(
      (d) =>
        (h[d] = {
          enabled: true,
          suspended: false,
          lunch: { from: '11:30', to: '14:30' },
          dinner: { from: '19:00', to: '22:30' },
          lunchEnabled: true,
          dinnerEnabled: true,
        })
    );
    h['Domenica'].enabled = false;
    return h;
  };

  const [serviceHours, setServiceHours] = useState<ServiceHoursState>(() => ({
    general: buildDefaultDays(),
    pickup: buildDefaultDays(),
    delivery: buildDefaultDays(),
    reservation: buildDefaultDays(),
  }));

  const [useGeneral, setUseGeneral] = useState<{ pickup: boolean; delivery: boolean; reservation: boolean }>({
    pickup: true,
    delivery: true,
    reservation: true,
  });

  const [serviceSuspended, setServiceSuspended] = useState<ServiceSuspendedState>({
    pickup: false,
    delivery: false,
    reservation: false,
  });

  const [temporaryClosure, setTemporaryClosure] = useState({
    enabled: false,
    from: '',
    to: '',
    message: '',
  });

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  useEffect(() => {
    // Restore sidebar state
    const stored = localStorage.getItem('iGO_sidebar_collapsed');
    if (stored !== null) {
      setSidebarCollapsed(JSON.parse(stored));
    }
  }, []);

  // Hydrate state from localStorage on mount/restaurantId change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedStr = localStorage.getItem(`iGO_service_hours_${restaurantId}`);
        if (storedStr) {
          const parsed = JSON.parse(storedStr);
          if (parsed.serviceHours) {
            setServiceHours({
              general: parsed.serviceHours.general || buildDefaultDays(),
              pickup: parsed.serviceHours.pickup || buildDefaultDays(),
              delivery: parsed.serviceHours.delivery || buildDefaultDays(),
              reservation: parsed.serviceHours.reservation || buildDefaultDays(),
            });
          }
          if (parsed.useGeneral) {
            setUseGeneral(parsed.useGeneral);
          } else {
            // Legacy default: if raw general doesn't exist, we default useCustom to true, meaning useGeneral to false
            const hasGen = !!parsed.serviceHours?.general;
            setUseGeneral({
              pickup: hasGen,
              delivery: hasGen,
              reservation: hasGen,
            });
          }
          if (parsed.serviceSuspended) {
            setServiceSuspended(parsed.serviceSuspended);
          }
          if (parsed.temporaryClosure) {
            setTemporaryClosure(parsed.temporaryClosure);
          }
        }
      } catch (e) {
        console.error('Error loading service hours:', e);
      }
    }
  }, [restaurantId]);

  const toggleServiceSuspension = (s: 'pickup' | 'delivery' | 'reservation') => {
    setServiceSuspended((p) => {
      const n = { ...p, [s]: !p[s] };
      showFeedback(`Servizio ${s === 'pickup' ? 'Asporto' : s === 'delivery' ? 'Consegna' : 'Prenotazione'} ${n[s] ? 'sospeso' : 'riattivato'}`);
      return n;
    });
  };

  const toggleServiceDay = (s: 'general' | 'pickup' | 'delivery' | 'reservation', d: string) => {
    setServiceHours((p) => ({
      ...p,
      [s]: {
        ...p[s],
        [d]: {
          ...p[s][d],
          enabled: !p[s][d].enabled,
        },
      },
    }));
  };

  const toggleServiceSlot = (
    s: 'general' | 'pickup' | 'delivery' | 'reservation',
    d: string,
    svc: 'lunch' | 'dinner'
  ) => {
    setServiceHours((p) => {
      const dayData = p[s][d];
      const key = svc === 'lunch' ? 'lunchEnabled' : 'dinnerEnabled';
      const currentVal = dayData[key] !== false;
      return {
        ...p,
        [s]: {
          ...p[s],
          [d]: {
            ...dayData,
            [key]: !currentVal,
          },
        },
      };
    });
  };

  const updateServiceHour = (
    s: 'general' | 'pickup' | 'delivery' | 'reservation',
    d: string,
    svc: 'lunch' | 'dinner',
    f: 'from' | 'to',
    v: string
  ) => {
    setServiceHours((p) => ({
      ...p,
      [s]: {
        ...p[s],
        [d]: {
          ...p[s][d],
          [svc]: {
            ...p[s][d][svc],
            [f]: v,
          },
        },
      },
    }));
  };

  const toggleUseGeneral = (s: 'pickup' | 'delivery' | 'reservation') => {
    setUseGeneral((p) => ({
      ...p,
      [s]: !p[s],
    }));
  };

  const handleSaveHours = () => {
    const dataToSave = {
      serviceHours,
      useGeneral,
      serviceSuspended,
      temporaryClosure,
    };
    try {
      localStorage.setItem(`iGO_service_hours_${restaurantId}`, JSON.stringify(dataToSave));
      
      // Dispatch custom update events
      window.dispatchEvent(new CustomEvent('iGO_service_hours_updated', { detail: dataToSave }));
      window.dispatchEvent(new CustomEvent(`iGO_service_hours_${restaurantId}_updated`, { detail: dataToSave }));

      setSaved(true);
      showFeedback('Orari salvati con successo');
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error('Error saving service hours:', e);
      showFeedback('Errore durante il salvataggio');
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeSection="nav-orari"
        onSectionChange={() => {}}
        role="ristoratore"
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Topbar
          role="ristoratore"
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMobileMenuOpen={() => setIsMobileOpen(true)}
          leftContent={
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <Store size={16} className="text-primary flex-shrink-0" />
              <span className="font-semibold text-foreground text-base truncate">
                {user?.restaurantName || 'Pizzeria Bella Napoli'}
              </span>
            </div>
          }
        />

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-screen-xl mx-auto px-6 lg:px-8 py-6 space-y-6">
            {feedback && (
              <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background text-sm font-semibold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2">
                <Zap size={14} />
                {feedback}
              </div>
            )}

            <ServiceHoursTab
              serviceHours={serviceHours}
              serviceSuspended={serviceSuspended}
              toggleServiceSuspension={toggleServiceSuspension}
              toggleServiceDay={toggleServiceDay}
              toggleServiceSlot={toggleServiceSlot}
              updateServiceHour={updateServiceHour}
              handleSaveHours={handleSaveHours}
              saved={saved}
              days={DAYS}
              useGeneral={useGeneral}
              toggleUseGeneral={toggleUseGeneral}
              temporaryClosure={temporaryClosure}
              setTemporaryClosure={setTemporaryClosure}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
