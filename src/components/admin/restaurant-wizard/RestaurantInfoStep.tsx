'use client';
import React from 'react';
import { Store, FileText, Upload, X, MapPin, Phone, Mail, Globe, ChevronDown } from 'lucide-react';
import Toggle from '@/components/ui/Toggle';

import { RestaurantInfo, TableBookingConfig } from '@/types';

interface RestaurantInfoStepProps {
  info: RestaurantInfo;
  setInfo: React.Dispatch<React.SetStateAction<RestaurantInfo>>;
  tableBooking: TableBookingConfig;
  setTableBooking: React.Dispatch<React.SetStateAction<TableBookingConfig>>;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  bgImageInputRef: React.RefObject<HTMLInputElement | null>;
  handleLogoFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBgImageFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

import { RESTAURANT_CATEGORIES } from '@/lib/constants';

export default function RestaurantInfoStep({
  info,
  setInfo,
  tableBooking,
  setTableBooking,
  logoInputRef,
  bgImageInputRef,
  handleLogoFile,
  handleBgImageFile,
}: RestaurantInfoStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Informazioni Ristorante</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Dati anagrafici e contatti del ristorante
        </p>
      </div>
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Nome Ristorante *
            </label>
            <div className="relative">
              <Store
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                value={info.name}
                onChange={(e) => setInfo((p) => ({ ...p, name: e.target.value }))}
                placeholder="es. Pizzeria Bella Napoli"
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Categoria *
            </label>
            <div className="relative">
              <select
                value={info.category}
                onChange={(e) => setInfo((p) => ({ ...p, category: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
              >
                {RESTAURANT_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">P. IVA</label>
            <div className="relative">
              <FileText
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                value={info.vatNumber}
                onChange={(e) => setInfo((p) => ({ ...p, vatNumber: e.target.value }))}
                placeholder="IT12345678901"
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Descrizione
            </label>
            <textarea
              value={info.description}
              onChange={(e) => setInfo((p) => ({ ...p, description: e.target.value }))}
              placeholder="Breve descrizione del ristorante..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Logo & Background Image */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Logo Ristorante
            </label>
            <div className="flex items-center gap-3">
              {info.logoUrl ? (
                <div className="relative w-16 h-16 rounded-xl border border-border overflow-hidden flex-shrink-0 bg-muted">
                  <img
                    src={info.logoUrl}
                    alt="Logo ristorante"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setInfo((p) => ({ ...p, logoUrl: '' }))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center flex-shrink-0">
                  <Upload size={18} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm border border-border rounded-xl hover:bg-muted transition-colors text-muted-foreground font-medium"
                >
                  <Upload size={14} />
                  {info.logoUrl ? 'Cambia logo' : 'Carica logo'}
                </button>
                <p className="text-xs text-muted-foreground mt-1.5">
                  PNG, JPG — verrà mostrato in alto a sinistra nel menu
                </p>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoFile}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Immagine di Sfondo (Hero)
            </label>
            <div className="flex items-center gap-3">
              {info.backgroundImageUrl ? (
                <div className="relative w-16 h-16 rounded-xl border border-border overflow-hidden flex-shrink-0">
                  <img
                    src={info.backgroundImageUrl}
                    alt="Immagine di sfondo"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setInfo((p) => ({ ...p, backgroundImageUrl: '' }))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center flex-shrink-0">
                  <Upload size={18} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => bgImageInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm border border-border rounded-xl hover:bg-muted transition-colors text-muted-foreground font-medium"
                >
                  <Upload size={14} />
                  {info.backgroundImageUrl ? 'Cambia sfondo' : 'Carica sfondo'}
                </button>
                <p className="text-xs text-muted-foreground mt-1.5">
                  JPG, PNG — banner hero nella pagina menu cliente
                </p>
                <input
                  ref={bgImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBgImageFile}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-5">
          <p className="text-sm font-semibold text-foreground mb-4">Indirizzo</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Via / Piazza *
              </label>
              <div className="relative">
                <MapPin
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  value={info.address}
                  onChange={(e) => setInfo((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Via Roma 1"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Città *
              </label>
              <input
                type="text"
                value={info.city}
                onChange={(e) => setInfo((p) => ({ ...p, city: e.target.value }))}
                placeholder="Napoli"
                className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Provincia
                </label>
                <input
                  type="text"
                  value={info.province}
                  onChange={(e) => setInfo((p) => ({ ...p, province: e.target.value }))}
                  placeholder="NA"
                  maxLength={2}
                  className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  CAP
                </label>
                <input
                  type="text"
                  value={info.cap}
                  onChange={(e) => setInfo((p) => ({ ...p, cap: e.target.value }))}
                  placeholder="80100"
                  maxLength={5}
                  className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-5">
          <p className="text-sm font-semibold text-foreground mb-4">Contatti</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Telefono *
              </label>
              <div className="relative">
                <Phone
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="tel"
                  value={info.phone}
                  onChange={(e) => setInfo((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+39 081 123 4567"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Email *
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="email"
                  value={info.email}
                  onChange={(e) => setInfo((p) => ({ ...p, email: e.target.value }))}
                  placeholder="info@ristorante.it"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Sito web
              </label>
              <div className="relative">
                <Globe
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="url"
                  value={info.website}
                  onChange={(e) => setInfo((p) => ({ ...p, website: e.target.value }))}
                  placeholder="https://www.ristorante.it"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table Booking Config */}
        <div className="border-t border-border pt-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Prenotazione Tavolo</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Abilita il servizio di prenotazione tavolo per questo ristorante
              </p>
            </div>
            <Toggle
              checked={tableBooking.enabled}
              onChange={() => setTableBooking((p) => ({ ...p, enabled: !p.enabled }))}
              size="sm"
            />
          </div>
          {tableBooking.enabled && (
            <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Max ospiti per prenotazione
                  </label>
                  <input
                    type="number"
                    value={tableBooking.maxGuests}
                    onChange={(e) =>
                      setTableBooking((p) => ({ ...p, maxGuests: parseInt(e.target.value) || 1 }))
                    }
                    min={1}
                    max={50}
                    className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Durata slot (minuti)
                  </label>
                  <input
                    type="number"
                    value={tableBooking.slotDuration}
                    onChange={(e) =>
                      setTableBooking((p) => ({
                        ...p,
                        slotDuration: parseInt(e.target.value) || 30,
                      }))
                    }
                    min={15}
                    step={15}
                    className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Prenotazione anticipata (giorni)
                  </label>
                  <input
                    type="number"
                    value={tableBooking.advanceBookingDays}
                    onChange={(e) =>
                      setTableBooking((p) => ({
                        ...p,
                        advanceBookingDays: parseInt(e.target.value) || 1,
                      }))
                    }
                    min={1}
                    max={365}
                    className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Servizio attivo</p>
                  <p className="text-xs text-muted-foreground">
                    Il ristorante può disattivare quando i tavoli sono pieni
                  </p>
                </div>
                <Toggle
                  checked={tableBooking.serviceEnabled}
                  onChange={() =>
                    setTableBooking((p) => ({ ...p, serviceEnabled: !p.serviceEnabled }))
                  }
                  size="sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
