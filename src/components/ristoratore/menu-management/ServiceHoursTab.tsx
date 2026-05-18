'use client';
import React from 'react';
import { Settings, Save, AlertTriangle, Check, PauseCircle, PlayCircle, Clock } from 'lucide-react';
import Toggle from '@/components/ui/Toggle';

interface DayServiceHours {
  enabled: boolean;
  suspended: boolean;
  lunch: { from: string; to: string };
  dinner: { from: string; to: string };
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
              className="flex flex-col sm:flex-row sm:items-center gap-4 py-3 border-b border-border/50 last:border-0"
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
                <div className="flex flex-wrap items-center gap-4 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium w-14">Pranzo</span>
                    <input
                      type="time"
                      value={serviceHours[svc][day].lunch.from}
                      onChange={(e) => updateServiceHour(svc, day, 'lunch', 'from', e.target.value)}
                      className="px-2.5 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0 w-[110px] appearance-none"
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <input
                      type="time"
                      value={serviceHours[svc][day].lunch.to}
                      onChange={(e) => updateServiceHour(svc, day, 'lunch', 'to', e.target.value)}
                      className="px-2.5 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0 w-[110px] appearance-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium w-14">Cena</span>
                    <input
                      type="time"
                      value={serviceHours[svc][day].dinner.from}
                      onChange={(e) =>
                        updateServiceHour(svc, day, 'dinner', 'from', e.target.value)
                      }
                      className="px-2.5 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0 w-[110px] appearance-none"
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <input
                      type="time"
                      value={serviceHours[svc][day].dinner.to}
                      onChange={(e) => updateServiceHour(svc, day, 'dinner', 'to', e.target.value)}
                      className="px-2.5 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0 w-[110px] appearance-none"
                    />
                  </div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">Chiuso</span>
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
