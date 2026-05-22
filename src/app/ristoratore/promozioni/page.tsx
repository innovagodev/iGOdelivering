'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Toggle from '@/components/ui/Toggle';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { PromoCode, PromoType } from '@/types';
import { Tag, Plus, Edit2, Trash2, Percent, Euro, Calendar, Info, AlertCircle, TrendingUp, UserCheck, Store } from 'lucide-react';

const defaultPromos: PromoCode[] = [
  {
    id: 'promo-1',
    code: 'WELCOME10',
    type: 'first_order',
    value: 10,
    minOrderSubtotal: 15,
    active: true,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    description: 'Sconto del 10% per i nuovi clienti con spesa minima di 15€',
  },
  {
    id: 'promo-2',
    code: 'PIZZA5',
    type: 'threshold_based',
    value: 5,
    minOrderSubtotal: 30,
    active: true,
    startDate: '2026-05-01',
    endDate: '2026-08-31',
    description: 'Sconto fisso di 5€ su ordini superiori a 30€',
  },
];

export default function PromozioniPage() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || 'r-001';

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [type, setType] = useState<PromoType>('percentage');
  const [value, setValue] = useState('10');
  const [minOrderSubtotal, setMinOrderSubtotal] = useState('15');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState('');

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
        const storedPromos = localStorage.getItem(`iGO_promos_${restaurantId}`);
        if (storedPromos) {
          const parsed = JSON.parse(storedPromos).map((p: any) => ({
            ...p,
            type: p.type === 'fixed' ? 'fixed_amount' : p.type,
          }));
          setPromos(parsed);
        } else {
          setPromos(defaultPromos);
          localStorage.setItem(`iGO_promos_${restaurantId}`, JSON.stringify(defaultPromos));
        }
      } catch (e) {
        console.error('Error loading promos:', e);
        setPromos(defaultPromos);
      }
    }
  }, [restaurantId]);

  const savePromosToStorage = (updatedPromos: PromoCode[]) => {
    setPromos(updatedPromos);
    try {
      localStorage.setItem(`iGO_promos_${restaurantId}`, JSON.stringify(updatedPromos));
    } catch (e) {
      console.error('Error saving promos:', e);
    }
  };

  const handleTogglePromo = (id: string) => {
    const updated = promos.map((p) => (p.id === id ? { ...p, active: !p.active } : p));
    savePromosToStorage(updated);
  };

  const handleOpenAddModal = () => {
    setEditingPromo(null);
    setCode('');
    setType('percentage');
    setValue('10');
    setMinOrderSubtotal('0');
    setStartDate('');
    setEndDate('');
    setIsActive(true);
    setDescription('');
    setShowModal(true);
  };

  const handleOpenEditModal = (promo: PromoCode) => {
    setEditingPromo(promo);
    setCode(promo.code);
    setType(promo.type);
    setValue(promo.value.toString());
    setMinOrderSubtotal((promo.minOrderSubtotal || 0).toString());
    setStartDate(promo.startDate || '');
    setEndDate(promo.endDate || '');
    setIsActive(promo.active);
    setDescription(promo.description || '');
    setShowModal(true);
  };

  const handleDeletePromo = (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questo codice promozionale?')) {
      const updated = promos.filter((p) => p.id !== id);
      savePromosToStorage(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !value.trim()) return;

    // Standardize promo code (uppercase, no spaces)
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');

    const promoData: PromoCode = {
      id: editingPromo ? editingPromo.id : `promo-${Date.now()}`,
      code: cleanCode,
      type,
      value: parseFloat(value) || 0,
      minOrderSubtotal: parseFloat(minOrderSubtotal) || undefined,
      active: isActive,
      startDate: startDate ? startDate : undefined,
      endDate: endDate ? endDate : undefined,
      description: description.trim() ? description.trim() : undefined,
    };

    let updated: PromoCode[];
    if (editingPromo) {
      updated = promos.map((p) => (p.id === editingPromo.id ? promoData : p));
    } else {
      updated = [...promos, promoData];
    }

    savePromosToStorage(updated);
    setShowModal(false);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        activeSection="nav-promozioni"
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
                <h1 className="text-2xl font-bold text-foreground">Gestione Promozioni</h1>
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
                Aggiungi Codice
              </button>
            </div>

            {/* Promos Info Alert */}
            <div className="bg-card border border-border rounded-xl p-4 flex gap-3 shadow-card">
              <Info size={20} className="text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <h4 className="font-semibold text-foreground">Promuovi il tuo business!</h4>
                <p className="text-muted-foreground mt-1 leading-relaxed">
                  Crea codici promozionali a percentuale, a importo fisso, a soglia minima, o per il primo ordine dei clienti. I clienti potranno
                  inserirli nel carrello prima di confermare l&apos;ordine per applicare lo sconto.
                </p>
              </div>
            </div>

            {/* List Table & Cards */}
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              {promos.length === 0 ? (
                <div className="py-12 text-center">
                  <AlertCircle size={32} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">
                    Nessuna promozione configurata
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clicca su &quot;Aggiungi Codice&quot; per crearne una.
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop view: Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          <th className="px-6 py-4">Stato</th>
                          <th className="px-6 py-4">Codice</th>
                          <th className="px-6 py-4">Valore Sconto</th>
                          <th className="px-6 py-4">Ordine Minimo</th>
                          <th className="px-6 py-4">Descrizione / Validità</th>
                          <th className="px-6 py-4 text-center">Azioni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-sm">
                        {promos.map((promo) => (
                          <tr
                            key={promo.id}
                            className={`hover:bg-muted/30 transition-colors ${!promo.active ? 'opacity-65' : ''}`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Toggle
                                checked={promo.active}
                                onChange={() => handleTogglePromo(promo.id)}
                                size="sm"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-bold text-foreground bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-lg text-xs tracking-wider">
                                {promo.code}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-semibold text-foreground whitespace-nowrap">
                              {promo.type === 'percentage' && (
                                <Badge variant="primary" icon={<Percent size={11} />}>
                                  {promo.value}% di sconto
                                </Badge>
                              )}
                              {promo.type === 'first_order' && (
                                <Badge variant="warning" icon={<UserCheck size={11} />}>
                                  {promo.value}% 1° Ordine
                                </Badge>
                              )}
                              {promo.type === 'fixed_amount' && (
                                <Badge variant="success" icon={<Euro size={11} />}>
                                  € {promo.value.toFixed(2)} fisso
                                </Badge>
                              )}
                              {promo.type === 'threshold_based' && (
                                <Badge variant="info" icon={<TrendingUp size={11} />}>
                                  € {promo.value.toFixed(2)} a Soglia
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 font-medium tabular-nums whitespace-nowrap">
                              {promo.minOrderSubtotal
                                ? `€ ${promo.minOrderSubtotal.toFixed(2)}`
                                : 'Nessuno'}
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-foreground font-medium line-clamp-1">
                                {promo.description || 'Nessuna descrizione'}
                              </p>
                              {(promo.startDate || promo.endDate) && (
                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                  <Calendar size={11} />
                                  {promo.startDate
                                    ? `Dal ${new Date(promo.startDate).toLocaleDateString('it')}`
                                    : ''}
                                  {promo.endDate
                                    ? ` al ${new Date(promo.endDate).toLocaleDateString('it')}`
                                    : ' (Senza scadenza)'}
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleOpenEditModal(promo)}
                                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                  title="Modifica"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeletePromo(promo.id)}
                                  className="p-1.5 rounded-lg hover:bg-[var(--danger-bg)] text-muted-foreground hover:text-[var(--danger)] transition-colors cursor-pointer"
                                  title="Elimina"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile view: Card grid */}
                  <div className="md:hidden divide-y divide-border">
                    {promos.map((promo) => (
                      <div
                        key={`mobile-promo-${promo.id}`}
                        className={`p-5 space-y-4 hover:bg-muted/10 transition-colors ${!promo.active ? 'opacity-65' : ''}`}
                      >
                        {/* Header: Code & Toggle */}
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-lg text-xs tracking-wider">
                            {promo.code}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {promo.active ? 'Attivo' : 'Inattivo'}
                            </span>
                            <Toggle
                              checked={promo.active}
                              onChange={() => handleTogglePromo(promo.id)}
                              size="sm"
                            />
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="block text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
                              Valore Sconto
                            </span>
                            <div className="inline-block mt-0.5">
                              {promo.type === 'percentage' && (
                                <Badge variant="primary" icon={<Percent size={11} />}>
                                  {promo.value}% sconto
                                </Badge>
                              )}
                              {promo.type === 'first_order' && (
                                <Badge variant="warning" icon={<UserCheck size={11} />}>
                                  {promo.value}% 1° Ord.
                                </Badge>
                              )}
                              {promo.type === 'fixed_amount' && (
                                <Badge variant="success" icon={<Euro size={11} />}>
                                  € {promo.value.toFixed(2)} fisso
                                </Badge>
                              )}
                              {promo.type === 'threshold_based' && (
                                <Badge variant="info" icon={<TrendingUp size={11} />}>
                                  € {promo.value.toFixed(2)} Soglia
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="block text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
                              Ordine Minimo
                            </span>
                            <span className="font-medium text-foreground mt-0.5 block tabular-nums">
                              {promo.minOrderSubtotal
                                ? `€ ${promo.minOrderSubtotal.toFixed(2)}`
                                : 'Nessuno'}
                            </span>
                          </div>
                        </div>

                        {/* Description & Validity */}
                        <div className="space-y-1.5 pt-1">
                          <p className="text-sm font-medium text-foreground">
                            {promo.description || 'Nessuna descrizione'}
                          </p>
                          {(promo.startDate || promo.endDate) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Calendar size={12} />
                              <span>
                                {promo.startDate
                                  ? `Dal ${new Date(promo.startDate).toLocaleDateString('it')}`
                                  : ''}
                                {promo.endDate
                                  ? ` al ${new Date(promo.endDate).toLocaleDateString('it')}`
                                  : ' (Senza scadenza)'}
                              </span>
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                          <button
                            onClick={() => handleOpenEditModal(promo)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted hover:bg-border text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Edit2 size={13} />
                            Modifica
                          </button>
                          <button
                            onClick={() => handleDeletePromo(promo.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--danger-bg)] hover:bg-[var(--danger)] hover:text-white text-[var(--danger)] text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                            Elimina
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Add/Edit Promo Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingPromo ? 'Modifica Codice Sconto' : 'Crea Codice Sconto'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Codice Sconto *
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Es. SCONTO20, ESTATEDICI"
              className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Tipo Sconto *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="percentage">Percentuale (%)</option>
              <option value="fixed_amount">Fisso (€)</option>
              <option value="threshold_based">A Soglia (€)</option>
              <option value="first_order">Primo Ordine (%)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Valore Sconto *
            </label>
            <div className="relative">
              {type === 'percentage' || type === 'first_order' ? (
                <Percent
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
              ) : (
                <Euro
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
              )}
              <input
                type="number"
                min="0.1"
                step={type === 'percentage' || type === 'first_order' ? '1' : '0.5'}
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Spesa Minima Ordine (€)
            </label>
            <div className="relative">
              <Euro
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="number"
                min="0"
                step="1"
                required={type === 'threshold_based'}
                value={minOrderSubtotal}
                onChange={(e) => setMinOrderSubtotal(e.target.value)}
                placeholder={type === 'threshold_based' ? 'Inserisci spesa minima' : '0 per nessuna spesa minima'}
                className="w-full pl-9 pr-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Inizio Validità
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Fine Validità
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Descrizione
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Es. Offerta di primavera, riservata a clienti registrati..."
              className="w-full px-3.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring h-16 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Toggle checked={isActive} onChange={setIsActive} size="sm" />
            <span className="text-sm font-semibold text-foreground">
              Attiva subito questo codice
            </span>
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
              {editingPromo ? 'Salva Modifiche' : 'Crea Codice'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
