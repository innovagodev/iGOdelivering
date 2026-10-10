'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Play, Bell } from 'lucide-react';
import Toggle from '@/components/ui/Toggle';
import {
  DEFAULT_AUDIO_SETTINGS,
  useAudioNotification,
} from '@/components/ristoratore/AudioNotificationProvider';

const ORDER_OPTIONS = [0, 5, 8, 15, 30, 60];
const BOOKING_OPTIONS = [0, 15, 30, 60, 120];

const label = (seconds: number) =>
  seconds === 0 ? 'Una sola volta' : `Ogni ${seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds} s`}`;

/**
 * Impostazioni degli avvisi sonori: ogni quanto si ripete il suono finché c'è qualcosa da
 * fare. Valgono per questo dispositivo (un tablet in cucina e un telefono in sala possono
 * averle diverse) e le cambia solo chi è dentro il pannello del ristorante.
 */
export default function AudioSettings() {
  const { audioSettings, setAudioSettings, playTestSound, isAudioEnabled, isMuted, setIsMuted, isBookingsMuted, setIsBookingsMuted } =
    useAudioNotification();
  const [open, setOpen] = useState(false);
  const onCount = (isMuted ? 0 : 1) + (isBookingsMuted ? 0 : 1);
  const statusTitle = `Ordini: ${isMuted ? 'suoni spenti' : 'suoni attivi'} · Prenotazioni: ${
    isBookingsMuted ? 'suoni spenti' : 'suoni attivi'
  }`;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const field = (
    title: string,
    value: number,
    options: number[],
    predefinito: number,
    onChange: (v: number) => void,
    kind: 'order' | 'booking'
  ) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-foreground">{title}</label>
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="min-w-0 flex-1 truncate pl-3 pr-8 py-2.5 text-sm bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {label(o)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => playTestSound(kind, 'first')}
          disabled={!isAudioEnabled}
          title={isAudioEnabled ? 'Prova il primo avviso (suono e voce)' : 'Attiva prima i suoni del pannello'}
          aria-label={`Prova il primo avviso: ${title}`}
          className="touch-target inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-foreground hover:bg-border transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Play size={15} />
        </button>
        <button
          type="button"
          onClick={() => playTestSound(kind, 'reminder')}
          disabled={!isAudioEnabled}
          title={isAudioEnabled ? 'Prova il promemoria (solo suono)' : 'Attiva prima i suoni del pannello'}
          aria-label={`Prova il promemoria: ${title}`}
          className="touch-target inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-foreground hover:bg-border transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Bell size={15} />
        </button>
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Suoni: ${statusTitle}`}
        title={statusTitle}
        onClick={() => setOpen((o) => !o)}
        className={`touch-target relative inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors cursor-pointer ${
          onCount === 2
            ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300'
            : onCount === 1
              ? 'bg-amber-500/15 text-amber-800 hover:bg-amber-500/25 dark:text-amber-300'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted'
        }`}
      >
        {onCount === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
        <span className="hidden sm:inline">{onCount === 2 ? 'Suoni' : onCount === 1 ? 'Suoni 1/2' : 'Suoni off'}</span>
        {onCount === 1 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 sm:hidden" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Impostazioni dei suoni"
          className="fixed inset-x-4 top-16 z-50 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-modal"
        >
          <div className="space-y-2.5">
            <p className="text-sm font-bold text-foreground">Suoni</p>
            {[
              { label: 'Nuovi ordini', on: !isMuted, set: (v: boolean) => setIsMuted(!v) },
              { label: 'Nuove prenotazioni', on: !isBookingsMuted, set: (v: boolean) => setIsBookingsMuted(!v) },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground">{row.label}</span>
                <Toggle checked={row.on} onChange={row.set} />
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-sm font-bold text-foreground">Promemoria dei suoni</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Il primo avviso ha la voce, poi si ripete solo il suono. Vale su questo dispositivo.
            </p>
          </div>
          {field(
            'Nuovi ordini',
            audioSettings.ordersEvery,
            ORDER_OPTIONS,
            DEFAULT_AUDIO_SETTINGS.ordersEvery,
            (v) => setAudioSettings({ ...audioSettings, ordersEvery: v }),
            'order'
          )}
          {field(
            'Nuove prenotazioni',
            audioSettings.bookingsEvery,
            BOOKING_OPTIONS,
            DEFAULT_AUDIO_SETTINGS.bookingsEvery,
            (v) => setAudioSettings({ ...audioSettings, bookingsEvery: v }),
            'booking'
          )}
          <button
            type="button"
            onClick={() => setAudioSettings(DEFAULT_AUDIO_SETTINGS)}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            Ripristina i valori predefiniti
          </button>
        </div>
      )}
    </div>
  );
}
