'use client';
import React from 'react';
import { Clock, Settings, Sun, Moon } from 'lucide-react';
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
  updateServiceHour: (
    setter: React.Dispatch<React.SetStateAction<ServiceHours>>,
    day: string,
    service: 'lunch' | 'dinner',
    field: 'from' | 'to',
    value: string
  ) => void;
}

const timeInputClass =
  'px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring min-w-0 w-[108px] appearance-none tabular-nums';

/** Single day row: toggle + label + inline lunch/dinner times */
function DayRow({
  day,
  dayData,
  onToggle,
  onUpdateLunchFrom,
  onUpdateLunchTo,
  onUpdateDinnerFrom,
  onUpdateDinnerTo,
  isLast,
}: {
  day: string;
  dayData: DayHours;
  onToggle: () => void;
  onUpdateLunchFrom: (v: string) => void;
  onUpdateLunchTo: (v: string) => void;
  onUpdateDinnerFrom: (v: string) => void;
  onUpdateDinnerTo: (v: string) => void;
  isLast: boolean;
}) {
  return (
    <div className={`px-5 py-3.5 ${!isLast ? 'border-b border-border' : ''}`}>
      {/* Row: toggle + day name */}
      <div className="flex items-center gap-3">
        <Toggle checked={dayData.open} onChange={onToggle} size="sm" />
        <span
          className={`w-24 flex-shrink-0 text-sm font-semibold ${
            dayData.open ? 'text-foreground' : 'text-muted-foreground'
          }`}
        >
          {day}
        </span>

        {dayData.open ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 flex-1">
            {/* Pranzo */}
            <div className="flex items-center gap-1.5">
              <Sun size={12} className="text-amber-500 flex-shrink-0" />
              <span className="text-xs font-medium text-muted-foreground w-10">Pranzo</span>
              <input
                type="time"
                value={dayData.lunch.from}
                onChange={(e) => onUpdateLunchFrom(e.target.value)}
                className={timeInputClass}
              />
              <span className="text-xs text-muted-foreground">–</span>
              <input
                type="time"
                value={dayData.lunch.to}
                onChange={(e) => onUpdateLunchTo(e.target.value)}
                className={timeInputClass}
              />
            </div>
            {/* Cena */}
            <div className="flex items-center gap-1.5">
              <Moon size={12} className="text-indigo-400 flex-shrink-0" />
              <span className="text-xs font-medium text-muted-foreground w-10">Cena</span>
              <input
                type="time"
                value={dayData.dinner.from}
                onChange={(e) => onUpdateDinnerFrom(e.target.value)}
                className={timeInputClass}
              />
              <span className="text-xs text-muted-foreground">–</span>
              <input
                type="time"
                value={dayData.dinner.to}
                onChange={(e) => onUpdateDinnerTo(e.target.value)}
                className={timeInputClass}
              />
            </div>
          </div>
        ) : (
          <span className="text-xs font-medium text-muted-foreground italic bg-muted px-2.5 py-1 rounded-lg">
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
  pickupHours,
  setPickupHours,
  deliveryHours,
  setDeliveryHours,
  bookingHours,
  setBookingHours,
  toggleServiceDay,
  updateServiceHour,
}: HoursStepProps) {
  const renderServiceHoursBlock = (
    label: string,
    state: ServiceHours,
    setter: React.Dispatch<React.SetStateAction<ServiceHours>>
  ) => (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Block header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock size={14} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {state.useCustom ? 'Orari personalizzati' : 'Segue orari di apertura'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setter((prev) => ({ ...prev, useCustom: !prev.useCustom }))}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
            state.useCustom
              ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
              : 'bg-muted text-muted-foreground border-border hover:bg-border'
          }`}
        >
          <Settings size={11} />
          {state.useCustom ? 'Personalizzati' : 'Personalizza'}
        </button>
      </div>

      {/* Custom day rows */}
      {state.useCustom && (
        <div>
          {days.map((day, idx) => (
            <DayRow
              key={day}
              day={day}
              dayData={state.hours[day]}
              onToggle={() => toggleServiceDay(setter, day)}
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
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Orari</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configura gli orari di apertura e per ogni servizio
        </p>
      </div>

      {/* General opening hours */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Orari di Apertura
        </p>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {days.map((day, idx) => (
            <DayRow
              key={day}
              day={day}
              dayData={hours[day]}
              onToggle={() => toggleDay(day)}
              onUpdateLunchFrom={(v) => updateHour(day, 'lunch', 'from', v)}
              onUpdateLunchTo={(v) => updateHour(day, 'lunch', 'to', v)}
              onUpdateDinnerFrom={(v) => updateHour(day, 'dinner', 'from', v)}
              onUpdateDinnerTo={(v) => updateHour(day, 'dinner', 'to', v)}
              isLast={idx === days.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Service-specific hours */}
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Personalizza Orari per Servizio
          </p>
          <p className="text-xs text-muted-foreground">
            Opzionale — se non personalizzati, valgono gli orari di apertura generali.
          </p>
        </div>

        {renderServiceHoursBlock('Asporto', pickupHours, setPickupHours)}
        {renderServiceHoursBlock('Consegna a Domicilio', deliveryHours, setDeliveryHours)}
        {renderServiceHoursBlock('Prenotazione Tavoli', bookingHours, setBookingHours)}
      </div>
    </div>
  );
}
