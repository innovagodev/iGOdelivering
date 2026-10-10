'use client';
import React, { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, Play } from 'lucide-react';
import {
  DEFAULT_AUDIO_SETTINGS,
  useAudioNotification,
} from '@/components/ristoratore/AudioNotificationProvider';

const ORDER_OPTIONS = [0, 5, 8, 15, 30, 60];
const BOOKING_OPTIONS = [0, 15, 30, 60, 120];

const label = (seconds: number, predefinito: number) =>
  seconds === 0
    ? 'Una sola volta'
    : `Ogni ${seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds} secondi`}${
        seconds === predefinito ? ' (predefinito)' : ''
      }`;

/**
 * Impostazioni degli avvisi sonori: ogni quanto si ripete il suono finché c'è qualcosa da
 * fare. Valgono per questo dispositivo (un tablet in cucina e un telefono in sala possono
 * averle diverse) e le cambia solo chi è dentro il pannello del ristorante.
 */
export default function AudioSettings() {
  const { audioSettings, setAudioSettings, playTestSound, isAudioEnabled } = useAudioNotification();
  const [open, setOpen] = useState(false);
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
          className="min-w-0 flex-1 px-3 py-2.5 text-sm bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {label(o, predefinito)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => playTestSound(kind)}
          disabled={!isAudioEnabled}
          title={isAudioEnabled ? 'Prova il suono' : 'Attiva prima i suoni del pannello'}
          aria-label={`Prova il suono: ${title}`}
          className="touch-target inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-foreground hover:bg-border transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Play size={15} />
        </button>
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Impostazioni dei suoni"
        title="Impostazioni dei suoni"
        onClick={() => setOpen((o) => !o)}
        className={`touch-target inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors cursor-pointer ${
          open ? 'bg-muted text-foreground' : 'bg-muted/60 text-foreground/80 hover:bg-muted'
        }`}
      >
        <SlidersHorizontal size={17} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Impostazioni dei suoni"
          className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] space-y-4 rounded-2xl border border-border bg-card p-4 shadow-modal"
        >
          <div>
            <p className="text-sm font-bold text-foreground">Ripetizione degli avvisi</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ogni quanto si ripete il suono finché c&apos;è qualcosa da accettare. Vale solo su questo
              dispositivo.
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
