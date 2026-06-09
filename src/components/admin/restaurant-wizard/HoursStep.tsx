'use client';
import React from 'react';
import { Clock, Settings, AlertTriangle, Calendar, PauseCircle, PlayCircle } from 'lucide-react';
import Toggle from '@/components/ui/Toggle';

import { DayHours, ServiceHours } from '@/types';

interface HoursStepProps {
  days: string[];
  hours: Record<string, DayHours>;
  toggleDay: (day: string) => void;
  updateHour: (
    day: string,
    service: 'lunch' | 'dinner',
    field: 'from' | 'to',
    value: string
  ) => void;
  toggleSlot: (day: string, service: 'lunch' | 'dinner') => void;
  pickupHours: ServiceHours;
  setPickupHours: React.Dispatch<React.SetStateAction<ServiceHours>>;
  deliveryHours: ServiceHours;
  setDeliveryHours: React.Dispatch<React.SetStateAction<ServiceHours>>;
  bookingHours: ServiceHours;
  setBookingHours: React.Dispatch<React.SetStateAction<ServiceHours>>;
  toggleServiceDay: (
    setter: React.Dispatch<React.SetStateAction<ServiceHours>>,
    day: string
  ) => void;
  toggleServiceSlot: (
    setter: React.Dispatch<React.SetStateAction<ServiceHours>>,
    day: string,
    service: 'lunch' | 'dinner'
  ) => void;
  updateServiceHour: (
    setter: React.Dispatch<React.SetStateAction<ServiceHours>>,
    day: string,
    service: 'lunch' | 'dinner',
    field: 'from' | 'to',
    value: string
  ) => void;

  serviceSuspended: { pickup: boolean; delivery: boolean; reservation: boolean };
  setServiceSuspended: React.Dispatch<React.SetStateAction<{ pickup: boolean; delivery: boolean; reservation: boolean }>>;
  temporaryClosure: { enabled: boolean; from: string; to: string; message: string };
  setTemporaryClosure: React.Dispatch<React.SetStateAction<{ enabled: boolean; from: string; to: string; message: string }>>;
}

const timeInputClass =
  'px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring min-w-0 w-[108px] appearance-none tabular-nums';

/** Single day row: toggle + label + responsive/inline lunch/dinner times */
function DayRow({
  day,
  dayData,
  onToggle,
  onToggleSlot,
  onUpdateLunchFrom,
  onUpdateLunchTo,
  onUpdateDinnerFrom,
  onUpdateDinnerTo,
  isLast,
}: {
  day: string;
  dayData: DayHours;
  onToggle: () => void;
  onToggleSlot: (service: 'lunch' | 'dinner') => void;
  onUpdateLunchFrom: (v: string) => void;
  onUpdateLunchTo: (v: string) => void;
  onUpdateDinnerFrom: (v: string) => void;
  onUpdateDinnerTo: (v: string) => void;
  isLast: boolean;
}) {
  return (
    <div className={`px-5 py-4 ${!isLast ? 'border-b border-border' : ''}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Day name & toggle header */}
        <div className="flex items-center justify-between lg:justify-start gap-3 flex-shrink-0 w-full lg:w-40">
          <div className="flex items-center gap-3">
            <Toggle checked={dayData.open} onChange={onToggle} size="sm" />
            <span
              className={`text-sm font-bold w-24 ${
                dayData.open ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {day}
            </span>
          </div>
          {!dayData.open && (
            <span className="lg:hidden text-xs font-bold text-muted-foreground italic bg-muted px-2.5 py-1 rounded-lg border border-border">
              Chiuso
            </span>
          )}
        </div>

        {dayData.open ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            {/* Pranzo slot */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-muted/10 lg:bg-transparent p-3 lg:p-0 rounded-xl lg:rounded-none border border-border/30 lg:border-0">
              <div className="flex items-center gap-2 flex-shrink-0 w-24">
                <input
                  type="checkbox"
                  checked={dayData.lunchEnabled !== false}
                  onChange={() => onToggleSlot('lunch')}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                />
                <span className="text-xs font-bold text-foreground">Pranzo</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  disabled={dayData.lunchEnabled === false}
                  value={dayData.lunch.from}
                  onChange={(e) => onUpdateLunchFrom(e.target.value)}
                  className={`${timeInputClass} ${
                    dayData.lunchEnabled === false ? 'opacity-40 cursor-not-allowed bg-muted' : ''
                  }`}
                />
                <span className="text-xs text-muted-foreground">–</span>
                <input
                  type="time"
                  disabled={dayData.lunchEnabled === false}
                  value={dayData.lunch.to}
                  onChange={(e) => onUpdateLunchTo(e.target.value)}
                  className={`${timeInputClass} ${
                    dayData.lunchEnabled === false ? 'opacity-40 cursor-not-allowed bg-muted' : ''
                  }`}
                />
                {dayData.lunchEnabled === false && (
                  <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200 whitespace-nowrap">
                    Disattivato
                  </span>
                )}
              </div>
            </div>

            {/* Cena slot */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-muted/10 lg:bg-transparent p-3 lg:p-0 rounded-xl lg:rounded-none border border-border/30 lg:border-0">
              <div className="flex items-center gap-2 flex-shrink-0 w-24">
                <input
                  type="checkbox"
                  checked={dayData.dinnerEnabled !== false}
                  onChange={() => onToggleSlot('dinner')}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                />
                <span className="text-xs font-bold text-foreground">Cena</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  disabled={dayData.dinnerEnabled === false}
                  value={dayData.dinner.from}
                  onChange={(e) => onUpdateDinnerFrom(e.target.value)}
                  className={`${timeInputClass} ${
                    dayData.dinnerEnabled === false ? 'opacity-40 cursor-not-allowed bg-muted' : ''
                  }`}
                />
                <span className="text-xs text-muted-foreground">–</span>
                <input
                  type="time"
                  disabled={dayData.dinnerEnabled === false}
                  value={dayData.dinner.to}
                  onChange={(e) => onUpdateDinnerTo(e.target.value)}
                  className={`${timeInputClass} ${
                    dayData.dinnerEnabled === false ? 'opacity-40 cursor-not-allowed bg-muted' : ''
                  }`}
                />
                {dayData.dinnerEnabled === false && (
                  <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200 whitespace-nowrap">
                    Disattivato
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <span className="hidden lg:inline-block text-xs font-bold text-muted-foreground italic bg-muted px-2.5 py-1 rounded-lg border border-border">
            Chiuso
          </span>
        )}
      </div>
    </div>
  );
}

export default function HoursStep({
  days,
  hours,
  toggleDay,
  updateHour,
  toggleSlot,
  pickupHours,
  setPickupHours,
  deliveryHours,
  setDeliveryHours,
  bookingHours,
  setBookingHours,
  toggleServiceDay,
  toggleServiceSlot,
  updateServiceHour,

  serviceSuspended,
  setServiceSuspended,
  temporaryClosure,
  setTemporaryClosure,
}: HoursStepProps) {

  const renderTemporaryClosureSection = () => {
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
          <div className="space-y-0 border border-border rounded-2xl overflow-hidden bg-card">
            {days.map((day, idx) => (
              <DayRow
                key={day}
                day={day}
                dayData={hours[day]}
                onToggle={() => toggleDay(day)}
                onToggleSlot={(service) => toggleSlot(day, service)}
                onUpdateLunchFrom={(v) => updateHour(day, 'lunch', 'from', v)}
                onUpdateLunchTo={(v) => updateHour(day, 'lunch', 'to', v)}
                onUpdateDinnerFrom={(v) => updateHour(day, 'dinner', 'from', v)}
                onUpdateDinnerTo={(v) => updateHour(day, 'dinner', 'to', v)}
                isLast={idx === days.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderServiceSection = (
    svc: 'pickup' | 'delivery' | 'reservation',
    label: string,
    icon: React.ReactNode,
    state: ServiceHours,
    setter: React.Dispatch<React.SetStateAction<ServiceHours>>
  ) => {
    const isInherited = !state.useCustom;
    const isSuspended = serviceSuspended[svc];
    const activeHoursSource = isInherited ? hours : state.hours;

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
                onClick={() => state.useCustom && setter((prev) => ({ ...prev, useCustom: false }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isInherited
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Apertura
              </button>
              <button
                type="button"
                onClick={() => !state.useCustom && setter((prev) => ({ ...prev, useCustom: true }))}
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
              onClick={() => setServiceSuspended((prev) => ({ ...prev, [svc]: !prev[svc] }))}
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
                    const dayData = hours[day];
                    if (!dayData.open) return null;
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
                  {days.every(d => !hours[d].open) && (
                    <span className="text-xs text-red-500 font-semibold">Attenzione: Il locale risulta chiuso tutti i giorni negli orari generali.</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-0 border border-border rounded-2xl overflow-hidden bg-card">
              {days.map((day, idx) => (
                <DayRow
                  key={day}
                  day={day}
                  dayData={state.hours[day]}
                  onToggle={() => toggleServiceDay(setter, day)}
                  onToggleSlot={(service) => toggleServiceSlot(setter, day, service)}
                  onUpdateLunchFrom={(v) => updateServiceHour(setter, day, 'lunch', 'from', v)}
                  onUpdateLunchTo={(v) => updateServiceHour(setter, day, 'lunch', 'to', v)}
                  onUpdateDinnerFrom={(v) => updateServiceHour(setter, day, 'dinner', 'from', v)}
                  onUpdateDinnerTo={(v) => updateServiceHour(setter, day, 'dinner', 'to', v)}
                  isLast={idx === days.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Orari & Chiusure</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configura gli orari di apertura generali, le chiusure per ferie e la disponibilità di ciascun servizio.
        </p>
      </div>

      {renderGeneralSection()}
      {renderTemporaryClosureSection()}

      <div className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Disponibilità Servizi
        </p>
        {renderServiceSection('pickup', 'Asporto / Ritiro', <Clock size={20} />, pickupHours, setPickupHours)}
        {renderServiceSection('delivery', 'Consegna a Domicilio', <Settings size={20} />, deliveryHours, setDeliveryHours)}
        {renderServiceSection('reservation', 'Prenotazione Tavoli', <Settings size={20} />, bookingHours, setBookingHours)}
      </div>
    </div>
  );
}
