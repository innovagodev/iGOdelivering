'use client';
import React from 'react';
import { ChevronDown, ChevronUp, Bell, Clock } from 'lucide-react';

import { ScheduledOrdersConfig } from '@/types';

interface ScheduledOrdersStepProps {
  scheduledOrders: ScheduledOrdersConfig;
  setScheduledOrders: React.Dispatch<React.SetStateAction<ScheduledOrdersConfig>>;
  timeUnits: string[];
  timeWindows: string[];
}

const inputCls = 'px-3 py-2 text-base bg-input border border-border rounded-xl focus:outline-none';

export default function ScheduledOrdersStep({
  scheduledOrders,
  setScheduledOrders,
  timeUnits,
  timeWindows,
}: ScheduledOrdersStepProps) {
  const updateScheduled = (path: string, value: any) => {
    setScheduledOrders((prev: any) => {
      const next = { ...prev };
      const keys = path.split('.');
      let current = next;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const toggleSection = (key: keyof ScheduledOrdersConfig) => {
    setScheduledOrders((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h2 className="text-xl font-bold text-foreground">Ordini Programmati</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configura come i clienti possono prenotare in anticipo
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Pickup */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('pickupExpanded')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-primary flex items-center justify-center">
                <Bell size={16} />
              </div>
              <span className="font-semibold text-sm">Asporto</span>
            </div>
            {scheduledOrders.pickupExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {scheduledOrders.pickupExpanded && (
            <div className="px-5 pb-5 pt-1 space-y-4 border-t border-border/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Preavviso minimo
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={scheduledOrders.pickup.minNoticeValue}
                      onChange={(e) =>
                        updateScheduled('pickup.minNoticeValue', parseInt(e.target.value) || 0)
                      }
                      className={`w-20 ${inputCls}`}
                    />
                    <select
                      value={scheduledOrders.pickup.minNoticeUnit}
                      onChange={(e) => updateScheduled('pickup.minNoticeUnit', e.target.value)}
                      className={`flex-1 ${inputCls}`}
                    >
                      {timeUnits.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Max giorni anticipo
                  </label>
                  <input
                    type="number"
                    value={scheduledOrders.pickup.maxNoticeDays}
                    onChange={(e) =>
                      updateScheduled('pickup.maxNoticeDays', parseInt(e.target.value) || 0)
                    }
                    className={`w-full ${inputCls}`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Delivery */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('deliveryExpanded')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Clock size={16} />
              </div>
              <span className="font-semibold text-sm">Consegna a Domicilio</span>
            </div>
            {scheduledOrders.deliveryExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {scheduledOrders.deliveryExpanded && (
            <div className="px-5 pb-5 pt-1 space-y-4 border-t border-border/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Preavviso minimo
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={scheduledOrders.delivery.minNoticeValue}
                      onChange={(e) =>
                        updateScheduled('delivery.minNoticeValue', parseInt(e.target.value) || 0)
                      }
                      className={`w-20 ${inputCls}`}
                    />
                    <select
                      value={scheduledOrders.delivery.minNoticeUnit}
                      onChange={(e) => updateScheduled('delivery.minNoticeUnit', e.target.value)}
                      className={`flex-1 ${inputCls}`}
                    >
                      {timeUnits.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Max giorni anticipo
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={scheduledOrders.delivery.maxNoticeDays}
                    onChange={(e) =>
                      updateScheduled('delivery.maxNoticeDays', parseInt(e.target.value) || 0)
                    }
                    className={`w-full ${inputCls}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Finestra temporale
                  </label>
                  <select
                    value={`${scheduledOrders.delivery.timeWindowMinutes} minuti`}
                    onChange={(e) =>
                      updateScheduled('delivery.timeWindowMinutes', parseInt(e.target.value) || 15)
                    }
                    className={`w-full ${inputCls}`}
                  >
                    {timeWindows.map((w) => (
                      <option key={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Prenotazione tavolo */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('bookingExpanded')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <Bell size={16} />
              </div>
              <span className="font-semibold text-sm">Prenotazione tavolo</span>
            </div>
            {scheduledOrders.bookingExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {scheduledOrders.bookingExpanded && (
            <div className="px-5 pb-5 pt-1 space-y-4 border-t border-border/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Preavviso minimo
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      value={scheduledOrders.booking.minNoticeValue}
                      onChange={(e) =>
                        updateScheduled('booking.minNoticeValue', parseInt(e.target.value) || 0)
                      }
                      className={`w-20 ${inputCls}`}
                    />
                    <select
                      value={scheduledOrders.booking.minNoticeUnit}
                      onChange={(e) => updateScheduled('booking.minNoticeUnit', e.target.value)}
                      className={`flex-1 ${inputCls}`}
                    >
                      {timeUnits.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Max giorni anticipo
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={scheduledOrders.booking.maxNoticeDays}
                    onChange={(e) =>
                      updateScheduled('booking.maxNoticeDays', parseInt(e.target.value) || 0)
                    }
                    className={`w-full ${inputCls}`}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Valgono per le prenotazioni dalla vetrina. Chi ordina dal QR del tavolo non ha
                preavviso.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
