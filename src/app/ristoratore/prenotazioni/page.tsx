'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { TableBooking } from '@/types';
import { generateId } from '@/lib/id-generator';
import { supabase } from '@/lib/supabase';
import {
  Calendar,
  Plus,
  User,
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
} from 'lucide-react';


export default function PrenotazioniPage() {
  const { user, isLoading } = useAuth();
  const restaurantId = user?.restaurantId || '';

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [bookings, setBookings] = useState<TableBooking[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [dateFilterType, setDateFilterType] = useState<
    'all' | 'today' | 'tomorrow' | 'next7' | 'custom'
  >('all');

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

  useEffect(() => {
    // Restore sidebar state
    const stored = localStorage.getItem('iGO_sidebar_collapsed');
    if (stored !== null) {
      setSidebarCollapsed(JSON.parse(stored));
    }
  }, []);

  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    if (!restaurantId || restaurantId === 'r-001') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;

      const mapped: TableBooking[] = (data || []).map((b: any) => ({
        id: b.id,
        restaurantId: b.restaurant_id,
        name: b.name,
        phone: b.phone,
        email: b.email || undefined,
        guests: b.guests,
        date: b.date,
        time: b.time ? b.time.slice(0, 5) : '',
        status: b.status,
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

  const handleUpdateStatus = async (
    id: string,
    newStatus: 'pending' | 'confirmed' | 'cancelled'
  ) => {
    const targetBooking = bookings.find((b) => b.id === id);
    if (!targetBooking) return;

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

        // 1. Create order in Supabase
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            restaurant_id: restaurantId,
            order_number: `ORD-${targetBooking.id.slice(0, 8).toUpperCase()}`,
            type: 'tavolo',
            status: 'preparing', // "accettato" in cucina
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

        // 2. Create order items
        if (orderData && targetBooking.preOrderItems) {
          const itemsPayload = targetBooking.preOrderItems.map((item: any) => ({
            order_id: orderData.id,
            menu_item_id: item.id.startsWith('sf-') || item.id.startsWith('bk-') ? null : item.id,
            name: item.name,
            price: item.price,
            qty: item.qty || 1,
            note: item.note || null,
            added_ingredients: item.addedIngredients || [],
            removed_ingredients: item.removedIngredients || [],
            selected_options: item.selectedOptions || [],
          }));
          const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
          if (itemsError) throw itemsError;
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

      // Refetch bookings to update state
      await fetchBookings();
    } catch (e) {
      console.error('Error updating booking status:', e);
      alert('Errore nel cambiare lo stato della prenotazione.');
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questa prenotazione?')) {
      try {
        const { error } = await supabase.from('bookings').delete().eq('id', id);

        if (error) throw error;
        await fetchBookings();
      } catch (e) {
        console.error('Error deleting booking:', e);
        alert("Errore nell'eliminazione della prenotazione.");
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
        const { error } = await supabase
          .from('bookings')
          .update(bookingPayload)
          .eq('id', editingBooking.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('bookings').insert(bookingPayload);
        if (error) throw error;
      }

      setShowModal(false);
      await fetchBookings();
    } catch (e) {
      console.error('Error saving booking:', e);
      alert('Errore durante il salvataggio della prenotazione.');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const statusMatch = filterStatus === 'all' || b.status === filterStatus;

    let dateMatch = true;
    const todayStr = getTodayStr();
    const tomorrowStr = getTomorrowStr();

    if (dateFilterType === 'today') {
      dateMatch = b.date === todayStr;
    } else if (dateFilterType === 'tomorrow') {
      dateMatch = b.date === tomorrowStr;
    } else if (dateFilterType === 'next7') {
      const bDate = new Date(b.date);
      const today = new Date(todayStr);
      const next7 = new Date(todayStr);
      next7.setDate(next7.getDate() + 7);
      dateMatch = bDate >= today && bDate <= next7;
    } else if (dateFilterType === 'custom') {
      dateMatch = !filterDate || b.date === filterDate;
    }

    return statusMatch && dateMatch;
  });

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        activeSection="nav-prenotazioni"
        onSectionChange={() => {}}
        role="ristoratore"
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Topbar
          role="ristoratore"
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMobileMenuOpen={() => setIsMobileOpen(true)}
          leftContent={
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <Store size={16} className="text-primary flex-shrink-0" />
              <span className="font-semibold text-foreground text-base truncate">
                {user?.restaurantName || 'Il tuo ristorante'}
              </span>
            </div>
          }
        />

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-screen-xl mx-auto px-6 lg:px-8 py-6 space-y-6">
            {isLoading || (loading && bookings.length === 0) ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground text-sm font-medium animate-pulse">Caricamento prenotazioni in corso...</p>
              </div>
            ) : !restaurantId || restaurantId === 'r-001' ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-card border border-border rounded-2xl shadow-sm">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
                  <Store size={32} />
                </div>
                <h2 className="text-xl font-bold text-foreground">Nessun Ristorante Collegato</h2>
                <p className="text-muted-foreground text-sm max-w-md mt-2">
                  Il tuo account non è ancora collegato a un ristorante attivo. Contatta l'amministratore per completare la configurazione e l'attivazione del tuo profilo.
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

            {/* Quick stats & Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border border-border shadow-card p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Totali
                </p>
                <p className="text-2xl font-bold tabular-nums text-foreground mt-1">
                  {bookings.length}
                </p>
              </div>
              <div className="bg-[var(--info-bg)] border border-[var(--info)]/20 rounded-xl p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  In Attesa
                </p>
                <p className="text-2xl font-bold tabular-nums text-[var(--info)] mt-1">
                  {bookings.filter((b) => b.status === 'pending').length}
                </p>
              </div>
              <div className="bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-xl p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Confermate
                </p>
                <p className="text-2xl font-bold tabular-nums text-[var(--success)] mt-1">
                  {bookings.filter((b) => b.status === 'confirmed').length}
                </p>
              </div>
              <div className="bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-xl p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Cancellate
                </p>
                <p className="text-2xl font-bold tabular-nums text-[var(--danger)] mt-1">
                  {bookings.filter((b) => b.status === 'cancelled').length}
                </p>
              </div>
            </div>

            {/* Filters panel */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between shadow-card">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${filterStatus === 'all' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-border'}`}
                >
                  Tutte
                </button>
                <button
                  onClick={() => setFilterStatus('pending')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${filterStatus === 'pending' ? 'bg-[var(--info-bg)] text-[var(--info)] border border-[var(--info)]/10' : 'bg-muted text-muted-foreground hover:bg-border'}`}
                >
                  In Attesa
                </button>
                <button
                  onClick={() => setFilterStatus('confirmed')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${filterStatus === 'confirmed' ? 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]/10' : 'bg-muted text-muted-foreground hover:bg-border'}`}
                >
                  Confermate
                </button>
                <button
                  onClick={() => setFilterStatus('cancelled')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${filterStatus === 'cancelled' ? 'bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/10' : 'bg-muted text-muted-foreground hover:bg-border'}`}
                >
                  Cancellate
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Quick Date Filters */}
                <div className="flex items-center bg-muted p-1 rounded-lg overflow-x-auto max-w-full whitespace-nowrap scrollbar-hide">
                  <button
                    onClick={() => {
                      setDateFilterType('today');
                      setFilterDate(getTodayStr());
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex-shrink-0 ${
                      dateFilterType === 'today'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Oggi
                  </button>
                  <button
                    onClick={() => {
                      setDateFilterType('tomorrow');
                      setFilterDate(getTomorrowStr());
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex-shrink-0 ${
                      dateFilterType === 'tomorrow'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Domani
                  </button>
                  <button
                    onClick={() => {
                      setDateFilterType('next7');
                      setFilterDate('');
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex-shrink-0 ${
                      dateFilterType === 'next7'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Prossimi 7 Giorni
                  </button>
                  {dateFilterType !== 'all' && (
                    <button
                      onClick={() => {
                        setDateFilterType('all');
                        setFilterDate('');
                      }}
                      className="px-2 py-1 text-xs font-bold text-primary hover:underline ml-1 flex-shrink-0"
                    >
                      Azzera
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">
                    Data specifica:
                  </label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => {
                      setFilterDate(e.target.value);
                      setDateFilterType(e.target.value ? 'custom' : 'all');
                    }}
                    className="px-3 py-1.5 text-base bg-input border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring w-[180px] max-w-full"
                  />
                </div>
              </div>
            </div>

            {/* List */}
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              {filteredBookings.length === 0 ? (
                <div className="py-12 text-center">
                  <AlertCircle size={32} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">
                    Nessuna prenotazione trovata
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Nessun record corrisponde ai filtri selezionati.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-muted/30 transition-all duration-200 border-l-4 ${
                        booking.status === 'confirmed'
                          ? 'border-l-[var(--success)] bg-[var(--success-bg)]/5'
                          : booking.status === 'cancelled'
                            ? 'border-l-muted-foreground/30 bg-muted/5 opacity-70'
                            : 'border-l-[var(--info)] bg-[var(--info-bg)]/5'
                      }`}
                    >
                      {/* Date & Time Widget */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-12 h-12 rounded-lg bg-card border border-border flex flex-col items-center justify-center shadow-sm">
                          <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
                            {new Date(booking.date).toLocaleDateString('it-IT', { month: 'short' })}
                          </span>
                          <span className="text-base font-extrabold text-foreground leading-none">
                            {new Date(booking.date).toLocaleDateString('it-IT', { day: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground flex items-center gap-1">
                            <Clock size={12} className="text-muted-foreground" />
                            {booking.time}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(booking.date).toLocaleDateString('it-IT', {
                              weekday: 'short',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Guest & Customer Info */}
                      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-center">
                        <div>
                          <h3 className="font-bold text-foreground text-sm truncate flex items-center gap-1.5">
                            {booking.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="primary" className="text-[10px] px-1.5 py-0">
                              {booking.guests} {booking.guests === 1 ? 'ospite' : 'ospiti'}
                            </Badge>
                            <Badge
                              variant={
                                booking.status === 'confirmed'
                                  ? 'success'
                                  : booking.status === 'cancelled'
                                    ? 'danger'
                                    : 'info'
                              }
                              className="text-[10px] px-1.5 py-0"
                            >
                              {booking.status === 'confirmed'
                                ? 'Confermata'
                                : booking.status === 'cancelled'
                                  ? 'Cancellata'
                                  : 'In attesa'}
                            </Badge>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p className="flex items-center gap-1">
                            <Phone size={12} className="text-muted-foreground/70" />
                            {booking.phone}
                          </p>
                          {booking.email && (
                            <p className="flex items-center gap-1 truncate">
                              <Mail size={12} className="text-muted-foreground/70" />
                              {booking.email}
                            </p>
                          )}
                        </div>

                        <div className="lg:col-span-1 space-y-2">
                          {booking.notes && (
                            <div className="bg-background/80 p-2.5 rounded-lg border border-border/60 text-xs flex gap-1.5 max-w-xs lg:max-w-none">
                              <MessageSquare
                                size={12}
                                className="text-primary/75 flex-shrink-0 mt-0.5"
                              />
                              <p className="text-muted-foreground italic line-clamp-2 leading-tight">
                                &quot;{booking.notes}&quot;
                              </p>
                            </div>
                          )}
                          {booking.preOrderItems && booking.preOrderItems.length > 0 && (
                            <div className="bg-green-500/5 dark:bg-green-950/10 p-2.5 rounded-lg border border-green-500/20 text-xs space-y-1.5 max-w-xs lg:max-w-none">
                              <div className="flex items-center justify-between gap-1 text-green-700 dark:text-green-400 font-bold text-[9px] uppercase tracking-wider">
                                <span>Pre-Ordine Cibo</span>
                                {booking.status === 'confirmed' && (
                                  <a
                                    href="/ristoratore/ordini"
                                    className="inline-flex items-center gap-0.5 bg-green-600 hover:bg-green-700 text-white font-bold text-[9px] px-2 py-0.5 rounded-full transition-colors shadow-sm cursor-pointer border border-transparent"
                                  >
                                    In cucina &rarr;
                                  </a>
                                )}
                              </div>
                              <div className="space-y-1 font-medium text-foreground text-[11px]">
                                {booking.preOrderItems.map((item: any, idx: number) => (
                                  <div key={idx} className="flex justify-between gap-2">
                                    <span className="truncate">
                                      {item.qty}x {item.name}
                                    </span>
                                    <span className="font-semibold text-muted-foreground">
                                      €{(item.price * item.qty).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                                <div className="border-t border-green-500/15 pt-1 mt-1 flex justify-between font-bold text-green-700 dark:text-green-400">
                                  <span>Totale:</span>
                                  <span>
                                    €
                                    {booking.preOrderItems
                                      .reduce(
                                        (acc: number, item: any) => acc + item.price * item.qty,
                                        0
                                      )
                                      .toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                          {!booking.notes &&
                            (!booking.preOrderItems || booking.preOrderItems.length === 0) && (
                              <span className="text-xs text-muted-foreground/40 italic">
                                Nessuna nota
                              </span>
                            )}
                        </div>
                      </div>

                      {/* Quick Actions & Modify/Delete */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {booking.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(booking.id, 'confirmed')}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer shadow-sm shadow-green-600/10 active:scale-95"
                            >
                              <Check size={12} />
                              Conferma
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95"
                            >
                              <X size={12} />
                              Rifiuta
                            </button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95"
                          >
                            <X size={12} />
                            Annulla
                          </button>
                        )}
                        {booking.status === 'cancelled' && (
                          <button
                            onClick={() => handleUpdateStatus(booking.id, 'confirmed')}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95"
                          >
                            <Check size={12} />
                            Ripristina
                          </button>
                        )}

                        <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

                        <button
                          onClick={() => handleOpenEditModal(booking)}
                          className="px-2.5 py-1.5 border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer active:scale-95"
                          title="Modifica"
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => handleDeleteBooking(booking.id)}
                          className="p-1.5 border border-red-100 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer active:scale-95"
                          title="Elimina"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
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
