'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Volume2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { STORAGE_KEYS } from '@/lib/storage-keys';

interface AudioNotificationContextType {
  playAlert: () => void;
  isAudioEnabled: boolean;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
}

const AudioNotificationContext = createContext<AudioNotificationContextType | undefined>(undefined);

export function AudioNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || '';
  const [showPopup, setShowPopup] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
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

  // Audio queue logic for sequential alerts
  const queueRef = useRef<number[]>([]);
  const isPlayingRef = useRef(false);
  const lastPlayedTimeRef = useRef<number>(0);

  const playLoudLongAlarm = () => {
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

  const processQueue = async () => {
    if (isPlayingRef.current || queueRef.current.length === 0) return;
    isPlayingRef.current = true;
    while (queueRef.current.length > 0) {
      queueRef.current.shift();
      playLoudLongAlarm();
      // Since the alarm lasts ~2 seconds, wait 2.5 seconds before playing another queued alert
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    isPlayingRef.current = false;
  };

  const playAlert = () => {
    const now = Date.now();
    // Throttle calls to playAlert to prevent overlapping plays (5 second cooldown)
    if (now - lastPlayedTimeRef.current < 5000) {
      return;
    }
    lastPlayedTimeRef.current = now;
    queueRef.current.push(now);
    processQueue();
  };

  const handleSetIsMuted = (muted: boolean) => {
    setIsMuted(muted);
    if (typeof window !== 'undefined') {
      localStorage.setItem('iGO_audio_muted', muted ? 'true' : 'false');
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

  // Repeat alarm every 10 seconds if there are unaccepted orders
  useEffect(() => {
    if (!restaurantId || restaurantId === 'r-001' || !isAudioEnabled || isMuted || !hasUnaccepted) {
      return;
    }

    // Play once immediately
    playAlert();

    // Set interval to play every 10 seconds (10000ms)
    const interval = setInterval(() => {
      playAlert();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [hasUnaccepted, restaurantId, isAudioEnabled, isMuted]);

  // Background realtime Supabase subscription
  useEffect(() => {
    if (!restaurantId || restaurantId === 'r-001') return;

    // Reset ref state on restaurantId change
    seenOrderIdsRef.current = new Set();
    isFirstLoadRef.current = true;

    // Fetch initial order list to populate seenOrderIds and initialize localStorage
    const fetchInitial = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id, status, created_at, total, order_number')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false });

        if (data) {
          data.forEach((o: any) => seenOrderIdsRef.current.add(o.id));
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

          // Re-fetch all orders in background to keep badge and kanban/others synced
          const { data, error } = await supabase
            .from('orders')
            .select('id, status, created_at, total, order_number')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false });

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
              } else if (!seenOrderIdsRef.current.has(o.id)) {
                // If it's a past order in another status, just mark as seen
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]); // NOTE: isMuted intentionally excluded — toggling mute must NOT tear down and
  // recreate the Supabase channel, which would risk missing order events during reconnect.
  // isMuted is read via closure at playAlert() call time, which is sufficient.

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
    <AudioNotificationContext.Provider value={{ playAlert, isAudioEnabled, isMuted, setIsMuted: handleSetIsMuted }}>
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
