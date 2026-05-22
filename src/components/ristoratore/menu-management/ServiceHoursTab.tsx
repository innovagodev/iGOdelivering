'use client';
import React from 'react';
import { Settings, Save, AlertTriangle, Check, PauseCircle, PlayCircle, Clock } from 'lucide-react';
import Toggle from '@/components/ui/Toggle';

interface DayServiceHours {
  enabled: boolean;
  suspended: boolean;
  lunch: { from: string; to: string };
  dinner: { from: string; to: string };
  lunchEnabled?: boolean;
  dinnerEnabled?: boolean;
}

interface ServiceHoursState {
  pickup: Record<string, DayServiceHours>;
  delivery: Record<string, DayServiceHours>;
  reservation: Record<string, DayServiceHours>;
}

interface ServiceHoursTabProps {
  serviceHours: ServiceHoursState;
  serviceSuspended: { pickup: boolean; delivery: boolean; reservation: boolean };
  toggleServiceSuspension: (svc: 'pickup' | 'delivery' | 'reservation') => void;
  toggleServiceDay: (svc: 'pickup' | 'delivery' | 'reservation', day: string) => void;
  toggleServiceSlot?: (
    svc: 'pickup' | 'delivery' | 'reservation',
    day: string,
    service: 'lunch' | 'dinner'
  ) => void;
  updateServiceHour: (
    svc: 'pickup' | 'delivery' | 'reservation',
    day: string,
    service: 'lunch' | 'dinner',
    field: 'from' | 'to',
    value: string
  ) => void;
  handleSaveHours: () => void;
  saved: boolean;
  days: string[];
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
}: ServiceHoursTabProps) {
  const renderServiceSection = (
    svc: 'pickup' | 'delivery' | 'reservation',
    label: string,
    icon: React.ReactNode
  ) => (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
      <div className="flex items-center justify-between p-5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">{label}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {serviceSuspended[svc] ? 'Servizio temporaneamente sospeso' : 'Servizio attivo'}
            </p>
          </div>
        </div>
        <button
          onClick={() => toggleServiceSuspension(svc)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            serviceSuspended[svc]
              ? 'bg-[var(--success-bg)] text-[var(--success)]'
              : 'bg-[var(--warning-bg)] text-[var(--warning)]'
          }`}
        >
          {serviceSuspended[svc] ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
          {serviceSuspended[svc] ? 'Riattiva' : 'Sospendi'}
        </button>
      </div>
      <div className="p-5">
        {serviceSuspended[svc] && (
          <div className="mb-6 p-4 bg-[var(--warning-bg)] border border-[var(--warning)]/20 rounded-xl flex items-center gap-3">
            <AlertTriangle size={18} className="text-[var(--warning)]" />
            <p className="text-sm font-medium text-[var(--warning)]">
              Il servizio è sospeso. I clienti non potranno effettuare ordini di tipo{' '}
              {label.toLowerCase()}.
            </p>
          </div>
        )}
        <div className="space-y-4">
          {days.map((day) => (
            <div
              key={day}
              className="flex flex-col lg:flex-row lg:items-center gap-4 py-4 border-b border-border/50 last:border-0"
            >
              <div className="w-40 flex items-center gap-3 flex-shrink-0">
                <Toggle
                  checked={serviceHours[svc][day].enabled}
                  onChange={() => toggleServiceDay(svc, day)}
                  size="sm"
                />
                <span
                  className={`text-sm font-bold ${serviceHours[svc][day].enabled ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  {day}
                </span>
              </div>
              {serviceHours[svc][day].enabled ? (
                <div className="flex flex-col md:flex-row md:items-center gap-6 flex-1 bg-muted/20 p-3 rounded-xl border border-border/50">
                  {/* Lunch slot */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={serviceHours[svc][day].lunchEnabled !== false}
                        onChange={() => toggleServiceSlot?.(svc, day, 'lunch')}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                      />
                      <span className="text-xs font-bold text-foreground w-14">Pranzo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        disabled={serviceHours[svc][day].lunchEnabled === false}
                        value={serviceHours[svc][day].lunch.from}
                        onChange={(e) => updateServiceHour(svc, day, 'lunch', 'from', e.target.value)}
                        className={`px-2.5 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0 w-[180px] max-w-full appearance-none ${
                          serviceHours[svc][day].lunchEnabled === false ? 'opacity-40 cursor-not-allowed bg-muted' : ''
                        }`}
                      />
                      <span className="text-xs text-muted-foreground">–</span>
                      <input
                        type="time"
                        disabled={serviceHours[svc][day].lunchEnabled === false}
                        value={serviceHours[svc][day].lunch.to}
                        onChange={(e) => updateServiceHour(svc, day, 'lunch', 'to', e.target.value)}
                        className={`px-2.5 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0 w-[180px] max-w-full appearance-none ${
                          serviceHours[svc][day].lunchEnabled === false ? 'opacity-40 cursor-not-allowed bg-muted' : ''
                        }`}
                      />
                    </div>
                    {serviceHours[svc][day].lunchEnabled === false && (
                      <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        Fascia disattivata
                      </span>
                    )}
                  </div>

                  {/* Dinner slot */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={serviceHours[svc][day].dinnerEnabled !== false}
                        onChange={() => toggleServiceSlot?.(svc, day, 'dinner')}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                      />
                      <span className="text-xs font-bold text-foreground w-14">Cena</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        disabled={serviceHours[svc][day].dinnerEnabled === false}
                        value={serviceHours[svc][day].dinner.from}
                        onChange={(e) => updateServiceHour(svc, day, 'dinner', 'from', e.target.value)}
                        className={`px-2.5 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0 w-[180px] max-w-full appearance-none ${
                          serviceHours[svc][day].dinnerEnabled === false ? 'opacity-40 cursor-not-allowed bg-muted' : ''
                        }`}
                      />
                      <span className="text-xs text-muted-foreground">–</span>
                      <input
                        type="time"
                        disabled={serviceHours[svc][day].dinnerEnabled === false}
                        value={serviceHours[svc][day].dinner.to}
                        onChange={(e) => updateServiceHour(svc, day, 'dinner', 'to', e.target.value)}
                        className={`px-2.5 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0 w-[180px] max-w-full appearance-none ${
                          serviceHours[svc][day].dinnerEnabled === false ? 'opacity-40 cursor-not-allowed bg-muted' : ''
                        }`}
                      />
                    </div>
                    {serviceHours[svc][day].dinnerEnabled === false && (
                      <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        Fascia disattivata
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic bg-muted/50 px-3 py-1.5 rounded-lg border border-border">Chiuso</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Configurazione Orari & Servizi</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gestisci la disponibilità dei servizi e gli orari di apertura
          </p>
        </div>
        <button
          onClick={handleSaveHours}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all ${saved ? 'bg-[var(--success)] text-white shadow-green-200' : 'bg-primary text-white shadow-primary/20 hover:bg-[#d43d22]'}`}
        >
          {saved ? <Check size={18} /> : <Save size={18} />}
          {saved ? 'Salvato' : 'Salva Orari'}
        </button>
      </div>

      <div className="space-y-6">
        {renderServiceSection('pickup', 'Asporto / Ritiro', <Clock size={20} />)}
        {renderServiceSection('delivery', 'Consegna a Domicilio', <Settings size={20} />)}
        {renderServiceSection('reservation', 'Prenotazione Tavoli', <Settings size={20} />)}
      </div>
    </div>
  );
}
