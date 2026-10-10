'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Volume2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { fetchAllPages } from '@/lib/fetchAll';
import { STORAGE_KEYS } from '@/lib/storage-keys';

/** Ogni quanti secondi si ripete l'avviso finché c'è qualcosa da fare; 0 = una sola volta. */
export interface AudioSettings {
  ordersEvery: number;
  bookingsEvery: number;
}
export const DEFAULT_AUDIO_SETTINGS: AudioSettings = { ordersEvery: 8, bookingsEvery: 30 };
const AUDIO_SETTINGS_KEY = 'iGO_audio_settings';

interface AudioNotificationContextType {
  playAlert: () => void;
  isAudioEnabled: boolean;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  /** Le prenotazioni hanno il proprio interruttore, indipendente da quello degli ordini. */
  isBookingsMuted: boolean;
  setIsBookingsMuted: (muted: boolean) => void;
  /** Impostazioni del ristorante, valide su questo dispositivo. */
  audioSettings: AudioSettings;
  setAudioSettings: (settings: AudioSettings) => void;
  /** Fa sentire l'avviso scelto (anche con i suoni spenti), per provare volume e voce. */
  playTestSound: (kind: 'order' | 'booking') => void;
}

const AudioNotificationContext = createContext<AudioNotificationContextType | undefined>(undefined);

export function AudioNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || '';
  const [showPopup, setShowPopup] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBookingsMuted, setIsBookingsMuted] = useState(false);
  const [audioSettings, setAudioSettingsState] = useState<AudioSettings>(DEFAULT_AUDIO_SETTINGS);
  const [orders, setOrders] = useState<any[]>([]);
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Check if audio has already been authorized in this browser/device, and read muted preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authorized = localStorage.getItem('iGO_audio_enabled');
      const storedMuted = localStorage.getItem('iGO_audio_muted');
      
      if (storedMuted === 'true') {
        setIsMuted(true);
      }
      if (localStorage.getItem('iGO_audio_muted_bookings') === 'true') {
        setIsBookingsMuted(true);
      }
      try {
        const raw = JSON.parse(localStorage.getItem(AUDIO_SETTINGS_KEY) || 'null');
        const ok = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 600;
        if (raw && ok(raw.ordersEvery) && ok(raw.bookingsEvery)) {
          setAudioSettingsState({ ordersEvery: raw.ordersEvery, bookingsEvery: raw.bookingsEvery });
        }
      } catch {
        /* impostazioni non leggibili: restano quelle predefinite */
      }
      
      if (authorized === 'true') {
        setIsAudioEnabled(true);
      } else {
        // If not authorized and the user is logged in as a restaurateur, show popup
        if (restaurantId && restaurantId !== 'r-001') {
          setShowPopup(true);
        }
      }
    }
  }, [restaurantId]);

  // Request browser notification permissions on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Auto-resume AudioContext on first user interaction (browser autoplay policy workaround)
  // This ensures that even if the page loads in the background or on another panel (e.g. Dashboard),
  // the moment the user clicks or keys down anywhere on the screen, the AudioContext is resumed
  // and authorized to play sounds instantly when new orders arrive.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const resumeAudio = () => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }

      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().then(() => {
          console.log('AudioContext successfully initialized/resumed on user gesture.');
        }).catch((err) => {
          console.warn('Failed to resume AudioContext:', err);
        });
      }
    };

    window.addEventListener('click', resumeAudio);
    window.addEventListener('keydown', resumeAudio);
    window.addEventListener('touchstart', resumeAudio);

    return () => {
      window.removeEventListener('click', resumeAudio);
      window.removeEventListener('keydown', resumeAudio);
      window.removeEventListener('touchstart', resumeAudio);
    };
  }, []);

  // Throttle guard for playAlert (new-order events from Supabase)
  const lastPlayedTimeRef = useRef<number>(0);

  // Internal: play the alarm immediately, no throttle check.
  // Used by the repeat-alarm loop so it always fires at the right time.
  // Voci registrate ("Nuovo ordine!", "Nuova prenotazione!"): si caricano una volta e si
  // riproducono con lo stesso AudioContext già autorizzato dal clic. Se un file non si
  // carica, suona il segnale a toni di prima.
  const clipCacheRef = useRef<Record<string, AudioBuffer | null>>({});
  const getContext = (): AudioContext | null => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContextClass();
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  };
  const loadClip = async (url: string): Promise<AudioBuffer | null> => {
    const cache = clipCacheRef.current;
    if (url in cache) return cache[url];
    try {
      const ctx = getContext();
      if (!ctx) throw new Error('AudioContext non disponibile');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      cache[url] = await ctx.decodeAudioData(await res.arrayBuffer());
    } catch (e) {
      console.warn('Audio non caricato, uso il segnale a toni:', url, e);
      cache[url] = null;
    }
    return cache[url];
  };
  // Uscita comune con compressore e guadagno: alza il livello della voce, che da sola è più
  // bassa di un allarme, senza distorcere. Il volume massimo resta quello del dispositivo.
  const masterRef = useRef<AudioNode | null>(null);
  const getMaster = (ctx: AudioContext): AudioNode => {
    if (!masterRef.current) {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.knee.value = 12;
      comp.ratio.value = 8;
      comp.attack.value = 0.003;
      comp.release.value = 0.2;
      const gain = ctx.createGain();
      gain.gain.value = 1.5;
      // Limitatore in coda: i picchi non superano il fondo scala (niente distorsione).
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -3;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.08;
      const trim = ctx.createGain();
      trim.gain.value = 0.9;
      comp.connect(gain);
      gain.connect(limiter);
      limiter.connect(trim);
      trim.connect(ctx.destination);
      masterRef.current = comp;
    }
    return masterRef.current;
  };

  // Campanella brillante: fondamentale e due armoniche, attacco netto, caduta rapida.
  const bell = (ctx: AudioContext, out: AudioNode, freq: number, at: number, decay: number, peak: number) => {
    [
      [1, 1],
      [2.76, 0.5],
      [5.4, 0.25],
    ].forEach(([ratio, amp]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * ratio;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(peak * amp, at + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, at + decay);
      osc.connect(g);
      g.connect(out);
      osc.start(at);
      osc.stop(at + decay + 0.05);
    });
  };

  // "Din" iniziale, diverso per i due avvisi, poi la voce:
  //  ordine        → doppio din acuto e rapido (più urgente)
  //  prenotazione  → un solo din più pieno (meno incalzante)
  const playClip = async (url: string, kind: 'order' | 'booking', fallback: () => void) => {
    const buffer = await loadClip(url);
    const ctx = getContext();
    if (!buffer || !ctx) {
      fallback();
      return;
    }
    const out = getMaster(ctx);
    const t0 = ctx.currentTime + 0.03;
    let voiceAt: number;
    if (kind === 'order') {
      bell(ctx, out, 1318.5, t0, 0.55, 0.9);
      bell(ctx, out, 1568, t0 + 0.17, 0.7, 0.9);
      voiceAt = t0 + 0.6;
    } else {
      bell(ctx, out, 659.25, t0, 1.0, 0.7);
      bell(ctx, out, 987.77, t0, 1.0, 0.55);
      voiceAt = t0 + 0.7;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(out);
    source.start(voiceAt);
  };
  // Precarica le voci appena l'audio è attivo, così il primo avviso non arriva in ritardo.
  useEffect(() => {
    if (!isAudioEnabled) return;
    void loadClip('/sounds/nuovo-ordine.mp3');
    void loadClip('/sounds/nuova-prenotazione.mp3');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAudioEnabled]);

  const playNow = () => {
    if (isMuted || !isAudioEnabled) return;
    void playClip('/sounds/nuovo-ordine.mp3', 'order', playOrderTones);
  };

  // Segnale a toni degli ordini (ripiego).
  const playOrderTones = () => {
    if (isMuted || !isAudioEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const volume = 0.95; // Loud
      const duration = 0.45; // duration of each tone

      const playBeep = (freq: number, startTime: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'triangle'; // triangle wave is louder/richer than sine, perfect for alarms
        osc.frequency.value = freq;

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.05);
        gainNode.gain.setValueAtTime(volume, startTime + duration - 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      // Play a double two-tone siren (a sequence that sounds like a distinct alarm)
      // Beep 1 (high): 880Hz, starts at 0s
      // Beep 2 (low):  660Hz, starts at 0.5s
      // Beep 3 (high): 880Hz, starts at 1.0s
      // Beep 4 (low):  660Hz, starts at 1.5s
      // Total duration of sound: ~2 seconds
      playBeep(880, ctx.currentTime);
      playBeep(660, ctx.currentTime + 0.5);
      playBeep(880, ctx.currentTime + 1.0);
      playBeep(660, ctx.currentTime + 1.5);
    } catch (e) {
      console.error('Audio playback failed:', e);
    }
  };


  const playAlert = () => {
    const now = Date.now();
    // Throttle: prevent overlapping plays within 5 seconds
    if (now - lastPlayedTimeRef.current < 5000) {
      return;
    }
    lastPlayedTimeRef.current = now;
    playNow();
  };

  const handleSetIsMuted = (muted: boolean) => {
    setIsMuted(muted);
    if (typeof window !== 'undefined') {
      localStorage.setItem('iGO_audio_muted', muted ? 'true' : 'false');
    }
  };

  const handleSetAudioSettings = (next: AudioSettings) => {
    setAudioSettingsState(next);
    try {
      localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(next));
    } catch {
      /* storage non disponibile */
    }
  };

  const playTestSound = (kind: 'order' | 'booking') => {
    if (kind === 'order') void playClip('/sounds/nuovo-ordine.mp3', 'order', playOrderTones);
    else void playClip('/sounds/nuova-prenotazione.mp3', 'booking', playBookingChime);
  };

  const handleSetIsBookingsMuted = (muted: boolean) => {
    setIsBookingsMuted(muted);
    if (typeof window !== 'undefined') {
      localStorage.setItem('iGO_audio_muted_bookings', muted ? 'true' : 'false');
    }
  };

  // Handle custom event trigger
  useEffect(() => {
    const handleEvent = () => {
      playAlert();
    };
    window.addEventListener('iGO_play_order_alert', handleEvent);
    return () => {
      window.removeEventListener('iGO_play_order_alert', handleEvent);
    };
  }, [isMuted]); // Re-bind on isMuted changes so playAlert has the current value

  // Calculate unaccepted orders dynamically.
  // NOTE: 'expired' orders are intentionally excluded — they can no longer be accepted,
  // so ringing the alarm for them serves no purpose and would be annoying.
  const unacceptedOrders = orders.filter(
    (o) => o.status === 'new' || o.status === 'pending'
  );
  const hasUnaccepted = unacceptedOrders.length > 0;

  // Ripete l'avviso (di norma ogni 8 secondi) finché ci sono ordini da accettare.
  // Uses playNow() directly (no throttle) so it always fires immediately on mount
  // and at exact 8-second intervals, regardless of when playAlert() was last called.
  useEffect(() => {
    if (!restaurantId || restaurantId === 'r-001' || !isAudioEnabled || isMuted || !hasUnaccepted) {
      return;
    }

    // Play once immediately (bypass throttle)
    playNow();
    // Reset throttle reference so a manual playAlert() call works correctly afterwards
    lastPlayedTimeRef.current = Date.now();

    // Ripetizione scelta dal ristorante (0 = una sola volta, già suonata sopra).
    if (audioSettings.ordersEvery <= 0) return;
    const interval = setInterval(() => {
      if (!isMuted) playNow();
    }, audioSettings.ordersEvery * 1000);

    return () => {
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnaccepted, restaurantId, isAudioEnabled, isMuted, audioSettings.ordersEvery]);

  // Background realtime Supabase subscription
  useEffect(() => {
    if (!restaurantId || restaurantId === 'r-001') return;

    // Reset ref state on restaurantId change
    seenOrderIdsRef.current = new Set();
    isFirstLoadRef.current = true;

    // Fetch initial order list to populate seenOrderIds and initialize localStorage
    const fetchInitial = async () => {
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const isoString = sevenDaysAgo.toISOString();

        const data = await fetchAllPages((from, to) =>
          supabase
            .from('orders')
            .select('id, status, created_at, total, order_number')
            .eq('restaurant_id', restaurantId)
            .gte('created_at', isoString)
            .order('created_at', { ascending: false })
            .order('id', { ascending: true })
            .range(from, to)
        );

        if (data) {
          // Un ordine in attesa di pagamento online non si segna come visto:
          // deve far suonare l'allarme quando il pagamento lo porta a 'new'.
          data.forEach((o: any) => {
            if (o.status !== 'awaiting_payment') seenOrderIdsRef.current.add(o.id);
          });
          localStorage.setItem(STORAGE_KEYS.orders(restaurantId), JSON.stringify(data));
          window.dispatchEvent(new CustomEvent('iGO_orders_updated'));
          setOrders(data);
        }
      } catch (e) {
        console.error('Error fetching initial orders for audio provider:', e);
      } finally {
        isFirstLoadRef.current = false;
      }
    };

    fetchInitial();

    // Rilettura in background per tenere allineati badge e pannelli. Il suono non
    // aspetta questa lettura (parte subito dall'evento); gli eventi ravvicinati
    // si raggruppano in una sola rilettura.
    const refetchRecent = async () => {
      // Re-fetch orders in background to keep badge and kanban/others synced (only recent ones)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const isoString = sevenDaysAgo.toISOString();

      const data = await fetchAllPages((from, to) =>
        supabase
          .from('orders')
          .select('id, status, created_at, total, order_number')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', isoString)
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to)
      );

      if (data) {
        let hasNew = false;

        data.forEach((o: any) => {
          // Only alert for NEW or PENDING orders that we haven't seen yet
          if (
            (o.status === 'new' || o.status === 'pending') &&
            !seenOrderIdsRef.current.has(o.id)
          ) {
            seenOrderIdsRef.current.add(o.id);
            hasNew = true;
          } else if (!seenOrderIdsRef.current.has(o.id) && o.status !== 'awaiting_payment') {
            // If it's a past order in another status, just mark as seen.
            // Gli ordini in attesa di pagamento restano "non visti" finché
            // il webhook non li porta in cucina.
            seenOrderIdsRef.current.add(o.id);
          }
        });

        // Write to localStorage to update sidebar badge
        localStorage.setItem(STORAGE_KEYS.orders(restaurantId), JSON.stringify(data));
        window.dispatchEvent(new CustomEvent('iGO_orders_updated'));
        setOrders(data);

        if (hasNew) {
          playAlert();
        }
      }
    };
    let refetchTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (refetchTimer) return;
      refetchTimer = setTimeout(() => {
        refetchTimer = null;
        void refetchRecent().catch((e) => console.error('Error refetching orders:', e));
      }, 800);
    };

    // Subscribe to Postgres changes on the orders table for this restaurant
    const channel = supabase
      .channel(`orders-audio:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          const newRecord = payload.new as any;
          const isInsert = payload.eventType === 'INSERT';
          const isUpdate = payload.eventType === 'UPDATE';

          // ─── INSTANT PLAYBACK (Zero Latency) ──────────────────────────────────
          // If the replication event contains a new or pending order, play the
          // alarm immediately. Do not wait for the async fetch query to finish.
          if (newRecord && (isInsert || isUpdate)) {
            const status = newRecord.status;
            const orderId = newRecord.id;

            if (
              (status === 'new' || status === 'pending') &&
              orderId &&
              !seenOrderIdsRef.current.has(orderId)
            ) {
              seenOrderIdsRef.current.add(orderId);
              playAlert();

              // Trigger OS/Browser push notification immediately
              if (
                typeof window !== 'undefined' &&
                'Notification' in window &&
                Notification.permission === 'granted'
              ) {
                new Notification('Nuovo Ordine Ricevuto!', {
                  body: `Ordine #${newRecord.order_number || orderId.replace('ord-', '').toUpperCase()} - € ${(newRecord.total || 0).toFixed(2)}`,
                  icon: '/favicon.ico',
                });
              }
            }
          }

          scheduleRefetch();
        }
      )
      .subscribe();

    return () => {
      if (refetchTimer) clearTimeout(refetchTimer);
      supabase.removeChannel(channel);
    };
  }, [restaurantId]); // NOTE: isMuted intentionally excluded — toggling mute must NOT tear down and
  // recreate the Supabase channel, which would risk missing order events during reconnect.
  // isMuted is read via closure at playAlert() call time, which is sufficient.

  // ─── Prenotazioni: badge, suono e aggiornamento in tempo reale ──────────────
  // Il suono è diverso da quello degli ordini (tre note che salgono, più morbide della
  // sirena a due toni), così il ristoratore capisce a orecchio che cosa è arrivato.
  const audioStateRef = useRef({ isBookingsMuted, isAudioEnabled });
  audioStateRef.current = { isBookingsMuted, isAudioEnabled };
  const [pendingBookings, setPendingBookings] = useState<{ id: string; accept_deadline: string | null }[]>([]);
  const [bookingTick, setBookingTick] = useState(0);
  const seenBookingIdsRef = useRef<Set<string>>(new Set());
  const lastBookingPlayedRef = useRef(0);

  const playBookingNow = () => {
    const { isBookingsMuted: muted, isAudioEnabled: enabled } = audioStateRef.current;
    if (muted || !enabled) return;
    void playClip('/sounds/nuova-prenotazione.mp3', 'booking', playBookingChime);
  };

  // Campanello a tre note delle prenotazioni (ripiego).
  const playBookingChime = () => {
    const { isBookingsMuted: muted, isAudioEnabled: enabled } = audioStateRef.current;
    if (muted || !enabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContextClass();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const note = (freq: number, at: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.7, at + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, at + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(at);
        osc.stop(at + 0.6);
      };
      // Do-mi-sol: un campanello, non un allarme.
      note(523.25, ctx.currentTime);
      note(659.25, ctx.currentTime + 0.18);
      note(783.99, ctx.currentTime + 0.36);
    } catch (e) {
      console.error('Booking sound failed:', e);
    }
  };

  const playBookingAlert = () => {
    const now = Date.now();
    if (now - lastBookingPlayedRef.current < 3000) return;
    lastBookingPlayedRef.current = now;
    playBookingNow();
  };

  // Una prenotazione con la scadenza passata non si può più confermare: non conta e non suona.
  const livePendingBookings = pendingBookings.filter(
    (b) => !b.accept_deadline || new Date(b.accept_deadline).getTime() > Date.now()
  );
  const livePendingCount = livePendingBookings.length;
  void bookingTick;

  // Scadenze: si rivaluta ogni 15 secondi senza rileggere il database.
  useEffect(() => {
    if (!restaurantId || restaurantId === 'r-001') return;
    const id = setInterval(() => setBookingTick((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, [restaurantId]);

  // Il numero per la sidebar.
  useEffect(() => {
    if (!restaurantId || restaurantId === 'r-001') return;
    try {
      localStorage.setItem(STORAGE_KEYS.pendingBookings(restaurantId), String(livePendingCount));
    } catch {
      /* storage non disponibile */
    }
    window.dispatchEvent(new CustomEvent('iGO_bookings_count'));
  }, [restaurantId, livePendingCount]);

  // Finché ce ne sono in attesa il campanello si ripete, con calma.
  useEffect(() => {
    if (!restaurantId || restaurantId === 'r-001' || !isAudioEnabled || isBookingsMuted || livePendingCount === 0) return;
    if (audioSettings.bookingsEvery <= 0) return;
    const id = setInterval(() => playBookingNow(), audioSettings.bookingsEvery * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, isAudioEnabled, isBookingsMuted, livePendingCount > 0, audioSettings.bookingsEvery]);

  useEffect(() => {
    if (!restaurantId || restaurantId === 'r-001') return;
    seenBookingIdsRef.current = new Set();

    const readPending = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, accept_deadline')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'pending');
      if (error || !data) return null;
      return data as { id: string; accept_deadline: string | null }[];
    };

    // Lettura iniziale: quelle già in attesa non suonano all'apertura della pagina.
    readPending().then((data) => {
      if (!data) return;
      data.forEach((b) => seenBookingIdsRef.current.add(b.id));
      setPendingBookings(data);
    });

    // Raggruppa gli eventi ravvicinati in una sola rilettura e avvisa la pagina Prenotazioni.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (timer) return;
      timer = setTimeout(async () => {
        timer = null;
        const data = await readPending();
        if (data) setPendingBookings(data);
        window.dispatchEvent(new CustomEvent('iGO_bookings_changed'));
      }, 600);
    };

    const channel = supabase
      .channel(`bookings-audio:${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          const rec = payload.new as any;
          if (rec && rec.status === 'pending' && rec.id && !seenBookingIdsRef.current.has(rec.id)) {
            seenBookingIdsRef.current.add(rec.id);
            playBookingAlert();
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification('Nuova prenotazione!', {
                  body: `${rec.guests || ''} persone · ${rec.date || ''} ${String(rec.time || '').slice(0, 5)}`,
                  icon: '/favicon.ico',
                });
              } catch {
                /* alcuni browser mobili non permettono Notification() qui */
              }
            }
          }
          scheduleRefetch();
        }
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const handleEnableAudio = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass();
        }
        audioCtxRef.current.resume().then(() => {
          // Play confirmation chime
          playAlert();
          localStorage.setItem('iGO_audio_enabled', 'true');
          setIsAudioEnabled(true);
          setShowPopup(false);
        });
      }
    } catch (e) {
      console.error('Failed to initialize AudioContext on user action:', e);
    }
  };

  return (
    <AudioNotificationContext.Provider value={{
        playAlert,
        isAudioEnabled,
        isMuted,
        setIsMuted: handleSetIsMuted,
        isBookingsMuted,
        setIsBookingsMuted: handleSetIsBookingsMuted,
        audioSettings,
        setAudioSettings: handleSetAudioSettings,
        playTestSound,
      }}>
      {children}

      {showPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl max-w-sm w-full p-6 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-center">
              <Volume2 className="text-primary h-12 w-12 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground">Attiva Notifiche Sonore</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Abilita il segnale acustico per non perdere nessun nuovo ordine. Clicca sul pulsante qui sotto per autorizzare il browser.
              </p>
            </div>
            <button
              onClick={handleEnableAudio}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Attiva ed Esegui Test
            </button>
          </div>
        </div>
      )}
    </AudioNotificationContext.Provider>
  );
}

export function useAudioNotification() {
  const context = useContext(AudioNotificationContext);
  if (!context) {
    throw new Error('useAudioNotification must be used within an AudioNotificationProvider');
  }
  return context;
}
