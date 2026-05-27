'use client';
import React from 'react';
import {
  Store,
  MapPin,
  Clock,
  UtensilsCrossed,
  CheckCircle2,
  ArrowRight,
  Layers,
  Tag,
} from 'lucide-react';

import { RestaurantInfo, DeliveryZone, DayHours, MenuItemWizardDraft, PromoCode } from '@/types';

interface ReviewStepProps {
  info: RestaurantInfo;
  zones: DeliveryZone[];
  hours: Record<string, DayHours>;
  menuItems: MenuItemWizardDraft[];
  menuCategories: string[];
  promos?: PromoCode[];
  handlePublish: () => void;
}

interface SummaryCardProps {
  icon: React.ReactNode;
  title: string;
  primary: string;
  secondary: string;
  extra?: string;
}

function SummaryCard({ icon, title, primary, secondary, extra }: SummaryCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          {icon}
        </div>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
      </div>
      {/* Content */}
      <div>
        <p className="text-base font-bold text-foreground leading-snug">{primary}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{secondary}</p>
        {extra && <p className="text-xs text-muted-foreground mt-1">{extra}</p>}
      </div>
    </div>
  );
}

export default function ReviewStep({
  info,
  zones,
  hours,
  menuItems,
  menuCategories,
  promos,
  handlePublish,
}: ReviewStepProps) {
  const activeZones = zones.filter((z) => z.enabled);
  const openDays = Object.values(hours).filter((h) => h.open).length;
  const maxRadius = Math.max(...zones.map((z) => z.radius), 0);
  const activePromos = promos?.filter((p) => p.active) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Riepilogo e Pubblicazione</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Verifica i dati inseriti prima di pubblicare il ristorante
        </p>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SummaryCard
          icon={<Store size={16} />}
          title="Informazioni"
          primary={info.name || 'Nome non inserito'}
          secondary={info.category}
          extra={`${info.address}${info.city ? ', ' + info.city : ''}`}
        />
        <SummaryCard
          icon={<MapPin size={16} />}
          title="Consegna"
          primary={`${activeZones.length} Zone attive`}
          secondary={`Copertura max: ${maxRadius} km`}
        />
        <SummaryCard
          icon={<Clock size={16} />}
          title="Orari"
          primary={`${openDays} giorni su 7`}
          secondary="Pranzo e cena configurati"
        />
        <SummaryCard
          icon={<UtensilsCrossed size={16} />}
          title="Menu"
          primary={`${menuItems.length} Piatti`}
          secondary={`${menuCategories.length} Categorie configurate`}
        />
        {promos !== undefined && (
          <SummaryCard
            icon={<Tag size={16} />}
            title="Promozioni"
            primary={`${activePromos.length} Attive`}
            secondary={`${promos.length} Codici in totale`}
          />
        )}
      </div>

      {/* Category chips (optional, shows categories at a glance) */}
      {menuCategories.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wide">
            <Layers size={13} />
            Categorie Menu
          </div>
          <div className="flex flex-wrap gap-2">
            {menuCategories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1 bg-muted border border-border rounded-lg px-2.5 py-1 text-xs font-medium text-foreground"
              >
                <Tag size={10} className="text-muted-foreground" />
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Promo codes summary */}
      {promos && promos.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wide">
            <Tag size={13} />
            Codici Promo & Offerte
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {promos.map((p) => {
              const promoLabels: Record<string, string> = {
                percentage: 'Sconto %',
                fixed_amount: 'Sconto Fisso',
                threshold_based: 'A Soglia',
                first_order: 'Primo Ordine',
                free_delivery: 'Consegna Gratuita',
              };
              return (
                <div key={p.id} className="border border-border/80 rounded-xl p-3 flex items-center justify-between bg-muted/40">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20 uppercase">
                        {p.code}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${p.active ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                        {p.active ? 'Attivo' : 'Inattivo'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                      {p.description || `${promoLabels[p.type] || p.type} - Valore: ${p.type === 'free_delivery' ? 'Gratis' : p.value + (p.type === 'percentage' || p.type === 'first_order' ? '%' : '€')}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Publish CTA */}
      <div className="bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-[var(--success)] text-white flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-base font-bold text-foreground">Tutto pronto!</p>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-sm">
              Pubblicando il ristorante, verranno generate le credenziali per il proprietario e la
              vetrina sarà accessibile ai clienti.
            </p>
          </div>
        </div>
        <button
          onClick={handlePublish}
          className="w-full bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-primary/90 active:scale-[.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          Pubblica Ristorante
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}
