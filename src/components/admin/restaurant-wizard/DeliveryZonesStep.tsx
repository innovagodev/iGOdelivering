'use client';
import React from 'react';
import { MapPin, Trash2, Euro, Plus } from 'lucide-react';
import Toggle from '@/components/ui/Toggle';

import { DeliveryZone } from '@/types';

interface DeliveryZonesStepProps {
  zones: DeliveryZone[];
  addZone: () => void;
  removeZone: (id: string) => void;
  updateZone: (id: string, field: keyof DeliveryZone, value: string | number | boolean) => void;
}

export default function DeliveryZonesStep({
  zones,
  addZone,
  removeZone,
  updateZone,
}: DeliveryZonesStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Zone di Consegna</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configura le zone di consegna, i costi e gli ordini minimi
        </p>
      </div>
      <div className="space-y-4">
        {zones.map((zone) => (
          <div key={zone.id} className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Toggle
                  checked={zone.enabled}
                  onChange={() => updateZone(zone.id, 'enabled', !zone.enabled)}
                  size="sm"
                />
                <input
                  type="text"
                  value={zone.name}
                  onChange={(e) => updateZone(zone.id, 'name', e.target.value)}
                  className="font-semibold text-sm text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5"
                />
              </div>
              <button
                onClick={() => removeZone(zone.id)}
                className="p-1.5 rounded-lg hover:bg-[var(--danger-bg)] text-muted-foreground hover:text-[var(--danger)] transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Raggio (km)
                </label>
                <input
                  type="number"
                  value={zone.radius}
                  onChange={(e) => updateZone(zone.id, 'radius', parseFloat(e.target.value) || 0)}
                  min={0.5}
                  step={0.5}
                  className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Ordine min. (€)
                </label>
                <div className="relative">
                  <Euro
                    size={12}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="number"
                    value={zone.minOrder}
                    onChange={(e) =>
                      updateZone(zone.id, 'minOrder', parseFloat(e.target.value) || 0)
                    }
                    min={0}
                    step={0.5}
                    className="w-full pl-7 pr-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Costo consegna (€)
                </label>
                <div className="relative">
                  <Euro
                    size={12}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="number"
                    value={zone.deliveryFee}
                    onChange={(e) =>
                      updateZone(zone.id, 'deliveryFee', parseFloat(e.target.value) || 0)
                    }
                    min={0}
                    step={0.5}
                    className="w-full pl-7 pr-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Gratis da (€)
                </label>
                <div className="relative">
                  <Euro
                    size={12}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="number"
                    value={zone.freeDeliveryThreshold}
                    onChange={(e) =>
                      updateZone(zone.id, 'freeDeliveryThreshold', parseFloat(e.target.value) || 0)
                    }
                    min={0}
                    step={1}
                    className="w-full pl-7 pr-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={addZone}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-4 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus size={16} />
          Aggiungi zona di consegna
        </button>
      </div>
    </div>
  );
}
