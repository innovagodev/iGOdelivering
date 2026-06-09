'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ServiceHoursTab from '@/components/ristoratore/menu-management/ServiceHoursTab';
import { useAuth } from '@/context/AuthContext';
import { Zap, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ScheduledOrdersConfig } from '@/types';
import { STORAGE_KEYS } from '@/lib/storage-keys';

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

  const [useGeneral, setUseGeneral] = useState<{
    pickup: boolean;
    delivery: boolean;
    reservation: boolean;
  }>({
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

  const [scheduledOrders, setScheduledOrders] = useState<ScheduledOrdersConfig>({
    enabled: true,
    pickup: { minNoticeValue: 30, minNoticeUnit: 'minuti', maxNoticeDays: 4 },
    delivery: { minNoticeValue: 1, minNoticeUnit: 'ore', maxNoticeDays: 4, timeWindowMinutes: 15 },
    onPremise: { minNoticeValue: 30, minNoticeUnit: 'minuti', maxNoticeDays: 1 },
    hideAsap: false,
    pickupExpanded: true,
    deliveryExpanded: true,
    onPremiseExpanded: true,
    altroExpanded: true,
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

  // Hydrate state from Supabase on mount/restaurantId change
  useEffect(() => {
    const mergeWithDefaultDays = (existing: any): Record<string, DayServiceHours> => {
      const defaults = buildDefaultDays();
      if (!existing || typeof existing !== 'object') return defaults;

      const merged: Record<string, DayServiceHours> = {};
      DAYS.forEach((d) => {
        const defaultDay = defaults[d];
        const existingDay = existing[d] || {};

        merged[d] = {
          enabled: existingDay.enabled !== undefined ? existingDay.enabled : defaultDay.enabled,
          suspended:
            existingDay.suspended !== undefined ? existingDay.suspended : defaultDay.suspended,
          lunch: {
            from: existingDay.lunch?.from || defaultDay.lunch.from,
            to: existingDay.lunch?.to || defaultDay.lunch.to,
          },
          dinner: {
            from: existingDay.dinner?.from || defaultDay.dinner.from,
            to: existingDay.dinner?.to || defaultDay.dinner.to,
          },
          lunchEnabled:
            existingDay.lunchEnabled !== undefined
              ? existingDay.lunchEnabled
              : defaultDay.lunchEnabled,
          dinnerEnabled:
            existingDay.dinnerEnabled !== undefined
              ? existingDay.dinnerEnabled
              : defaultDay.dinnerEnabled,
        };
      });
      return merged;
    };

    async function loadHours() {
      if (!restaurantId || restaurantId === 'r-001') return;
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('hours_config, scheduled_orders')
          .eq('id', restaurantId)
          .single();

        if (error) {
          console.warn('Error loading service hours from Supabase:', error.message || error);
          return;
        }

        if (data) {
          if (data.hours_config && typeof data.hours_config === 'object') {
            const parsed = data.hours_config as any;
            if (parsed.serviceHours) {
              setServiceHours({
                general: mergeWithDefaultDays(parsed.serviceHours.general),
                pickup: mergeWithDefaultDays(parsed.serviceHours.pickup),
                delivery: mergeWithDefaultDays(parsed.serviceHours.delivery),
                reservation: mergeWithDefaultDays(parsed.serviceHours.reservation),
              });
            }
            if (parsed.useGeneral) {
              setUseGeneral(parsed.useGeneral);
            } else {
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
          if (data.scheduled_orders) {
            setScheduledOrders(data.scheduled_orders as any);
          }
        }
      } catch (e: any) {
        console.warn('Error loading service hours from Supabase:', e.message || e);
      }
    }

    loadHours();
  }, [restaurantId]);

  const toggleServiceSuspension = (s: 'pickup' | 'delivery' | 'reservation') => {
    setServiceSuspended((p) => {
      const n = { ...p, [s]: !p[s] };
      showFeedback(
        `Servizio ${s === 'pickup' ? 'Asporto' : s === 'delivery' ? 'Consegna' : 'Prenotazione'} ${n[s] ? 'sospeso' : 'riattivato'}`
      );
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

  const handleSaveHours = async () => {
    const dataToSave = {
      serviceHours,
      useGeneral,
      serviceSuspended,
      temporaryClosure,
    };

    // Dispatch custom update events for realtime UI sync
    try {
      window.dispatchEvent(new CustomEvent('iGO_service_hours_updated', { detail: dataToSave }));
      window.dispatchEvent(
        new CustomEvent(`iGO_service_hours_${restaurantId}_updated`, { detail: dataToSave })
      );
    } catch (evtErr) {
      // ignore
    }

    // Sync to Supabase
    if (restaurantId && restaurantId !== 'r-001') {
      try {
        // Update hours_config and scheduled_orders in restaurants table
        const { error: configError } = await supabase
          .from('restaurants')
          .update({
            hours_config: dataToSave,
            scheduled_orders: scheduledOrders,
          })
          .eq('id', restaurantId);

        if (configError) {
          console.warn(
            'Failed to update Supabase hours_config:',
            configError.message || configError
          );
        }

        // Synchronize restaurant_hours table
        const dayMapping: Record<string, number> = {
          Lunedì: 0,
          Martedì: 1,
          Mercoledì: 2,
          Giovedì: 3,
          Venerdì: 4,
          Sabato: 5,
          Domenica: 6,
        };

        const hoursToUpsert = DAYS.map((dayName) => {
          const dayIdx = dayMapping[dayName];
          const dayData = serviceHours.general[dayName] || {
            enabled: true,
            lunch: { from: '11:30', to: '14:30' },
            dinner: { from: '19:00', to: '22:30' },
          };
          return {
            restaurant_id: restaurantId,
            day_of_week: dayIdx,
            is_open: !!dayData.enabled,
            lunch_from: dayData.lunch?.from ? `${dayData.lunch.from}:00` : null,
            lunch_to: dayData.lunch?.to ? `${dayData.lunch.to}:00` : null,
            lunch_enabled: dayData.lunchEnabled !== false,
            dinner_from: dayData.dinner?.from ? `${dayData.dinner.from}:00` : null,
            dinner_to: dayData.dinner?.to ? `${dayData.dinner.to}:00` : null,
            dinner_enabled: dayData.dinnerEnabled !== false,
          };
        });

        const { error: hoursError } = await supabase
          .from('restaurant_hours')
          .upsert(hoursToUpsert, { onConflict: 'restaurant_id,day_of_week' });

        if (hoursError) {
          console.warn(
            'Failed to update Supabase restaurant_hours table:',
            hoursError.message || hoursError
          );
        }
      } catch (dbErr: any) {
        console.warn('Database connection error during hours sync:', dbErr.message || dbErr);
      }
    }

    setSaved(true);
    showFeedback('Orari salvati con successo');
    setTimeout(() => setSaved(false), 2500);
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
              scheduledOrders={scheduledOrders}
              setScheduledOrders={setScheduledOrders}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
