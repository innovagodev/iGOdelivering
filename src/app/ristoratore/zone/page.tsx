'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Toggle from '@/components/ui/Toggle';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { DeliveryZoneConfig } from '@/types';
import { MapPin, Plus, Edit2, Trash2, Euro, Info, AlertCircle, Store } from 'lucide-react';

const defaultZones: DeliveryZoneConfig[] = [
  {
    id: 'zone-1',
    name: 'Zona Centro (Vicino)',
    radius: 2,
    minOrder: 0,
    deliveryFee: 2.0,
    freeDeliveryThreshold: 25,
    enabled: true,
  },
  {
    id: 'zone-2',
    name: 'Zona Periferia (Medio)',
    radius: 5,
    minOrder: 0,
    deliveryFee: 4.0,
    freeDeliveryThreshold: 35,
    enabled: true,
  },
  {
    id: 'zone-3',
    name: 'Fuori Comune (Lontano)',
    radius: 10,
    minOrder: 0,
    deliveryFee: 6.0,
    freeDeliveryThreshold: 50,
    enabled: false,
  },
];

export default function DeliveryZonesPage() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || 'r-001';

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [zones, setZones] = useState<DeliveryZoneConfig[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZoneConfig | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [radius, setRadius] = useState('2');
  const [minOrder, setMinOrder] = useState('0');
  const [deliveryFee, setDeliveryFee] = useState('2');
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState('25');
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    // Restore sidebar state
    const stored = localStorage.getItem('iGO_sidebar_collapsed');
    if (stored !== null) {
      setSidebarCollapsed(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedZones = localStorage.getItem(`iGO_zones_${restaurantId}`);
        if (storedZones) {
          setZones(JSON.parse(storedZones));
        } else {
          setZones(defaultZones);
          localStorage.setItem(`iGO_zones_${restaurantId}`, JSON.stringify(defaultZones));
        }
      } catch (e) {
        console.error('Error loading zones:', e);
        setZones(defaultZones);
      }
    }
  }, [restaurantId]);

  const saveZonesToStorage = (updatedZones: DeliveryZoneConfig[]) => {
    setZones(updatedZones);
    try {
      localStorage.setItem(`iGO_zones_${restaurantId}`, JSON.stringify(updatedZones));
    } catch (e) {
      console.error('Error saving zones:', e);
    }
  };

  const handleToggleZone = (id: string) => {
    const updated = zones.map((z) => (z.id === id ? { ...z, enabled: !z.enabled } : z));
    saveZonesToStorage(updated);
  };

  const handleOpenAddModal = () => {
    setEditingZone(null);
    setName('');
    setRadius('2');
    setMinOrder('0');
    setDeliveryFee('2.5');
    setFreeDeliveryThreshold('25');
    setIsEnabled(true);
    setShowModal(true);
  };

  const handleOpenEditModal = (zone: DeliveryZoneConfig) => {
    setEditingZone(zone);
    setName(zone.name);
    setRadius(zone.radius.toString());
    setMinOrder(zone.minOrder.toString());
    setDeliveryFee(zone.deliveryFee.toString());
    setFreeDeliveryThreshold(zone.freeDeliveryThreshold.toString());
    setIsEnabled(zone.enabled);
    setShowModal(true);
  };

  const handleDeleteZone = (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questa zona di consegna?')) {
      const updated = zones.filter((z) => z.id !== id);
      saveZonesToStorage(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const zoneData: DeliveryZoneConfig = {
      id: editingZone ? editingZone.id : `zone-${Date.now()}`,
      name: name.trim(),
      radius: parseFloat(radius) || 0,
      minOrder: parseFloat(minOrder) || 0,
      deliveryFee: parseFloat(deliveryFee) || 0,
      freeDeliveryThreshold: parseFloat(freeDeliveryThreshold) || 0,
      enabled: isEnabled,
    };

    let updated: DeliveryZoneConfig[];
    if (editingZone) {
      updated = zones.map((z) => (z.id === editingZone.id ? zoneData : z));
    } else {
      updated = [...zones, zoneData];
    }

    saveZonesToStorage(updated);
    setShowModal(false);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        activeSection="nav-zone"
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Gestione Zone di Consegna</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {user?.restaurantName || 'Il tuo ristorante'}
                </p>
              </div>
              <button
                onClick={handleOpenAddModal}
                className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-[#d43d22] transition-colors cursor-pointer w-full sm:w-auto"
              >
                <Plus size={16} />
                Aggiungi Zona
              </button>
            </div>

            {/* Warning or Tip Box */}
            <div className="bg-card border border-border rounded-xl p-4 flex gap-3 shadow-card">
              <Info size={20} className="text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <h4 className="font-semibold text-foreground">
                  Come funzionano le zone di consegna?
                </h4>
                <p className="text-muted-foreground mt-1 leading-relaxed">
                  Le zone di consegna consentono di specificare tariffe e ordini minimi differenti
                  in base alla distanza del cliente. Durante il checkout del cliente, il sistema
                  calcolerà la distanza per verificare in quale raggio ricade il suo indirizzo e
                  applicherà le impostazioni corrette.
                </p>
              </div>
            </div>

            {/* Zones list & Cards */}
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              {zones.length === 0 ? (
                <div className="py-12 text-center">
                  <AlertCircle size={32} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">Nessuna zona configurata</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clicca su &quot;Aggiungi Zona&quot; per iniziare.
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
                          <th className="px-6 py-4">Nome Zona</th>
                          <th className="px-6 py-4 text-right">Raggio (Km)</th>
                          <th className="px-6 py-4 text-right">Ordine Minimo</th>
                          <th className="px-6 py-4 text-right">Costo Consegna</th>
                          <th className="px-6 py-4 text-right hidden lg:table-cell">Gratis Da</th>
                          <th className="px-6 py-4 text-center">Azioni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-sm">
                        {zones.map((zone) => (
                          <tr
                            key={zone.id}
                            className={`hover:bg-muted/30 transition-colors ${!zone.enabled ? 'opacity-65' : ''}`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Toggle
                                checked={zone.enabled}
                                onChange={() => handleToggleZone(zone.id)}
                                size="sm"
                              />
                            </td>
                            <td className="px-6 py-4 font-semibold text-foreground whitespace-nowrap">
                              {zone.name}
                            </td>
                            <td className="px-6 py-4 text-right font-medium tabular-nums whitespace-nowrap">
                              {zone.radius} km
                            </td>
                            <td className="px-6 py-4 text-right font-medium tabular-nums whitespace-nowrap">
                              € {zone.minOrder.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-right font-semibold text-foreground tabular-nums whitespace-nowrap">
                              {zone.deliveryFee === 0 ? (
                                <span className="text-[var(--success)]">Gratis</span>
                              ) : (
                                `€ ${zone.deliveryFee.toFixed(2)}`
                              )}
                            </td>
                            <td className="px-6 py-4 text-right font-medium tabular-nums whitespace-nowrap hidden lg:table-cell">
                              {zone.freeDeliveryThreshold
                                ? `€ ${zone.freeDeliveryThreshold.toFixed(2)}`
                                : 'Non attivo'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleOpenEditModal(zone)}
                                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                  title="Modifica"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteZone(zone.id)}
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

                  {/* Mobile view: Cards list */}
                  <div className="md:hidden divide-y divide-border">
                    {zones.map((zone) => (
                      <div
                        key={`mobile-zone-${zone.id}`}
                        className={`p-5 space-y-4 hover:bg-muted/10 transition-colors ${!zone.enabled ? 'opacity-65' : ''}`}
                      >
                        {/* Header: Zone Name & Enable Toggle */}
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground text-sm">
                            {zone.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {zone.enabled ? 'Abilitata' : 'Disabilitata'}
                            </span>
                            <Toggle
                              checked={zone.enabled}
                              onChange={() => handleToggleZone(zone.id)}
                              size="sm"
                            />
                          </div>
                        </div>

                        {/* Raggio & Minimo */}
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="block text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
                              Raggio
                            </span>
                            <span className="font-medium text-foreground tabular-nums">
                              {zone.radius} km
                            </span>
                          </div>

                          <div>
                            <span className="block text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
                              Ordine Minimo
                            </span>
                            <span className="font-medium text-foreground tabular-nums">
                              € {zone.minOrder.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Costo & Soglia Gratis */}
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="block text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
                              Costo Consegna
                            </span>
                            <span className="font-semibold text-foreground tabular-nums">
                              {zone.deliveryFee === 0 ? (
                                <span className="text-[var(--success)]">Gratis</span>
                              ) : (
                                `€ ${zone.deliveryFee.toFixed(2)}`
                              )}
                            </span>
                          </div>

                          <div>
                            <span className="block text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
                              Gratis Da
                            </span>
                            <span className="font-medium text-foreground tabular-nums">
                              {zone.freeDeliveryThreshold
                                ? `€ ${zone.freeDeliveryThreshold.toFixed(2)}`
                                : 'Non attivo'}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                          <button
                            onClick={() => handleOpenEditModal(zone)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted hover:bg-border text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Edit2 size={13} />
                            Modifica
                          </button>
                          <button
                            onClick={() => handleDeleteZone(zone.id)}
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

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingZone ? 'Modifica Zona di Consegna' : 'Aggiungi Zona di Consegna'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Nome Zona *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Centro Storico, Zone Limitrofe"
              className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Raggio massimo (Km)
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                required
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full px-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Ordine Minimo (€)
              </label>
              <div className="relative">
                <Euro
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Costo Consegna (€)
              </label>
              <div className="relative">
                <Euro
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Consegna Gratuita Da (€)
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
                  required
                  value={freeDeliveryThreshold}
                  onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                  placeholder="Es. 30 (0 per disabilitare)"
                  className="w-full pl-9 pr-3.5 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Toggle checked={isEnabled} onChange={setIsEnabled} size="sm" />
            <span className="text-sm font-semibold text-foreground">Attiva subito questa zona</span>
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
              {editingZone ? 'Salva Modifiche' : 'Crea Zona'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
