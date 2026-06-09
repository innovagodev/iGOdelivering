'use client';
import React from 'react';
import { MapPin, Trash2, Euro, Plus, Radius, ShoppingBag, Gift } from 'lucide-react';
import Toggle from '@/components/ui/Toggle';

import { DeliveryZone } from '@/types';

interface DeliveryZonesStepProps {
  zones: DeliveryZone[];
  addZone: () => void;
  removeZone: (id: string) => void;
  updateZone: (id: string, field: keyof DeliveryZone, value: string | number | boolean) => void;
}

const inputClass =
  'w-full bg-input border border-border rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-ring tabular-nums';
const inputWithIconClass =
  'w-full pl-7 pr-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums';
const labelClass =
  'block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5';

export default function DeliveryZonesStep({
  zones,
  addZone,
  removeZone,
  updateZone,
}: DeliveryZonesStepProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Zone di Consegna</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configura le zone di consegna, i costi e gli ordini minimi
        </p>
      </div>

      {/* Zone cards */}
      <div className="space-y-4">
        {zones.map((zone) => (
          <div
            key={zone.id}
            className={`bg-card border rounded-2xl p-5 space-y-5 transition-colors ${
              zone.enabled ? 'border-border' : 'border-border/50 opacity-60'
            }`}
          >
            {/* Card header: toggle + name + delete */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Toggle
                  checked={zone.enabled}
                  onChange={() => updateZone(zone.id, 'enabled', !zone.enabled)}
                  size="sm"
                />
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin size={14} className="text-primary" />
                  </div>
                  <input
                    type="text"
                    value={zone.name}
                    onChange={(e) => updateZone(zone.id, 'name', e.target.value)}
                    placeholder="Nome zona…"
                    className="font-semibold text-base text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5 min-w-0 truncate"
                  />
                </div>
              </div>
              <button
                onClick={() => removeZone(zone.id)}
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[var(--danger-bg)] text-muted-foreground hover:text-[var(--danger)] transition-colors"
                aria-label="Rimuovi zona"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-border/60" />

            {/* Fields grid — radius solo, then 2-col euros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Raggio */}
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1.5">
                    <Radius size={10} />
                    Raggio (km)
                  </span>
                </label>
                <input
                  type="number"
                  value={zone.radius}
                  onChange={(e) => updateZone(zone.id, 'radius', parseFloat(e.target.value) || 0)}
                  min={0.5}
                  step={0.5}
                  className={inputClass}
                />
              </div>

              {/* Ordine minimo */}
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1.5">
                    <ShoppingBag size={10} />
                    Ordine minimo (€)
                  </span>
                </label>
                <div className="relative">
                  <Euro
                    size={12}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <input
                    type="number"
                    value={zone.minOrder}
                    onChange={(e) =>
                      updateZone(zone.id, 'minOrder', parseFloat(e.target.value) || 0)
                    }
                    min={0}
                    step={0.5}
                    className={inputWithIconClass}
                  />
                </div>
              </div>

              {/* Costo consegna */}
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1.5">
                    <Euro size={10} />
                    Costo consegna (€)
                  </span>
                </label>
                <div className="relative">
                  <Euro
                    size={12}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <input
                    type="number"
                    value={zone.deliveryFee}
                    onChange={(e) =>
                      updateZone(zone.id, 'deliveryFee', parseFloat(e.target.value) || 0)
                    }
                    min={0}
                    step={0.5}
                    className={inputWithIconClass}
                  />
                </div>
              </div>

              {/* Gratis da */}
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1.5">
                    <Gift size={10} />
                    Gratis da (€)
                  </span>
                </label>
                <div className="relative">
                  <Euro
                    size={12}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <input
                    type="number"
                    value={zone.freeDeliveryThreshold}
                    onChange={(e) =>
                      updateZone(zone.id, 'freeDeliveryThreshold', parseFloat(e.target.value) || 0)
                    }
                    min={0}
                    step={1}
                    className={inputWithIconClass}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Add zone button */}
        <button
          onClick={addZone}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-2xl py-5 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
        >
          <Plus size={16} />
          Aggiungi zona di consegna
        </button>
      </div>
    </div>
  );
}
