'use client';
import React from 'react';
import { Settings } from 'lucide-react';
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
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {state.useCustom ? 'Orari personalizzati' : 'Stessi orari di apertura'}
          </p>
        </div>
        <button
          onClick={() => setter((prev) => ({ ...prev, useCustom: !prev.useCustom }))}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
            state.useCustom
              ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
              : 'bg-muted text-muted-foreground border-border hover:bg-border'
          }`}
        >
          <Settings size={12} />
          {state.useCustom ? 'Personalizzati' : 'Personalizza'}
        </button>
      </div>
      {state.useCustom && (
        <div>
          {days.map((day, idx) => (
            <div
              key={day}
              className={`px-5 py-3 ${idx < days.length - 1 ? 'border-b border-border' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-28 flex items-center gap-3 flex-shrink-0">
                  <Toggle
                    checked={state.hours[day].open}
                    onChange={() => toggleServiceDay(setter, day)}
                    size="sm"
                  />
                  <span
                    className={`text-sm font-semibold ${state.hours[day].open ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    {day}
                  </span>
                </div>
                {state.hours[day].open ? (
                  <div className="flex flex-wrap items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium w-12">Pranzo</span>
                      <input
                        type="time"
                        value={state.hours[day].lunch.from}
                        onChange={(e) =>
                          updateServiceHour(setter, day, 'lunch', 'from', e.target.value)
                        }
                        className="px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring min-w-0 w-[110px] appearance-none"
                      />
                      <span className="text-xs text-muted-foreground">–</span>
                      <input
                        type="time"
                        value={state.hours[day].lunch.to}
                        onChange={(e) =>
                          updateServiceHour(setter, day, 'lunch', 'to', e.target.value)
                        }
                        className="px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring min-w-0 w-[110px] appearance-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium w-12">Cena</span>
                      <input
                        type="time"
                        value={state.hours[day].dinner.from}
                        onChange={(e) =>
                          updateServiceHour(setter, day, 'dinner', 'from', e.target.value)
                        }
                        className="px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring min-w-0 w-[110px] appearance-none"
                      />
                      <span className="text-xs text-muted-foreground">–</span>
                      <input
                        type="time"
                        value={state.hours[day].dinner.to}
                        onChange={(e) =>
                          updateServiceHour(setter, day, 'dinner', 'to', e.target.value)
                        }
                        className="px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring min-w-0 w-[110px] appearance-none"
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Chiuso</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Orari</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configura gli orari di apertura e per ogni servizio
        </p>
      </div>

      {/* General opening hours */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3">Orari di Apertura</p>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {days.map((day, idx) => (
            <div
              key={day}
              className={`px-5 py-4 ${idx < days.length - 1 ? 'border-b border-border' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-28 flex items-center gap-3 flex-shrink-0">
                  <Toggle checked={hours[day].open} onChange={() => toggleDay(day)} size="sm" />
                  <span
                    className={`text-sm font-semibold ${hours[day].open ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    {day}
                  </span>
                </div>
                {hours[day].open ? (
                  <div className="flex flex-wrap items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium w-12">Pranzo</span>
                      <input
                        type="time"
                        value={hours[day].lunch.from}
                        onChange={(e) => updateHour(day, 'lunch', 'from', e.target.value)}
                        className="px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring min-w-0 w-[110px] appearance-none"
                      />
                      <span className="text-xs text-muted-foreground">–</span>
                      <input
                        type="time"
                        value={hours[day].lunch.to}
                        onChange={(e) => updateHour(day, 'lunch', 'to', e.target.value)}
                        className="px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring min-w-0 w-[110px] appearance-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium w-12">Cena</span>
                      <input
                        type="time"
                        value={hours[day].dinner.from}
                        onChange={(e) => updateHour(day, 'dinner', 'from', e.target.value)}
                        className="px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring min-w-0 w-[110px] appearance-none"
                      />
                      <span className="text-xs text-muted-foreground">–</span>
                      <input
                        type="time"
                        value={hours[day].dinner.to}
                        onChange={(e) => updateHour(day, 'dinner', 'to', e.target.value)}
                        className="px-2 py-1.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring min-w-0 w-[110px] appearance-none"
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Chiuso</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Service specific hours */}
      <div className="pt-4 space-y-6">
        <div>
          <p className="text-sm font-semibold text-foreground mb-3 text-balance">
            Personalizza Orari per Servizio (Opzionale)
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Se non personalizzati, verranno usati gli orari di apertura generali.
          </p>
        </div>

        {renderServiceHoursBlock('Asporto', pickupHours, setPickupHours)}
        {renderServiceHoursBlock('Consegna a Domicilio', deliveryHours, setDeliveryHours)}
        {renderServiceHoursBlock('Prenotazione Tavoli', bookingHours, setBookingHours)}
      </div>
    </div>
  );
}
