'use client';
import React, { useState, useRef } from 'react';
import {
  Store,
  FileText,
  Upload,
  X,
  MapPin,
  Phone,
  Mail,
  Globe,
  ChevronDown,
  Plus,
  Check,
  Tag,
} from 'lucide-react';
import Toggle from '@/components/ui/Toggle';
import { RestaurantInfo, TableBookingConfig } from '@/types';
import { RESTAURANT_CATEGORIES } from '@/lib/constants';

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

const inputCls =
  'w-full bg-input border border-border rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground transition-shadow';
const inputIconCls = inputCls + ' pl-9';
const labelCls = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5';

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
  const [allCategories, setAllCategories] = useState<string[]>([...RESTAURANT_CATEGORIES]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const newCatInputRef = useRef<HTMLInputElement>(null);

  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (!allCategories.includes(trimmed)) {
      setAllCategories((p) => [...p, trimmed]);
    }
    setInfo((p) => ({ ...p, category: trimmed }));
    setNewCategoryInput('');
    setShowAddCategory(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Informazioni Ristorante</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Dati anagrafici, contatti e impostazioni base
        </p>
      </div>

      {/* ─── Identità ─────────────────────────────────── */}
      <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <p className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Store size={13} className="text-primary" />
          Identità
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nome ristorante */}
          <div className="sm:col-span-2">
            <label className={labelCls}>Nome Ristorante *</label>
            <div className="relative">
              <Store size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={info.name}
                onChange={(e) => setInfo((p) => ({ ...p, name: e.target.value }))}
                placeholder="es. Pizzeria Bella Napoli"
                className={inputIconCls}
              />
            </div>
          </div>

          {/* Categoria con + inline */}
          <div>
            <label className={labelCls}>Categoria *</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <select
                  value={info.category}
                  onChange={(e) => setInfo((p) => ({ ...p, category: e.target.value }))}
                  className={`${inputCls} pl-9 pr-8`}
                >
                  {allCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddCategory((v) => !v);
                  setTimeout(() => newCatInputRef.current?.focus(), 50);
                }}
                title="Aggiungi categoria personalizzata"
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-muted hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-muted-foreground transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            {showAddCategory && (
              <div className="flex gap-2 mt-2">
                <input
                  ref={newCatInputRef}
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') setShowAddCategory(false); }}
                  placeholder="Nuova categoria..."
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                  <Check size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border border-border hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            )}
          </div>

          {/* P.IVA */}
          <div>
            <label className={labelCls}>Partita IVA</label>
            <div className="relative">
              <FileText size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={info.vatNumber}
                onChange={(e) => setInfo((p) => ({ ...p, vatNumber: e.target.value }))}
                placeholder="IT12345678901"
                className={inputIconCls}
              />
            </div>
          </div>

          {/* Descrizione */}
          <div className="sm:col-span-2">
            <label className={labelCls}>Descrizione</label>
            <textarea
              value={info.description}
              onChange={(e) => setInfo((p) => ({ ...p, description: e.target.value }))}
              placeholder="Breve descrizione del ristorante (viene mostrata ai clienti)..."
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>
      </section>

      {/* ─── Media ──────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <p className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Upload size={13} className="text-primary" />
          Media
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Logo */}
          <div>
            <label className={labelCls}>Logo Ristorante</label>
            <div className="flex items-center gap-3">
              {info.logoUrl ? (
                <div className="relative w-14 h-14 rounded-xl border border-border overflow-hidden flex-shrink-0 bg-muted">
                  <img src={info.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setInfo((p) => ({ ...p, logoUrl: '' }))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center flex-shrink-0">
                  <Upload size={18} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm border border-border rounded-xl hover:bg-muted transition-colors text-muted-foreground font-medium"
                >
                  <Upload size={13} />
                  {info.logoUrl ? 'Cambia logo' : 'Carica logo'}
                </button>
                <p className="text-[11px] text-muted-foreground mt-1">PNG, JPG — mostrato in sidebar</p>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
              </div>
            </div>
          </div>

          {/* Sfondo */}
          <div>
            <label className={labelCls}>Immagine di Sfondo (Hero)</label>
            <div className="flex items-center gap-3">
              {info.backgroundImageUrl ? (
                <div className="relative w-14 h-14 rounded-xl border border-border overflow-hidden flex-shrink-0">
                  <img src={info.backgroundImageUrl} alt="Sfondo" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setInfo((p) => ({ ...p, backgroundImageUrl: '' }))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center flex-shrink-0">
                  <Upload size={18} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => bgImageInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm border border-border rounded-xl hover:bg-muted transition-colors text-muted-foreground font-medium"
                >
                  <Upload size={13} />
                  {info.backgroundImageUrl ? 'Cambia sfondo' : 'Carica sfondo'}
                </button>
                <p className="text-[11px] text-muted-foreground mt-1">JPG, PNG — banner hero nel menu</p>
                <input ref={bgImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgImageFile} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Indirizzo ──────────────────────────────────── */}
      <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <p className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <MapPin size={13} className="text-primary" />
          Indirizzo
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Via / Piazza *</label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={info.address}
                onChange={(e) => setInfo((p) => ({ ...p, address: e.target.value }))}
                placeholder="Via Roma 1"
                className={inputIconCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Città *</label>
            <input
              type="text"
              value={info.city}
              onChange={(e) => setInfo((p) => ({ ...p, city: e.target.value }))}
              placeholder="Napoli"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Provincia</label>
              <input
                type="text"
                value={info.province}
                onChange={(e) => setInfo((p) => ({ ...p, province: e.target.value }))}
                placeholder="NA"
                maxLength={2}
                className={`${inputCls} uppercase`}
              />
            </div>
            <div>
              <label className={labelCls}>CAP</label>
              <input
                type="text"
                value={info.cap}
                onChange={(e) => setInfo((p) => ({ ...p, cap: e.target.value }))}
                placeholder="80100"
                maxLength={5}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Contatti ────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <p className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Phone size={13} className="text-primary" />
          Contatti
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Telefono *</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="tel"
                value={info.phone}
                onChange={(e) => setInfo((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+39 081 123 4567"
                className={inputIconCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={info.email}
                onChange={(e) => setInfo((p) => ({ ...p, email: e.target.value }))}
                placeholder="info@ristorante.it"
                className={inputIconCls}
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Sito web</label>
            <div className="relative">
              <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="url"
                value={info.website}
                onChange={(e) => setInfo((p) => ({ ...p, website: e.target.value }))}
                placeholder="https://www.ristorante.it"
                className={inputIconCls}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Prenotazione Tavolo ─────────────────────────── */}
      <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">Prenotazione Tavolo</p>
            <p className="text-xs text-muted-foreground mt-0.5">Abilita la gestione prenotazioni per questo ristorante</p>
          </div>
          <Toggle
            checked={tableBooking.enabled}
            onChange={() => setTableBooking((p) => ({ ...p, enabled: !p.enabled }))}
            size="sm"
          />
        </div>
        {tableBooking.enabled && (
          <div className="pt-3 border-t border-border">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Max ospiti</label>
                <input
                  type="number"
                  value={tableBooking.maxGuests}
                  onChange={(e) => setTableBooking((p) => ({ ...p, maxGuests: parseInt(e.target.value) || 1 }))}
                  min={1}
                  max={50}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Durata slot (min)</label>
                <input
                  type="number"
                  value={tableBooking.slotDuration}
                  onChange={(e) => setTableBooking((p) => ({ ...p, slotDuration: parseInt(e.target.value) || 30 }))}
                  min={15}
                  step={15}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Anticipo prenotazione (gg)</label>
                <input
                  type="number"
                  value={tableBooking.advanceBookingDays}
                  onChange={(e) => setTableBooking((p) => ({ ...p, advanceBookingDays: parseInt(e.target.value) || 1 }))}
                  min={1}
                  max={365}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Servizio attivo</p>
                <p className="text-xs text-muted-foreground">Il ristorante può disattivare quando i tavoli sono pieni</p>
              </div>
              <Toggle
                checked={tableBooking.serviceEnabled}
                onChange={() => setTableBooking((p) => ({ ...p, serviceEnabled: !p.serviceEnabled }))}
                size="sm"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
