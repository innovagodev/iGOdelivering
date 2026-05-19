'use client';
import React from 'react';
import { Store, MapPin, Clock, UtensilsCrossed, CheckCircle, ArrowRight } from 'lucide-react';

import { RestaurantInfo, DeliveryZone, DayHours, MenuItemWizardDraft } from '@/types';

interface ReviewStepProps {
  info: RestaurantInfo;
  zones: DeliveryZone[];
  hours: Record<string, DayHours>;
  menuItems: MenuItemWizardDraft[];
  menuCategories: string[];
  handlePublish: () => void;
}

export default function ReviewStep({
  info,
  zones,
  hours,
  menuItems,
  menuCategories,
  handlePublish,
}: ReviewStepProps) {
  const activeZones = zones.filter((z) => z.enabled);
  const openDays = Object.values(hours).filter((h) => h.open).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Riepilogo e Pubblicazione</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Verifica i dati inseriti prima di pubblicare il ristorante
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <Store size={18} />
            <span className="font-bold text-sm uppercase tracking-wider">Informazioni</span>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{info.name || 'Nome non inserito'}</p>
            <p className="text-sm text-muted-foreground">{info.category}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {info.address}, {info.city}
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <MapPin size={18} />
            <span className="font-bold text-sm uppercase tracking-wider">Consegna</span>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{activeZones.length} Zone attive</p>
            <p className="text-sm text-muted-foreground">
              Copertura max: {Math.max(...zones.map((z) => z.radius), 0)} km
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <Clock size={18} />
            <span className="font-bold text-sm uppercase tracking-wider">Orari</span>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{openDays} giorni su 7</p>
            <p className="text-sm text-muted-foreground">Aperto a pranzo e cena</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <UtensilsCrossed size={18} />
            <span className="font-bold text-sm uppercase tracking-wider">Menu</span>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{menuItems.length} Piatti</p>
            <p className="text-sm text-muted-foreground">
              {menuCategories.length} Categorie configurate
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-2xl p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-[var(--success)] text-white flex items-center justify-center mx-auto">
          <CheckCircle size={24} />
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">Tutto pronto!</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Pubblicando il ristorante, verranno generate le credenziali per il proprietario e la
            vetrina sarà accessibile.
          </p>
        </div>
        <button
          onClick={handlePublish}
          className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-[#d43d22] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          Pubblica Ristorante
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
