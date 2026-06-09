'use client';
import React from 'react';
import { Settings, Save, AlertTriangle, Check, PauseCircle, PlayCircle, Clock, Calendar } from 'lucide-react';
import Toggle from '@/components/ui/Toggle';
import ScheduledOrdersStep from '@/components/admin/restaurant-wizard/ScheduledOrdersStep';
import { TIME_UNITS, TIME_WINDOWS } from '@/lib/constants';

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

interface ServiceHoursTabProps {
  serviceHours: ServiceHoursState;
  serviceSuspended: { pickup: boolean; delivery: boolean; reservation: boolean };
  toggleServiceSuspension: (svc: 'pickup' | 'delivery' | 'reservation') => void;
  toggleServiceDay: (svc: 'general' | 'pickup' | 'delivery' | 'reservation', day: string) => void;
  toggleServiceSlot?: (
    svc: 'general' | 'pickup' | 'delivery' | 'reservation',
    day: string,
    service: 'lunch' | 'dinner'
  ) => void;
  updateServiceHour: (
    svc: 'general' | 'pickup' | 'delivery' | 'reservation',
    day: string,
    service: 'lunch' | 'dinner',
    field: 'from' | 'to',
    value: string
  ) => void;
  handleSaveHours: () => void;
  saved: boolean;
  days: string[];
  useGeneral: { pickup: boolean; delivery: boolean; reservation: boolean };
  toggleUseGeneral: (svc: 'pickup' | 'delivery' | 'reservation') => void;
  temporaryClosure?: {
    enabled: boolean;
    from: string;
    to: string;
    message: string;
  };
  setTemporaryClosure?: React.Dispatch<React.SetStateAction<{
    enabled: boolean;
    from: string;
    to: string;
    message: string;
  }>>;
  scheduledOrders?: any;
  setScheduledOrders?: any;
}

export default function ServiceHoursTab({
  serviceHours,
  serviceSuspended,
  toggleServiceSuspension,
  toggleServiceDay,
  toggleServiceSlot,
  updateServiceHour,
  handleSaveHours,
  saved,
  days,
  useGeneral,
  toggleUseGeneral,
  temporaryClosure,
  setTemporaryClosure,
  scheduledOrders,
  setScheduledOrders,
}: ServiceHoursTabProps) {

  const renderTemporaryClosureSection = () => {
    if (!temporaryClosure || !setTemporaryClosure) return null;

    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Chiusura Temporanea / Ferie</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Imposta un periodo in cui il locale sarà chiuso (es. per ferie) e mostra un messaggio ai clienti
              </p>
            </div>
          </div>
          <Toggle
            checked={temporaryClosure.enabled}
            onChange={() =>
              setTemporaryClosure((prev) => ({ ...prev, enabled: !prev.enabled }))
            }
            size="sm"
          />
        </div>
        <div className="p-5 space-y-4">
          {temporaryClosure.enabled ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-foreground">Dal giorno</label>
                <input
                  type="date"
                  value={temporaryClosure.from}
                  onChange={(e) =>
                    setTemporaryClosure((prev) => ({ ...prev, from: e.target.value }))
                  }
                  className="px-3 py-2 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm text-foreground"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-foreground">Al giorno (incluso)</label>
                <input
                  type="date"
                  value={temporaryClosure.to}
                  onChange={(e) =>
                    setTemporaryClosure((prev) => ({ ...prev, to: e.target.value }))
                  }
                  className="px-3 py-2 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm text-foreground"
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold text-foreground">Messaggio nel banner rosso</label>
                <textarea
                  rows={2}
                  value={temporaryClosure.message}
                  onChange={(e) =>
                    setTemporaryClosure((prev) => ({ ...prev, message: e.target.value }))
                  }
                  placeholder="Es. Chiusi per ferie estive. Riapriremo regolarmente il 25 Agosto!"
                  className="px-3 py-2 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm text-foreground resize-none"
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Nessuna chiusura temporanea attiva. Abilita il servizio per impostare le date e il messaggio per i clienti.
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderGeneralSection = () => {
    const svc = 'general';
    const activeHoursSource = serviceHours.general;

    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Orari di Apertura</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Definisci gli orari di apertura generali del tuo locale (pranzo e cena)
              </p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="space-y-4">
            {days.map((day) => (
              <div
                key={day}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-4 border-b border-border/50 last:border-0"
              >
                {/* Day & toggle header */}
                <div className="flex items-center justify-between lg:justify-start gap-3 flex-shrink-0 w-full lg:w-40">
                  <div className="flex items-center gap-3">
                    <Toggle
                      checked={activeHoursSource[day].enabled}
                      onChange={() => toggleServiceDay(svc, day)}
                      size="sm"
                    />
                    <span
                      className={`text-sm font-bold ${activeHoursSource[day].enabled ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      {day}
                    </span>
                  </div>
                  {!activeHoursSource[day].enabled && (
                    <span className="lg:hidden text-xs font-bold text-muted-foreground italic bg-muted px-2.5 py-1 rounded-lg border border-border">
                      Chiuso
                    </span>
                  )}
                </div>

                {activeHoursSource[day].enabled ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
                    {/* Lunch slot */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-muted/10 lg:bg-transparent p-3 lg:p-0 rounded-xl lg:rounded-none border border-border/30 lg:border-0">
                      <div className="flex items-center gap-2 flex-shrink-0 w-24">
                        <input
                          type="checkbox"
                          checked={activeHoursSource[day].lunchEnabled !== false}
                          onChange={() => toggleServiceSlot?.(svc, day, 'lunch')}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                        />
                        <span className="text-xs font-bold text-foreground">Pranzo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          disabled={activeHoursSource[day].lunchEnabled === false}
                          value={activeHoursSource[day].lunch.from}
                          onChange={(e) => updateServiceHour(svc, day, 'lunch', 'from', e.target.value)}
                          className={`px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0 w-[108px] appearance-none tabular-nums ${activeHoursSource[day].lunchEnabled === false ? 'opacity-40 cursor-not-allowed bg-muted' : ''
                            }`}
                        />
                        <span className="text-xs text-muted-foreground">–</span>
                        <input
                          type="time"
                          disabled={activeHoursSource[day].lunchEnabled === false}
                          value={activeHoursSource[day].lunch.to}
                          onChange={(e) => updateServiceHour(svc, day, 'lunch', 'to', e.target.value)}
                          className={`px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0 w-[108px] appearance-none tabular-nums ${activeHoursSource[day].lunchEnabled === false ? 'opacity-40 cursor-not-allowed bg-muted' : ''
                            }`}
                        />
                        {activeHoursSource[day].lunchEnabled === false && (
                          <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200 whitespace-nowrap">
                            Disattivato
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dinner slot */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-muted/10 lg:bg-transparent p-3 lg:p-0 rounded-xl lg:rounded-none border border-border/30 lg:border-0">
                      <div className="flex items-center gap-2 flex-shrink-0 w-24">
                        <input
                          type="checkbox"
                          checked={activeHoursSource[day].dinnerEnabled !== false}
                          onChange={() => toggleServiceSlot?.(svc, day, 'dinner')}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                        />
                        <span className="text-xs font-bold text-foreground">Cena</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          disabled={activeHoursSource[day].dinnerEnabled === false}
                          value={activeHoursSource[day].dinner.from}
                          onChange={(e) => updateServiceHour(svc, day, 'dinner', 'from', e.target.value)}
                          className={`px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0 w-[108px] appearance-none tabular-nums ${activeHoursSource[day].dinnerEnabled === false ? 'opacity-40 cursor-not-allowed bg-muted' : ''
                            }`}
                        />
                        <span className="text-xs text-muted-foreground">–</span>
                        <input
                          type="time"
                          disabled={activeHoursSource[day].dinnerEnabled === false}
                          value={activeHoursSource[day].dinner.to}
                          onChange={(e) => updateServiceHour(svc, day, 'dinner', 'to', e.target.value)}
                          className={`px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0 w-[108px] appearance-none tabular-nums ${activeHoursSource[day].dinnerEnabled === false ? 'opacity-40 cursor-not-allowed bg-muted' : ''
                            }`}
                        />
                        {activeHoursSource[day].dinnerEnabled === false && (
                          <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200 whitespace-nowrap">
                            Disattivato
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="hidden lg:inline-block text-xs text-muted-foreground italic bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
                    Chiuso
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderServiceSection = (
    svc: 'pickup' | 'delivery' | 'reservation',
    label: string,
    icon: React.ReactNode
  ) => {
    const isInherited = useGeneral[svc];
    const isSuspended = serviceSuspended[svc];
    const activeHoursSource = isInherited ? serviceHours.general : serviceHours[svc];

    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              {icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">{label}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isSuspended ? 'Servizio temporaneamente sospeso' : 'Servizio attivo'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Segmented Control for Hours Option */}
            <div className="flex bg-muted dark:bg-zinc-800 p-1 rounded-xl border border-border/50">
              <button
                type="button"
                onClick={() => !isInherited && toggleUseGeneral(svc)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isInherited
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Apertura
              </button>
              <button
                type="button"
                onClick={() => isInherited && toggleUseGeneral(svc)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!isInherited
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Personalizza
              </button>
            </div>

            <button
              type="button"
              onClick={() => toggleServiceSuspension(svc)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${isSuspended
                ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-950/20 dark:text-red-400'
                : 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-950/20 dark:text-amber-400'
                }`}
            >
              {isSuspended ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
              {isSuspended ? 'Riattiva' : 'Sospendi'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {isSuspended && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-900/30 rounded-xl flex items-center gap-3">
              <AlertTriangle size={18} className="text-red-500" />
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Il servizio è temporaneamente sospeso. I clienti non potranno effettuare ordini o prenotazioni di tipo {label.toLowerCase()}.
              </p>
            </div>
          )}

          {isInherited ? (
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  Questo servizio è attivo negli stessi orari di apertura del locale. Seleziona &quot;Personalizza&quot; se desideri impostare orari diversi per questo servizio.
                </p>

                {/* Visual grid of open days */}
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {days.map((day) => {
                    const dayData = serviceHours.general[day];
                    if (!dayData.enabled) return null;
                    const lunch = dayData.lunchEnabled !== false ? `${dayData.lunch.from}-${dayData.lunch.to}` : '';
                    const dinner = dayData.dinnerEnabled !== false ? `${dayData.dinner.from}-${dayData.dinner.to}` : '';
                    return (
                      <div key={day} className="bg-card border border-border px-3.5 py-2.5 rounded-xl flex flex-col gap-0.5 shadow-sm">
                        <span className="font-bold text-xs text-muted-foreground">{day}</span>
                        <span className="text-xs font-semibold text-foreground">
                          {[lunch, dinner].filter(Boolean).join(', ') || 'Chiuso'}
                        </span>
                      </div>
                    );
                  })}
                  {days.every(d => !serviceHours.general[d].enabled) && (
                    <span className="text-xs text-red-500 font-semibold">Attenzione: Il locale risulta chiuso tutti i giorni negli orari generali.</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {days.map((day) => (
                <div
                  key={day}
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-4 border-b border-border/50 last:border-0"
                >
                  {/* Day & toggle header */}
                  <div className="flex items-center justify-between lg:justify-start gap-3 flex-shrink-0 w-full lg:w-40">
                    <div className="flex items-center gap-3">
                      <Toggle
                        checked={activeHoursSource[day].enabled}
                        onChange={() => toggleServiceDay(svc, day)}
                        size="sm"
                      />
                      <span
                        className={`text-sm font-bold ${activeHoursSource[day].enabled ? 'text-foreground' : 'text-muted-foreground'}`}
                      >
                        {day}
                      </span>
                    </div>
                    {!activeHoursSource[day].enabled && (
                      <span className="lg:hidden text-xs font-bold text-muted-foreground italic bg-muted px-2.5 py-1 rounded-lg border border-border">
                        Chiuso
                      </span>
                    )}
                  </div>

                  {activeHoursSource[day].enabled ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
                      {/* Lunch slot */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-muted/10 lg:bg-transparent p-3 lg:p-0 rounded-xl lg:rounded-none border border-border/30 lg:border-0">
                        <div className="flex items-center gap-2 flex-shrink-0 w-24">
                          <input
                            type="checkbox"
                            checked={activeHoursSource[day].lunchEnabled !== false}
                            onChange={() => toggleServiceSlot?.(svc, day, 'lunch')}
                            className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                          />
                          <span className="text-xs font-bold text-foreground">Pranzo</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            disabled={activeHoursSource[day].lunchEnabled === false}
                            value={activeHoursSource[day].lunch.from}
                            onChange={(e) => updateServiceHour(svc, day, 'lunch', 'from', e.target.value)}
                            className={`px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0 w-[108px] appearance-none tabular-nums ${activeHoursSource[day].lunchEnabled === false ? 'opacity-40 cursor-not-allowed bg-muted' : ''
                              }`}
                          />
                          <span className="text-xs text-muted-foreground">–</span>
                          <input
                            type="time"
                            disabled={activeHoursSource[day].lunchEnabled === false}
                            value={activeHoursSource[day].lunch.to}
                            onChange={(e) => updateServiceHour(svc, day, 'lunch', 'to', e.target.value)}
                            className={`px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0 w-[108px] appearance-none tabular-nums ${activeHoursSource[day].lunchEnabled === false ? 'opacity-40 cursor-not-allowed bg-muted' : ''
                              }`}
                          />
                          {activeHoursSource[day].lunchEnabled === false && (
                            <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200 whitespace-nowrap">
                              Disattivato
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Dinner slot */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-muted/10 lg:bg-transparent p-3 lg:p-0 rounded-xl lg:rounded-none border border-border/30 lg:border-0">
                        <div className="flex items-center gap-2 flex-shrink-0 w-24">
                          <input
                            type="checkbox"
                            checked={activeHoursSource[day].dinnerEnabled !== false}
                            onChange={() => toggleServiceSlot?.(svc, day, 'dinner')}
                            className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                          />
                          <span className="text-xs font-bold text-foreground">Cena</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            disabled={activeHoursSource[day].dinnerEnabled === false}
                            value={activeHoursSource[day].dinner.from}
                            onChange={(e) => updateServiceHour(svc, day, 'dinner', 'from', e.target.value)}
                            className={`px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0 w-[108px] appearance-none tabular-nums ${activeHoursSource[day].dinnerEnabled === false ? 'opacity-40 cursor-not-allowed bg-muted' : ''
                              }`}
                          />
                          <span className="text-xs text-muted-foreground">–</span>
                          <input
                            type="time"
                            disabled={activeHoursSource[day].dinnerEnabled === false}
                            value={activeHoursSource[day].dinner.to}
                            onChange={(e) => updateServiceHour(svc, day, 'dinner', 'to', e.target.value)}
                            className={`px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0 w-[108px] appearance-none tabular-nums ${activeHoursSource[day].dinnerEnabled === false ? 'opacity-40 cursor-not-allowed bg-muted' : ''
                              }`}
                          />
                          {activeHoursSource[day].dinnerEnabled === false && (
                            <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200 whitespace-nowrap">
                              Disattivato
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="hidden lg:inline-block text-xs text-muted-foreground italic bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
                      Chiuso
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Configurazione Orari & Servizi</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gestisci la disponibilità dei servizi e gli orari di apertura del locale
          </p>
        </div>
        <button
          onClick={handleSaveHours}
          className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all w-full sm:w-auto ${saved ? 'bg-[var(--success)] text-white shadow-green-200' : 'bg-primary text-white shadow-primary/20 hover:bg-primary-hover'}`}
        >
          {saved ? <Check size={18} /> : <Save size={18} />}
          {saved ? 'Salvato' : 'Salva Orari'}
        </button>
      </div>

      <div className="space-y-6">
        {renderGeneralSection()}
        {renderTemporaryClosureSection()}
        {renderServiceSection('pickup', 'Asporto / Ritiro', <Clock size={20} />)}
        {renderServiceSection('delivery', 'Consegna a Domicilio', <Settings size={20} />)}
        {renderServiceSection('reservation', 'Prenotazione Tavoli', <Settings size={20} />)}
        
        {scheduledOrders && setScheduledOrders && (
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <ScheduledOrdersStep
              scheduledOrders={scheduledOrders}
              setScheduledOrders={setScheduledOrders}
              timeUnits={TIME_UNITS}
              timeWindows={TIME_WINDOWS}
            />
          </div>
        )}
      </div>
    </div>
  );
}
