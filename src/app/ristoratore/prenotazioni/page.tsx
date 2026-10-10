'use client';
import React, { useState, useEffect } from 'react';
import PageTopbar from '@/components/layout/PageTopbar';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import FilterPills from '@/components/ui/FilterPills';
import AudioSettings from '@/components/ristoratore/AudioSettings';
import { useAudioNotification } from '@/components/ristoratore/AudioNotificationProvider';
import { useAuth } from '@/context/AuthContext';
import { TableBooking } from '@/types';
import { supabase } from '@/lib/supabase';
import { fetchAllPages } from '@/lib/fetchAll';
import { phoneDigits } from '@/lib/fields';
import { zonedToUtc } from '@/lib/serviceHours';
import {
  Plus,
  Phone,
  Mail,
  Clock,
  Trash2,
  Check,
  X,
  Users,
  MessageSquare,
  AlertCircle,
  Store,
  Search,
  Download,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { notify, confirmAction } from '@/lib/notify';

export default function PrenotazioniPage() {
  const { user, isLoading } = useAuth();
  const restaurantId = user?.restaurantId || '';

  const [bookings, setBookings] = useState<TableBooking[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [dateFilterType, setDateFilterType] = useState<
    'all' | 'today' | 'tomorrow' | 'next7' | 'custom'
  >('all');

  // ─── Vista: "Da oggi in poi" (si lavora qui) e "Storico" (si consulta) ─────────
  const dateOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [view, setView] = useState<'upcoming' | 'history'>('upcoming');
  const [showClosed, setShowClosed] = useState(false);
  const [search, setSearch] = useState('');
  const [histFrom, setHistFrom] = useState(() => dateOffset(-30));
  const [histTo, setHistTo] = useState(() => dateOffset(-1));
  const [histStatus, setHistStatus] = useState<'all' | 'confirmed' | 'cancelled'>('all');
  // Da quale giorno si leggono le prenotazioni: 30 giorni indietro, di più se lo Storico lo chiede.
  const [since, setSince] = useState(() => dateOffset(-30));
  const { isBookingsMuted, setIsBookingsMuted } = useAudioNotification();

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [showModal, setShowModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<TableBooking | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

  const isEmailValid = React.useMemo(() => {
    if (!email) return true; // optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, [email]);
  const [guests, setGuests] = useState(2);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('20:00');
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'cancelled'>('pending');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);

  // ─── Capienza (C9, migration 022) ─────────────────────────────────────────
  // NULL = nessun limite automatico: ogni richiesta resta da confermare a mano.
  const [capacity, setCapacity] = useState<number | null>(null);
  const [slotMinutes, setSlotMinutes] = useState(90);
  const [capacityInput, setCapacityInput] = useState('');
  const [slotInput, setSlotInput] = useState(90);
  const [capacitySaving, setCapacitySaving] = useState(false);
  const [capacityMessage, setCapacityMessage] = useState<string | null>(null);

  const fetchCapacity = async () => {
    if (!restaurantId || restaurantId === 'r-001') return;
    const { data, error } = await supabase
      .from('restaurants')
      .select('booking_capacity, booking_slot_minutes')
      .eq('id', restaurantId)
      .maybeSingle();
    if (error) {
      console.error('Error fetching booking capacity:', error.message);
      return;
    }
    // data null con error null = riga non visibile: non è "capienza assente".
    if (!data) return;
    setCapacity(data.booking_capacity ?? null);
    setSlotMinutes(data.booking_slot_minutes ?? 90);
    setCapacityInput(data.booking_capacity ? String(data.booking_capacity) : '');
    setSlotInput(data.booking_slot_minutes ?? 90);
  };

  const saveCapacity = async () => {
    const trimmed = capacityInput.trim();
    const value = trimmed === '' ? null : Number(trimmed);
    if (value !== null && (!Number.isInteger(value) || value < 1)) {
      setCapacityMessage('Inserisci un numero intero di coperti, oppure lascia vuoto.');
      return;
    }
    setCapacitySaving(true);
    setCapacityMessage(null);
    const { data, error } = await supabase
      .from('restaurants')
      .update({ booking_capacity: value, booking_slot_minutes: slotInput })
      .eq('id', restaurantId)
      .select('booking_capacity, booking_slot_minutes');
    setCapacitySaving(false);
    // .select() distingue "salvato" da "nessuna riga aggiornata", che RLS
    // restituirebbe senza errore.
    if (error || !data || data.length === 0) {
      console.error('Error saving booking capacity:', error?.message ?? 'nessuna riga aggiornata');
      setCapacityMessage('Salvataggio non riuscito. Riprova.');
      return;
    }
    setCapacity(data[0].booking_capacity ?? null);
    setSlotMinutes(data[0].booking_slot_minutes ?? 90);
    setCapacityMessage('Salvato.');
  };

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  /**
   * Picco di coperti occupati nella fascia [time, time + turno) del giorno.
   * Stessa regola di booking_peak_covers nel database: contano le richieste
   * in attesa e quelle confermate, e il picco si valuta all'inizio della
   * fascia e all'inizio di ogni prenotazione che vi cade dentro.
   */
  const peakCovers = (date: string, time: string) => {
    const start = toMinutes(time);
    const relevant = bookings
      .filter(
        (b) =>
          b.date === date &&
          (b.status === 'pending' || b.status === 'confirmed') &&
          Math.abs(toMinutes(b.time) - start) < slotMinutes
      )
      .map((b) => ({ m: toMinutes(b.time), guests: b.guests }));
    const points = [
      start,
      ...relevant.map((r) => r.m).filter((m) => m > start && m < start + slotMinutes),
    ];
    return Math.max(
      0,
      ...points.map((c) =>
        relevant.filter((r) => r.m <= c && c < r.m + slotMinutes).reduce((s, r) => s + r.guests, 0)
      )
    );
  };

  // Prenotazioni non confermate entro la scadenza: le fa scadere il server
  // (cron, apertura di una pagina di tracking, questa chiamata). Qui si controlla
  // ogni 15 secondi e si ricarica l'elenco quando serve.
  useEffect(() => {
    const check = setInterval(async () => {
      const due = bookings.some(
        (b) =>
          b.status === 'pending' &&
          b.acceptDeadline &&
          Date.now() >= new Date(b.acceptDeadline).getTime()
      );
      if (!due) return;
      try {
        await fetch('/api/order/expire-due', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        fetchBookings();
      } catch (e) {
        console.error('[prenotazioni] expire-due:', e);
      }
    }, 15000);
    return () => clearInterval(check);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings]);

  const fetchBookings = async () => {
    if (!restaurantId || restaurantId === 'r-001') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Limit fetching to bookings starting from 30 days ago to keep query latency low
      const dateStr = since;

      // A pagine: oltre 1000 prenotazioni da 30 giorni fa in avanti verrebbero
      // tagliate in silenzio.
      const data = await fetchAllPages((from, to) =>
        supabase
          .from('bookings')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .gte('date', dateStr)
          .order('date', { ascending: true })
          .order('time', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to)
      );

      const mapped: TableBooking[] = data.map((b: any) => ({
        id: b.id,
        restaurantId: b.restaurant_id,
        name: b.name,
        phone: b.phone,
        email: b.email || undefined,
        guests: b.guests,
        date: b.date,
        time: b.time ? b.time.slice(0, 5) : '',
        // 'expired' (nessuna risposta in tempo) si tratta come cancellata ma
        // si distingue nell'etichetta: si può comunque ripristinare.
        status: b.status === 'expired' ? 'cancelled' : b.status,
        expired: b.status === 'expired',
        acceptDeadline: b.accept_deadline || undefined,
        notes: b.notes || undefined,
        createdAt: b.created_at,
        preOrderItems: b.pre_order_items || undefined,
        preOrderTotal: b.pre_order_total ? parseFloat(b.pre_order_total) : undefined,
        linkedOrderId: b.linked_order_id || undefined,
      }));

      setBookings(mapped);
    } catch (e) {
      console.error('Error fetching bookings from Supabase:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchCapacity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, since]);

  // Lo Storico può chiedere un periodo più lungo dei 30 giorni letti di default.
  useEffect(() => {
    if (histFrom && histFrom < since) setSince(histFrom);
  }, [histFrom, since]);

  // Tempo reale: il provider audio (ristoratore/layout) ascolta le prenotazioni e avvisa qui
  // quando ne arriva una o ne cambia lo stato, così l'elenco non richiede il refresh a mano.
  useEffect(() => {
    if (!restaurantId || restaurantId === 'r-001') return;
    const onChanged = () => fetchBookings();
    window.addEventListener('iGO_bookings_changed', onChanged);
    return () => window.removeEventListener('iGO_bookings_changed', onChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const handleOpenAddModal = () => {
    setEditingBooking(null);
    setName('');
    setPhone('');
    setEmail('');
    setEmailTouched(false);
    setGuests(2);
    // Set tomorrow date by default
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);
    setTime('20:00');
    setStatus('confirmed');
    setNotes('');
    setShowModal(true);
  };

  const handleOpenEditModal = (booking: TableBooking) => {
    setEditingBooking(booking);
    setName(booking.name);
    setPhone(booking.phone);
    setEmail(booking.email || '');
    setEmailTouched(false);
    setGuests(booking.guests);
    setDate(booking.date);
    setTime(booking.time);
    setStatus(booking.status);
    setNotes(booking.notes || '');
    setShowModal(true);
  };

  // Avvisa il cliente per email (non ci sono SMS). Il server non invia nulla se la
  // prenotazione non ha un indirizzo: in quel caso il ristoratore lo sa e richiama.
  const sendBookingEmail = async (
    id: string,
    event: 'confirmed' | 'modified' | 'cancelled',
    quietIfNoEmail = false
  ) => {
    try {
      const res = await fetch('/api/booking/send-status-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id, event }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'invio non riuscito');
      if (data.skipped === 'no_email') {
        if (!quietIfNoEmail) notify.info('Prenotazione senza email: avvisa il cliente al telefono.');
        return;
      }
      notify.success('Email inviata al cliente.');
    } catch (e) {
      console.error('[prenotazioni] email al cliente:', e);
      notify.error("Prenotazione aggiornata, ma l'email al cliente non è partita.");
    }
  };

  // Una conferma alla volta per prenotazione: un doppio clic non deve creare due ordini.
  const updatingRef = React.useRef<Set<string>>(new Set());

  const handleUpdateStatus = async (
    id: string,
    newStatus: 'pending' | 'confirmed' | 'cancelled'
  ) => {
    const targetBooking = bookings.find((b) => b.id === id);
    if (!targetBooking) return;
    if (updatingRef.current.has(id)) return;
    updatingRef.current.add(id);
    // Un'altra scheda del pannello potrebbe aver già creato l'ordine: si rilegge dal database.
    if (newStatus === 'confirmed' && !targetBooking.linkedOrderId) {
      const { data: fresh } = await supabase
        .from('bookings')
        .select('linked_order_id')
        .eq('id', id)
        .maybeSingle();
      if (fresh?.linked_order_id) targetBooking.linkedOrderId = fresh.linked_order_id;
    }

    let updatedLinkedOrderId = targetBooking.linkedOrderId;

    try {
      if (
        newStatus === 'confirmed' &&
        targetBooking.preOrderItems &&
        targetBooking.preOrderItems.length > 0 &&
        !targetBooking.linkedOrderId
      ) {
        const calculatedTotal =
          targetBooking.preOrderTotal ||
          targetBooking.preOrderItems.reduce(
            (acc: number, item: any) => acc + (item.price || 0) * (item.qty || 1),
            0
          );

        // 1. Numero d'ordine assegnato dal database, come nel checkout della
        // vetrina. L'ordine nasce da una prenotazione al tavolo, quindi il
        // tipo è 'tavolo'; `bookings` non ha una colonna per il numero del
        // tavolo, perciò p_table_number viene omesso e il prefisso risulta
        // TAV senza cifra.
        const { data: generatedNumber, error: numberError } = await supabase.rpc(
          'generate_order_number',
          { p_restaurant_id: restaurantId, p_order_type: 'tavolo' }
        );

        if (numberError || !generatedNumber) {
          console.error('Error generating order number:', numberError);
          notify.error('Impossibile creare l’ordine, riprova.');
          return;
        }

        // 2. Create order in Supabase
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            restaurant_id: restaurantId,
            order_number: generatedNumber,
            type: 'tavolo',
            status: 'preparing', // "accettato" in cucina: il ristorante l'ha già accettato confermando
            // L'orario della prenotazione: la cucina sa per quando è l'ordine.
            scheduled_at: zonedToUtc(targetBooking.date, toMinutes(targetBooking.time)).toISOString(),
            customer_name: targetBooking.name,
            customer_email: targetBooking.email || null,
            customer_phone: targetBooking.phone,
            subtotal: calculatedTotal,
            total: calculatedTotal,
            notes: targetBooking.notes || '',
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // 3. Create order items
        if (orderData && targetBooking.preOrderItems) {
          const itemsPayload = targetBooking.preOrderItems.map((item: any) => ({
            order_id: orderData.id,
            // Solo un vero identificativo di piatto: altrimenti (id di prova o vecchi formati) l'inserimento falliva.
            menu_item_id:
              typeof item.id === 'string' &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)
                ? item.id
                : null,
            name: item.name,
            price: item.price,
            qty: item.qty || 1,
            note: item.note || null,
            added_ingredients: item.addedIngredients || [],
            removed_ingredients: item.removedIngredients || [],
            selected_options: item.selectedOptions || [],
          }));
          const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
          if (itemsError) {
            // Niente ordini vuoti in cucina: si toglie quello appena creato (o si annulla se non si può togliere).
            const { error: delError } = await supabase.from('orders').delete().eq('id', orderData.id);
            if (delError) await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderData.id);
            throw itemsError;
          }
        }

        updatedLinkedOrderId = orderData.id;
      } else if (newStatus === 'cancelled' && targetBooking.linkedOrderId) {
        // Cancel linked order in Supabase
        await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', targetBooking.linkedOrderId);
      }

      // Update booking status in Supabase
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus, linked_order_id: updatedLinkedOrderId })
        .eq('id', id);

      if (error) throw error;

      // Il cliente sa com'è andata: confermata (con ordine e tracker se c'è il pre-ordine) o annullata.
      if (newStatus !== 'pending') await sendBookingEmail(id, newStatus);

      // Refetch bookings to update state
      await fetchBookings();
    } catch (e) {
      console.error('Error updating booking status:', e);
      const detail = (e as any)?.message ? ` (${String((e as any).message).slice(0, 120)})` : '';
      notify.error(`Errore nel cambiare lo stato della prenotazione.${detail}`);
    } finally {
      updatingRef.current.delete(id);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    const ok = await confirmAction({
      title: 'Eliminare la prenotazione?',
      message: 'La prenotazione verrà rimossa definitivamente.',
      confirmLabel: 'Elimina',
      destructive: true,
    });
    if (ok) {
      try {
        const { error } = await supabase.from('bookings').delete().eq('id', id);

        if (error) throw error;
        await fetchBookings();
      } catch (e) {
        console.error('Error deleting booking:', e);
        notify.error("Errore nell'eliminazione della prenotazione.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !date || !time) return;

    try {
      const bookingPayload = {
        restaurant_id: restaurantId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        guests: Number(guests) || 2,
        date: date,
        time: time.length === 5 ? `${time}:00` : time,
        status: status,
        notes: notes.trim() || null,
      };

      if (editingBooking) {
        const newTime = time.slice(0, 5);
        const changedDetails =
          date !== editingBooking.date ||
          newTime !== editingBooking.time ||
          (Number(guests) || 2) !== editingBooking.guests;
        const statusChanged = status !== editingBooking.status;
        // Lo stato lo cambia handleUpdateStatus (crea l'ordine del pre-ordine e avvisa il
        // cliente): qui si salvano solo i dati, con lo stato com'era.
        const { status: _ignored, ...dataOnly } = bookingPayload;
        const { error } = await supabase
          .from('bookings')
          .update(dataOnly)
          .eq('id', editingBooking.id);
        if (error) throw error;

        // L'ordine del pre-ordine segue la prenotazione: stessa data e ora.
        if (editingBooking.linkedOrderId && changedDetails) {
          await supabase
            .from('orders')
            .update({ scheduled_at: zonedToUtc(date, toMinutes(newTime)).toISOString() })
            .eq('id', editingBooking.linkedOrderId);
        }

        setShowModal(false);
        if (statusChanged) {
          await handleUpdateStatus(editingBooking.id, status);
        } else if (changedDetails && editingBooking.status === 'confirmed') {
          await sendBookingEmail(editingBooking.id, 'modified');
        }
      } else {
        const { data: created, error } = await supabase
          .from('bookings')
          .insert(bookingPayload)
          .select('id')
          .single();
        if (error) throw error;
        setShowModal(false);
        // Prenotazione presa dal locale (telefono, di persona): se c'è l'email, conferma al cliente.
        if (created && status === 'confirmed' && email.trim()) {
          await sendBookingEmail(created.id, 'confirmed', true);
        }
      }

      await fetchBookings();
    } catch (e) {
      console.error('Error saving booking:', e);
      notify.error('Errore durante il salvataggio della prenotazione.');
    }
  };

  const renderBooking = (booking: TableBooking, opts: { history?: boolean } = {}) => {
    const day = new Date(`${booking.date}T12:00:00`);
    const occupied = booking.status !== 'cancelled' && !opts.history ? peakCovers(booking.date, booking.time) : null;
    const over = occupied !== null && capacity !== null && occupied > capacity;
    const hasPre = !!booking.preOrderItems && booking.preOrderItems.length > 0;
    const preTotal = hasPre
      ? booking.preOrderItems!.reduce((acc: number, item: any) => acc + item.price * item.qty, 0)
      : 0;
    const waiting = booking.status === 'pending' && !!booking.acceptDeadline;
    const statusLabel =
      booking.status === 'confirmed'
        ? 'Confermata'
        : booking.status === 'cancelled'
          ? booking.expired
            ? 'Scaduta'
            : 'Annullata'
          : 'In attesa';
    const btn =
      'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95';
    const ghost = `${btn} border border-border text-muted-foreground hover:bg-muted hover:text-foreground`;

    // Azione principale a tutta larghezza; sotto le secondarie, tutte della stessa altezza.
    let primary: React.ReactNode = null;
    let secondary: React.ReactNode = null;
    const edit = (
      <button onClick={() => handleOpenEditModal(booking)} className={ghost} title="Modifica">
        Modifica
      </button>
    );
    const del = (
      <button
        onClick={() => handleDeleteBooking(booking.id)}
        className={`${btn} border border-red-100 text-red-500 hover:bg-red-50 px-3.5`}
        title="Elimina"
        aria-label="Elimina prenotazione"
      >
        <Trash2 size={14} />
      </button>
    );
    if (booking.status === 'pending' && !opts.history) {
      primary = (
        <button
          onClick={() => handleUpdateStatus(booking.id, 'confirmed')}
          className={`${btn} w-full bg-green-600 hover:bg-green-700 text-white shadow-sm sm:text-sm py-3`}
        >
          <Check size={15} />
          {hasPre ? 'Conferma e manda in cucina' : 'Conferma'}
        </button>
      );
      secondary = (
        <>
          <button
            onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
            className={`${btn} bg-red-50 text-red-600 border border-red-200 hover:bg-red-100`}
          >
            <X size={13} />
            Rifiuta
          </button>
          {edit}
          {del}
        </>
      );
    } else if (booking.status === 'cancelled') {
      primary = (
        <button
          onClick={() => handleUpdateStatus(booking.id, 'confirmed')}
          className={`${btn} w-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100`}
        >
          <Check size={13} />
          Ripristina
        </button>
      );
      secondary = (
        <>
          {edit}
          {del}
        </>
      );
    } else if (booking.status === 'confirmed' && !opts.history) {
      secondary = (
        <>
          <button
            onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
            className={`${btn} bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100`}
          >
            <X size={13} />
            Annulla
          </button>
          {edit}
          {del}
        </>
      );
    } else {
      secondary = (
        <>
          {edit}
          {del}
        </>
      );
    }

    return (
      <div
        key={booking.id}
        className={`p-4 sm:p-5 grid gap-4 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_15.5rem] lg:items-start hover:bg-muted/30 transition-colors border-l-4 ${
          booking.status === 'confirmed'
            ? 'border-l-[var(--success)] bg-[var(--success-bg)]/5'
            : booking.status === 'cancelled'
              ? 'border-l-muted-foreground/30 bg-muted/5 opacity-75'
              : 'border-l-[var(--info)] bg-[var(--info-bg)]/5'
        }`}
      >
        <div className="min-w-0 space-y-3">
         <div className="flex gap-3 sm:gap-4">
          {/* Giorno */}
          <div className="flex w-14 sm:w-16 flex-shrink-0 flex-col items-center self-start rounded-xl border border-border bg-card py-2 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              {day.toLocaleDateString('it-IT', { month: 'short' })}
            </span>
            <span className="text-xl font-extrabold leading-none text-foreground">
              {day.toLocaleDateString('it-IT', { day: 'numeric' })}
            </span>
            <span className="mt-1 text-[11px] capitalize text-muted-foreground">
              {day.toLocaleDateString('it-IT', { weekday: 'short' })}
            </span>
          </div>

          <div className="min-w-0 flex-1 space-y-2.5">
            {/* Ora, nome, stato */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-2xl font-extrabold tabular-nums leading-none text-foreground">{booking.time}</span>
              <h3 className="min-w-0 max-w-full truncate text-base font-bold text-foreground">{booking.name}</h3>
              <Badge
                variant={booking.status === 'confirmed' ? 'success' : booking.status === 'cancelled' ? 'danger' : 'info'}
                className="whitespace-nowrap px-2 py-0 text-[11px]"
              >
                {statusLabel}
              </Badge>
            </div>

            {/* Quanti, scadenza, capienza */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <Users size={13} />
                {booking.guests} {booking.guests === 1 ? 'ospite' : 'ospiti'}
              </span>
              {waiting && (
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                  <Clock size={13} />
                  Rispondi entro{' '}
                  {new Date(booking.acceptDeadline as string).toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
              {occupied !== null && (
                <span
                  className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                    over ? 'bg-[var(--danger-bg)] text-[var(--danger)]' : 'bg-muted text-muted-foreground'
                  }`}
                  title="Coperti già occupati nella fascia di questa prenotazione"
                >
                  Fascia {occupied}
                  {capacity !== null ? `/${capacity}` : ''} coperti
                </span>
              )}
            </div>

          </div>
         </div>

            {/* Contatti: a tutta larghezza sotto la testata */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              <a href={`tel:${booking.phone}`} className="inline-flex items-center gap-1.5 whitespace-nowrap hover:text-foreground">
                <Phone size={14} className="text-muted-foreground/70" />
                {booking.phone}
              </a>
              {booking.email ? (
                <a href={`mailto:${booking.email}`} className="inline-flex min-w-0 items-center gap-1.5 hover:text-foreground">
                  <Mail size={14} className="flex-shrink-0 text-muted-foreground/70" />
                  <span className="truncate">{booking.email}</span>
                </a>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 whitespace-nowrap text-amber-600"
                  title="Senza email non si può avvisare il cliente: richiamalo"
                >
                  <Mail size={14} /> senza email
                </span>
              )}
            </div>

            {/* Note e pre-ordine: affiancati quando c'è spazio */}
            {(booking.notes || hasPre) && (
              <div className={`grid grid-cols-[minmax(0,1fr)] items-start gap-2.5 ${booking.notes && hasPre ? "md:grid-cols-2" : ""}`}>
                {booking.notes && (
                  <div className="flex gap-2 rounded-lg border border-border/60 bg-background/80 px-3 py-2.5 text-sm">
                    <MessageSquare size={14} className="mt-0.5 flex-shrink-0 text-primary/75" />
                    <p className="italic leading-snug text-muted-foreground">&quot;{booking.notes}&quot;</p>
                  </div>
                )}
                {hasPre && (
                  <div className="space-y-1.5 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2.5 text-sm dark:bg-green-950/10">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">
                      <span>Pre-ordine cibo</span>
                      {booking.status === 'confirmed' && (
                        <a
                          href="/ristoratore/ordini"
                          className="inline-flex items-center gap-0.5 rounded-full bg-green-600 px-2 py-0.5 text-[11px] font-bold text-white transition-colors hover:bg-green-700"
                        >
                          Vedi ordine &rarr;
                        </a>
                      )}
                    </div>
                    <div className="space-y-0.5 text-[13px] font-medium text-foreground">
                      {booking.preOrderItems!.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between gap-3">
                          <span className="min-w-0 truncate">
                            {item.qty}× {item.name}
                          </span>
                          <span className="font-semibold tabular-nums text-muted-foreground">
                            €{(item.price * item.qty).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between border-t border-green-500/15 pt-1.5 text-[13px] font-bold tabular-nums text-green-700 dark:text-green-400">
                      <span>Totale</span>
                      <span>€{preTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>

        {/* Azioni: sotto la scheda su telefono e tablet, a destra su schermi larghi */}
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          {primary && <div className="sm:flex-1 lg:flex-none">{primary}</div>}
          <div
            className={`grid gap-2 sm:flex-1 lg:flex-none ${
              secondary && React.Children.count((secondary as any).props?.children) >= 3
                ? 'grid-cols-[1fr_1fr_auto]'
                : 'grid-cols-[1fr_auto]'
            }`}
          >
            {secondary}
          </div>
        </div>
      </div>
    );
  };

  const todayStr = getTodayStr();
  const tomorrowStr = getTomorrowStr();
  const q = search.trim().toLowerCase();
  const matchesSearch = (b: TableBooking) =>
    !q || [b.name, b.phone, b.email || ''].some((v) => v.toLowerCase().includes(q));

  const dateMatches = (b: TableBooking) => {
    if (dateFilterType === 'today') return b.date === todayStr;
    if (dateFilterType === 'tomorrow') return b.date === tomorrowStr;
    if (dateFilterType === 'next7') return b.date >= todayStr && b.date <= dateOffset(7);
    if (dateFilterType === 'custom') return !filterDate || b.date === filterDate;
    return true;
  };

  const byDateTime = (a: TableBooking, b: TableBooking) =>
    a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date);

  // Da oggi in poi: le richieste da confermare in cima (anche se di un giorno già passato:
  // non devono perdersi), poi le confermate per giorno. Le annullate e scadute stanno
  // dietro una pillola, come gli ordini persi.
  const pendingAll = bookings.filter((b) => b.status === 'pending');
  const pendingList = pendingAll
    .filter(matchesSearch)
    .sort((a, b) =>
      (a.acceptDeadline || '9999').localeCompare(b.acceptDeadline || '9999') || byDateTime(a, b)
    );
  const confirmedList = bookings
    .filter((b) => b.status === 'confirmed' && b.date >= todayStr && dateMatches(b) && matchesSearch(b))
    .sort(byDateTime);
  const closedAll = bookings.filter((b) => b.status === 'cancelled' && b.date >= todayStr);
  const closedList = closedAll.filter((b) => dateMatches(b) && matchesSearch(b)).sort(byDateTime);

  const confirmedToday = bookings.filter((b) => b.status === 'confirmed' && b.date === todayStr);
  const confirmedNext7 = bookings.filter(
    (b) => b.status === 'confirmed' && b.date >= todayStr && b.date <= dateOffset(7)
  );
  const sumGuests = (list: TableBooking[]) => list.reduce((n, b) => n + (b.guests || 0), 0);

  // Storico: tutto ciò che è già stato risolto nel periodo scelto.
  const HISTORY_CAP = 300;
  const histAll = bookings
    .filter(
      (b) =>
        b.status !== 'pending' &&
        b.date >= histFrom &&
        b.date <= histTo &&
        (histStatus === 'all' || b.status === histStatus) &&
        matchesSearch(b)
    )
    .sort((a, b) => byDateTime(b, a));
  const histShown = histAll.slice(0, HISTORY_CAP);
  const histConfirmed = histAll.filter((b) => b.status === 'confirmed');
  const histClosed = histAll.filter((b) => b.status === 'cancelled');

  const groupByDay = (list: TableBooking[]) => {
    const groups: { date: string; items: TableBooking[] }[] = [];
    list.forEach((b) => {
      const last = groups[groups.length - 1];
      if (last && last.date === b.date) last.items.push(b);
      else groups.push({ date: b.date, items: [b] });
    });
    return groups;
  };
  const dayHeading = (d: string) => {
    const label = new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return d === todayStr ? `Oggi · ${label}` : d === tomorrowStr ? `Domani · ${label}` : label;
  };

  // CSV come lo Storico ordini: BOM e punto e virgola, così Excel italiano lo apre bene.
  const csvCell = (v: unknown) => {
    let t = String(v ?? '').replace(/\r?\n/g, ' ');
    if (/^[=+\-@]/.test(t)) t = `'${t}`;
    return `"${t.replace(/"/g, '""')}"`;
  };
  const exportBookingsCsv = () => {
    const head = ['Data', 'Ora', 'Nome', 'Telefono', 'Email', 'Persone', 'Stato', 'Note', 'Pre-ordine', 'Totale pre-ordine'];
    const lines = histAll.map((b) =>
      [
        b.date.split('-').reverse().join('/'),
        b.time,
        b.name,
        b.phone,
        b.email || '',
        b.guests,
        b.status === 'confirmed' ? 'Confermata' : b.expired ? 'Scaduta' : 'Annullata',
        b.notes || '',
        (b.preOrderItems || []).map((i: any) => `${i.qty}x ${i.name}`).join(', '),
        b.preOrderTotal ? b.preOrderTotal.toFixed(2).replace('.', ',') : '',
      ]
        .map(csvCell)
        .join(';')
    );
    const csv = '﻿' + [head.map(csvCell).join(';'), ...lines].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `prenotazioni_${histFrom}_${histTo}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const sectionHeading = (text: React.ReactNode, extra?: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3 px-1">
      <h2 className="text-sm font-bold text-foreground first-letter:uppercase">{text}</h2>
      {extra}
    </div>
  );
  const rowsBox = (list: TableBooking[], opts: { history?: boolean } = {}) => (
    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
      <div className="divide-y divide-border">{list.map((b) => renderBooking(b, opts))}</div>
    </div>
  );

  return (
    <div className="flex flex-1 min-h-0 min-w-0 bg-background overflow-hidden relative">

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <PageTopbar
          left={
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <Store size={16} className="text-primary flex-shrink-0" />
              <span className="font-semibold text-foreground text-base truncate">
                {user?.restaurantName || 'Il tuo ristorante'}
              </span>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={!isBookingsMuted}
              aria-label={isBookingsMuted ? 'Attiva i suoni delle prenotazioni' : 'Disattiva i suoni delle prenotazioni'}
              title={isBookingsMuted ? 'Suoni delle prenotazioni disattivati' : 'Suoni delle prenotazioni attivi'}
              onClick={() => setIsBookingsMuted(!isBookingsMuted)}
              className={`touch-target inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors cursor-pointer ${
                isBookingsMuted
                  ? 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  : 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300'
              }`}
            >
              {isBookingsMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
              <span className="hidden sm:inline">{isBookingsMuted ? 'Prenotazioni off' : 'Prenotazioni on'}</span>
            </button>
            <AudioSettings />
            </div>
          }
        />

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-screen-xl mx-auto px-6 lg:px-8 py-6 space-y-6">
            {isLoading || (loading && bookings.length === 0) ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground text-sm font-medium animate-pulse">
                  Caricamento prenotazioni in corso...
                </p>
              </div>
            ) : !restaurantId || restaurantId === 'r-001' ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-card border border-border rounded-2xl shadow-sm">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
                  <Store size={32} />
                </div>
                <h2 className="text-xl font-bold text-foreground">Nessun Ristorante Collegato</h2>
                <p className="text-muted-foreground text-sm max-w-md mt-2">
                  Il tuo account non è ancora collegato a un ristorante attivo. Contatta
                  l'amministratore per completare la configurazione e l'attivazione del tuo profilo.
                </p>
              </div>
            ) : (
              <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Gestione Prenotazioni</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {user?.restaurantName || 'Il tuo ristorante'}
                </p>
              </div>
              <button
                onClick={handleOpenAddModal}
                className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors cursor-pointer w-full sm:w-auto"
              >
                <Plus size={16} />
                Nuova Prenotazione
              </button>
            </div>

            {/* Vista e ricerca */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div role="tablist" aria-label="Vista prenotazioni" className="inline-flex rounded-xl bg-muted p-1 self-start">
                <button
                  role="tab"
                  aria-selected={view === 'upcoming'}
                  onClick={() => setView('upcoming')}
                  className={`touch-target inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                    view === 'upcoming' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Da oggi in poi
                  {pendingAll.length > 0 && (
                    <span className="bg-primary text-white text-[11px] font-extrabold rounded-full min-w-5 h-5 px-1.5 inline-flex items-center justify-center">
                      {pendingAll.length}
                    </span>
                  )}
                </button>
                <button
                  role="tab"
                  aria-selected={view === 'history'}
                  onClick={() => setView('history')}
                  className={`touch-target px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                    view === 'history' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Storico
                </button>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cerca nome, telefono o email"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {view === 'upcoming' ? (
              <>
                {/* Numeri di oggi */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-[var(--info-bg)] border border-[var(--info)]/20 rounded-xl p-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Da confermare</p>
                    <p className="text-2xl font-bold tabular-nums text-[var(--info)] mt-1">{pendingAll.length}</p>
                  </div>
                  <div className="bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-xl p-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Oggi</p>
                    <p className="text-2xl font-bold tabular-nums text-[var(--success)] mt-1">{confirmedToday.length}</p>
                  </div>
                  <div className="bg-card rounded-xl border border-border shadow-card p-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Coperti oggi</p>
                    <p className="text-2xl font-bold tabular-nums text-foreground mt-1">{sumGuests(confirmedToday)}</p>
                  </div>
                  <div className="bg-card rounded-xl border border-border shadow-card p-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Prossimi 7 giorni</p>
                    <p className="text-2xl font-bold tabular-nums text-foreground mt-1">
                      {confirmedNext7.length}
                      <span className="ml-1.5 text-xs font-semibold text-muted-foreground">
                        · {sumGuests(confirmedNext7)} coperti
                      </span>
                    </p>
                  </div>
                </div>

                {/* Capienza prenotazioni (C9) */}
                <div
                  className={`rounded-xl border p-4 sm:p-5 shadow-card flex flex-col lg:flex-row gap-4 lg:gap-8 lg:items-center justify-between ${
                    capacity === null
                      ? 'bg-[var(--warning-bg)] border-[var(--warning)]/30'
                      : 'bg-card border-border'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 lg:flex-1 lg:max-w-2xl">
                    <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Users size={14} /> Capienza prenotazioni
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {capacity === null
                        ? 'Nessun limite impostato: ogni richiesta resta da valutare a mano. Indica quanti coperti accetti in contemporanea per rifiutare in automatico le richieste che superano i posti disponibili.'
                        : `Accetti fino a ${capacity} coperti in contemporanea. Contano le richieste in attesa e quelle confermate.`}{' '}
                      Il turno è il tempo in cui un tavolo resta occupato ({slotMinutes} minuti).
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-[11rem_9rem_auto] sm:justify-start gap-3 items-end lg:flex-shrink-0">
                    <label className="text-xs font-semibold text-muted-foreground flex flex-col gap-1 min-w-0">
                      Coperti
                      <input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={capacityInput}
                        onChange={(e) => setCapacityInput(e.target.value)}
                        placeholder="Nessun limite"
                        className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60"
                      />
                    </label>
                    <label className="text-xs font-semibold text-muted-foreground flex flex-col gap-1 min-w-0">
                      Durata turno
                      <select
                        value={slotInput}
                        onChange={(e) => setSlotInput(Number(e.target.value))}
                        className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground"
                      >
                        {Array.from(new Set([60, 90, 120, 150, 180, slotInput]))
                          .sort((x, y) => x - y)
                          .map((m) => (
                            <option key={m} value={m}>
                              {m} min
                            </option>
                          ))}
                      </select>
                    </label>
                    <button
                      onClick={saveCapacity}
                      disabled={capacitySaving}
                      className="col-span-2 sm:col-span-1 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {capacitySaving ? 'Salvataggio…' : 'Salva'}
                    </button>
                    {capacityMessage && (
                      <span className="col-span-2 sm:col-span-3 text-xs text-muted-foreground">
                        {capacityMessage}
                      </span>
                    )}
                  </div>
                </div>


                {/* Filtro per giorno */}
                <div className="flex flex-wrap items-center gap-3">
                  <FilterPills
                    ariaLabel="Filtra per giorno"
                    pills={[
                      { key: 'all', label: 'Tutti i giorni', active: dateFilterType === 'all', onClick: () => { setDateFilterType('all'); setFilterDate(''); } },
                      { key: 'today', label: 'Oggi', active: dateFilterType === 'today', onClick: () => { setDateFilterType('today'); setFilterDate(getTodayStr()); } },
                      { key: 'tomorrow', label: 'Domani', active: dateFilterType === 'tomorrow', onClick: () => { setDateFilterType('tomorrow'); setFilterDate(getTomorrowStr()); } },
                      { key: 'next7', label: '7 giorni', active: dateFilterType === 'next7', onClick: () => { setDateFilterType('next7'); setFilterDate(''); } },
                    ]}
                  />
                  <input
                    type="date"
                    value={filterDate}
                    min={todayStr}
                    onChange={(e) => {
                      setFilterDate(e.target.value);
                      setDateFilterType(e.target.value ? 'custom' : 'all');
                    }}
                    aria-label="Giorno specifico"
                    className="px-3 py-2 text-base bg-input border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring w-full sm:w-[11.5rem]"
                  />
                </div>

                {pendingList.length > 0 && (
                  <section className="space-y-2">
                    {sectionHeading(`Da confermare (${pendingList.length})`)}
                    {rowsBox(pendingList)}
                  </section>
                )}

                {groupByDay(confirmedList).map((g) => (
                  <section key={g.date} className="space-y-2">
                    {sectionHeading(
                      dayHeading(g.date),
                      <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                        {g.items.length} {g.items.length === 1 ? 'prenotazione' : 'prenotazioni'} · {sumGuests(g.items)} coperti
                      </span>
                    )}
                    {rowsBox(g.items)}
                  </section>
                ))}

                {pendingList.length === 0 && confirmedList.length === 0 && (
                  <div className="bg-card rounded-xl border border-border shadow-card py-12 text-center">
                    <AlertCircle size={32} className="text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-semibold text-foreground">Nessuna prenotazione in programma</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {q || dateFilterType !== 'all'
                        ? 'Nessun risultato con i filtri scelti.'
                        : 'Le nuove richieste compaiono qui in tempo reale.'}
                    </p>
                  </div>
                )}

                {closedAll.length > 0 && (
                  <section className="space-y-2">
                    <button
                      onClick={() => setShowClosed((v) => !v)}
                      aria-pressed={showClosed}
                      className={`touch-target inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                        showClosed
                          ? 'bg-[var(--danger-bg)] text-[var(--danger)]'
                          : 'bg-muted text-muted-foreground hover:bg-border'
                      }`}
                    >
                      Annullate e scadute
                      <span className="rounded-full bg-card/70 px-1.5 text-[11px] tabular-nums">{closedAll.length}</span>
                    </button>
                    {showClosed && (closedList.length > 0 ? rowsBox(closedList) : (
                      <p className="px-1 text-xs text-muted-foreground">Nessuna con i filtri scelti.</p>
                    ))}
                  </section>
                )}
              </>
            ) : (
              <>
                {/* Storico: periodo, stato, totali, esportazione */}
                <div className="bg-card border border-border rounded-xl p-4 shadow-card space-y-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="text-xs font-semibold text-muted-foreground flex flex-col gap-1 min-w-0 flex-1 sm:flex-none">
                      Dal
                      <input
                        type="date"
                        value={histFrom}
                        min={dateOffset(-366)}
                        max={histTo}
                        onChange={(e) => e.target.value && setHistFrom(e.target.value)}
                        className="px-3 py-2 text-base bg-input border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring w-full sm:w-[11.5rem]"
                      />
                    </label>
                    <label className="text-xs font-semibold text-muted-foreground flex flex-col gap-1 min-w-0 flex-1 sm:flex-none">
                      Al
                      <input
                        type="date"
                        value={histTo}
                        min={histFrom}
                        max={todayStr}
                        onChange={(e) => e.target.value && setHistTo(e.target.value)}
                        className="px-3 py-2 text-base bg-input border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring w-full sm:w-[11.5rem]"
                      />
                    </label>
                    <FilterPills
                      ariaLabel="Filtra per stato"
                      pills={[
                        { key: 'all', label: 'Tutte', active: histStatus === 'all', onClick: () => setHistStatus('all') },
                        { key: 'confirmed', label: 'Confermate', active: histStatus === 'confirmed', onClick: () => setHistStatus('confirmed') },
                        { key: 'cancelled', label: 'Annullate e scadute', active: histStatus === 'cancelled', onClick: () => setHistStatus('cancelled') },
                      ]}
                    />
                    <button
                      onClick={exportBookingsCsv}
                      disabled={histAll.length === 0}
                      title="Scarica in CSV le prenotazioni filtrate (si apre con Excel)"
                      className="touch-target ml-auto inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Download size={15} />
                      Esporta CSV
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground tabular-nums">
                    <span>
                      <strong className="text-foreground">{histAll.length}</strong> prenotazioni
                    </span>
                    <span>
                      <strong className="text-foreground">{histConfirmed.length}</strong> confermate ·{' '}
                      <strong className="text-foreground">{sumGuests(histConfirmed)}</strong> coperti
                    </span>
                    <span>
                      <strong className="text-foreground">{histClosed.length}</strong> annullate o scadute
                    </span>
                  </div>
                </div>

                {histAll.length === 0 ? (
                  <div className="bg-card rounded-xl border border-border shadow-card py-12 text-center">
                    <AlertCircle size={32} className="text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-semibold text-foreground">Nessuna prenotazione nel periodo</p>
                    <p className="text-xs text-muted-foreground mt-1">Cambia le date o i filtri.</p>
                  </div>
                ) : (
                  <>
                    {groupByDay(histShown).map((g) => (
                      <section key={g.date} className="space-y-2">
                        {sectionHeading(
                          dayHeading(g.date),
                          <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                            {g.items.length} · {sumGuests(g.items)} coperti
                          </span>
                        )}
                        {rowsBox(g.items, { history: true })}
                      </section>
                    ))}
                    {histAll.length > HISTORY_CAP && (
                      <p className="px-1 text-xs text-muted-foreground">
                        Mostrate le prime {HISTORY_CAP} di {histAll.length}: restringi il periodo oppure esporta il CSV per averle tutte.
                      </p>
                    )}
                  </>
                )}
              </>
            )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Booking Form Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingBooking ? 'Modifica Prenotazione' : 'Aggiungi Prenotazione'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Nome Cliente *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Mario Rossi"
                className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Telefono *
              </label>
              <input
                type="tel"
                inputMode="tel"
                required
                value={phone}
                onChange={(e) => setPhone(phoneDigits(e.target.value))}
                placeholder="+39 3331234567"
                className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                onBlur={() => setEmailTouched(true)}
                placeholder="mario.rossi@email.it"
                className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {emailTouched && email && !isEmailValid && (
                <p className="text-xs text-red-500 font-semibold mt-1">
                  Inserisci un indirizzo email valido.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Numero di Persone *
              </label>
              <input
                type="number"
                min="1"
                max="50"
                required
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Data Prenotazione *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Ora *
            </label>
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Stato Prenotazione *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="pending">In Attesa</option>
                <option value="confirmed">Confermata</option>
                <option value="cancelled">Cancellata</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Note Speciali
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Es. Seggiolone per bimbi, intolleranze..."
              className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring h-16 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-muted hover:bg-border text-foreground text-sm font-bold rounded-xl transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!isEmailValid}
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingBooking ? 'Salva Modifiche' : 'Aggiungi Prenotazione'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
