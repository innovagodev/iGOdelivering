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
