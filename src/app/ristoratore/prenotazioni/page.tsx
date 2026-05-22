'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { TableBooking } from '@/types';
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

const defaultBookings: TableBooking[] = [
  {
    id: 'booking-1',
    name: 'Alessandro Rossi',
    phone: '+39 333 123 4567',
    email: 'alessandro.rossi@email.it',
    guests: 4,
    date: '2026-05-22',
    time: '20:30',
    status: 'confirmed',
    notes: "Tavolo all'aperto vicino alla finestra se possibile.",
    createdAt: '2026-05-20T18:30:00Z',
  },
  {
    id: 'booking-2',
    name: 'Giulia Bianchi',
    phone: '+39 345 765 4321',
    email: 'giulia.bianchi@email.it',
    guests: 2,
    date: '2026-05-22',
    time: '19:30',
    status: 'pending',
    notes: 'Festeggiamo un anniversario.',
    createdAt: '2026-05-21T09:15:00Z',
  },
  {
    id: 'booking-3',
    name: 'Marco Esposito',
    phone: '+39 320 987 6543',
    email: 'marco.esposito@email.it',
    guests: 6,
    date: '2026-05-23',
    time: '21:00',
    status: 'confirmed',
    notes: 'Un invitato celiaco.',
    createdAt: '2026-05-21T10:00:00Z',
  },
  {
    id: 'booking-4',
    name: 'Sofia Neri',
    phone: '+39 328 112 2334',
    guests: 3,
    date: '2026-05-23',
    time: '13:00',
    status: 'cancelled',
    notes: 'Cancellato su richiesta del cliente.',
    createdAt: '2026-05-19T14:20:00Z',
  },
];

export default function PrenotazioniPage() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || 'r-001';

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  const [bookings, setBookings] = useState<TableBooking[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [dateFilterType, setDateFilterType] = useState<'all' | 'today' | 'tomorrow' | 'next7' | 'custom'>('all');

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

    // Set dynamic date
    const formatted = new Date().toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    setCurrentDate(formatted.charAt(0).toUpperCase() + formatted.slice(1));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedBookings = localStorage.getItem(`iGO_bookings_${restaurantId}`);
        if (storedBookings) {
          setBookings(JSON.parse(storedBookings));
        } else {
          setBookings(defaultBookings);
          localStorage.setItem(`iGO_bookings_${restaurantId}`, JSON.stringify(defaultBookings));
        }
      } catch (e) {
        console.error('Error loading bookings:', e);
        setBookings(defaultBookings);
      }
    }
  }, [restaurantId]);

  const saveBookingsToStorage = (updatedBookings: TableBooking[]) => {
    setBookings(updatedBookings);
    try {
      localStorage.setItem(`iGO_bookings_${restaurantId}`, JSON.stringify(updatedBookings));
    } catch (e) {
      console.error('Error saving bookings:', e);
    }
  };

  const handleOpenAddModal = () => {
    setEditingBooking(null);
    setName('');
    setPhone('');
    setEmail('');
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
    setGuests(booking.guests);
    setDate(booking.date);
    setTime(booking.time);
    setStatus(booking.status);
    setNotes(booking.notes || '');
    setShowModal(true);
  };

  const handleUpdateStatus = (id: string, newStatus: 'pending' | 'confirmed' | 'cancelled') => {
    const updated = bookings.map((b) => (b.id === id ? { ...b, status: newStatus } : b));
    saveBookingsToStorage(updated);
  };

  const handleDeleteBooking = (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questa prenotazione?')) {
      const updated = bookings.filter((b) => b.id !== id);
      saveBookingsToStorage(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !date || !time) return;

    const bookingData: TableBooking = {
      id: editingBooking ? editingBooking.id : `booking-${Date.now()}`,
      restaurantId,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() ? email.trim() : undefined,
      guests: Number(guests) || 2,
      date,
      time,
      status,
      notes: notes.trim() ? notes.trim() : undefined,
      createdAt: editingBooking ? editingBooking.createdAt : new Date().toISOString(),
    };

    let updated: TableBooking[];
    if (editingBooking) {
      updated = bookings.map((b) => (b.id === editingBooking.id ? bookingData : b));
    } else {
      updated = [bookingData, ...bookings];
    }

    saveBookingsToStorage(updated);
    setShowModal(false);
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
                {user?.restaurantName || 'Pizzeria Bella Napoli'}
              </span>
            </div>
          }
        />

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-screen-xl mx-auto px-6 lg:px-8 py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Gestione Prenotazioni</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentDate || 'Caricamento data...'} ·{' '}
                  {user?.restaurantName || 'Il tuo ristorante'}
                </p>
              </div>
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-[#d43d22] transition-colors cursor-pointer"
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
                <div className="flex items-center bg-muted p-1 rounded-lg">
                  <button
                    onClick={() => {
                      setDateFilterType('today');
                      setFilterDate(getTodayStr());
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      dateFilterType === 'today' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Oggi
                  </button>
                  <button
                    onClick={() => {
                      setDateFilterType('tomorrow');
                      setFilterDate(getTomorrowStr());
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      dateFilterType === 'tomorrow' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Domani
                  </button>
                  <button
                    onClick={() => {
                      setDateFilterType('next7');
                      setFilterDate('');
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      dateFilterType === 'next7' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
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
                      className="px-2 py-1 text-xs font-bold text-primary hover:underline ml-1"
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
                            {new Date(booking.date).toLocaleDateString('it-IT', { weekday: 'short' })}
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

                        <div className="lg:col-span-1">
                          {booking.notes ? (
                            <div className="bg-background/80 p-2 rounded-lg border border-border/60 text-xs flex gap-1.5 max-w-xs lg:max-w-none">
                              <MessageSquare size={12} className="text-primary/75 flex-shrink-0 mt-0.5" />
                              <p className="text-muted-foreground italic line-clamp-2 leading-tight">
                                &quot;{booking.notes}&quot;
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/40 italic">Nessuna nota</span>
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
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+39 333 123 4567"
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
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mario.rossi@email.it"
                className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
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
              className="px-5 py-2 bg-primary hover:bg-[#d43d22] text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
            >
              {editingBooking ? 'Salva Modifiche' : 'Aggiungi Prenotazione'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
