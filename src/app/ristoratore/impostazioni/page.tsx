'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Toggle from '@/components/ui/Toggle';
import { useAuth } from '@/context/AuthContext';
import { Settings, Save, Sparkles, AlertCircle, CheckCircle, Camera, Store } from 'lucide-react';

interface SettingsData {
  profile: {
    name: string;
    logoUrl: string;
    category: string;
    address: string;
    phone: string;
    email: string;
    tagline: string;
  };
  orderModes: {
    delivery: boolean;
    pickup: boolean;
    table: boolean;
  };
  deliveryConfig: {
    fixedFee: number;
    minOrder: number;
    freeDeliveryThreshold: number;
    freeDeliveryActive: boolean;
  };
  paymentMethods: {
    card_delivery: boolean;
    card_pickup: boolean;
    cash_delivery: boolean;
    cash_pickup: boolean;
  };
}

export default function ImpostazioniPage() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || 'r-001';

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Form states
  const [profileName, setProfileName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tagline, setTagline] = useState('');

  const [deliveryMode, setDeliveryMode] = useState(true);
  const [pickupMode, setPickupMode] = useState(true);
  const [tableMode, setTableMode] = useState(true);

  const [fixedFee, setFixedFee] = useState('2.5');
  const [minOrder, setMinOrder] = useState('0');
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState('25');
  const [freeDeliveryActive, setFreeDeliveryActive] = useState(true);

  const [cardDelivery, setCardDelivery] = useState(true);
  const [cardPickup, setCardPickup] = useState(true);
  const [cashDelivery, setCashDelivery] = useState(true);
  const [cashPickup, setCashPickup] = useState(true);

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
        const storedStr = localStorage.getItem(`iGO_settings_${restaurantId}`);
        let data: SettingsData;

        if (storedStr) {
          data = JSON.parse(storedStr);
        } else {
          // Defaults based on auth user
          data = {
            profile: {
              name: user?.restaurantName || 'Pizzeria Bella Napoli',
              logoUrl:
                user?.restaurantLogo ||
                'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=150',
              category: 'Pizzeria / Italiana',
              address: 'Via Roma 12, Milano',
              phone: '+39 02 1234567',
              email: user?.email || 'info@bellanapoli.it',
              tagline: 'La vera pizza napoletana a casa tua',
            },
            orderModes: {
              delivery: true,
              pickup: true,
              table: true,
            },
            deliveryConfig: {
              fixedFee: 2.5,
              minOrder: 0,
              freeDeliveryThreshold: 25,
              freeDeliveryActive: true,
            },
            paymentMethods: {
              card_delivery: true,
              card_pickup: true,
              cash_delivery: true,
              cash_pickup: true,
            },
          };
          localStorage.setItem(`iGO_settings_${restaurantId}`, JSON.stringify(data));
        }

        // Hydrate state
        setProfileName(data.profile.name || '');
        setLogoUrl(data.profile.logoUrl || '');
        setCategory(data.profile.category || '');
        setAddress(data.profile.address || '');
        setPhone(data.profile.phone || '');
        setEmail(data.profile.email || '');
        setTagline(data.profile.tagline || '');

        setDeliveryMode(data.orderModes.delivery !== false);
        setPickupMode(data.orderModes.pickup !== false);
        setTableMode(data.orderModes.table !== false);

        setFixedFee((data.deliveryConfig?.fixedFee ?? 2.5).toString());
        setMinOrder((data.deliveryConfig?.minOrder ?? 10).toString());
        setFreeDeliveryThreshold((data.deliveryConfig?.freeDeliveryThreshold ?? 25).toString());
        setFreeDeliveryActive(data.deliveryConfig?.freeDeliveryActive !== false);

        setCardDelivery(data.paymentMethods?.card_delivery !== false);
        setCardPickup(data.paymentMethods?.card_pickup !== false);
        setCashDelivery(data.paymentMethods?.cash_delivery !== false);
        setCashPickup(data.paymentMethods?.cash_pickup !== false);
      } catch (e) {
        console.error('Error parsing settings:', e);
      }
    }
  }, [restaurantId, user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedData: SettingsData = {
      profile: {
        name: profileName,
        logoUrl,
        category,
        address,
        phone,
        email,
        tagline,
      },
      orderModes: {
        delivery: deliveryMode,
        pickup: pickupMode,
        table: tableMode,
      },
      deliveryConfig: {
        fixedFee: parseFloat(fixedFee) || 0,
        minOrder: parseFloat(minOrder) || 0,
        freeDeliveryThreshold: parseFloat(freeDeliveryThreshold) || 0,
        freeDeliveryActive,
      },
      paymentMethods: {
        card_delivery: cardDelivery,
        card_pickup: cardPickup,
        cash_delivery: cashDelivery,
        cash_pickup: cashPickup,
      },
    };

    try {
      localStorage.setItem(`iGO_settings_${restaurantId}`, JSON.stringify(updatedData));

      // Also update matching general parameters used in slug menu page
      localStorage.setItem(
        `iGO_settings_${restaurantId.replace('r-', 'pizzeria-')}`,
        JSON.stringify(updatedData)
      );

      // Trigger update event
      window.dispatchEvent(new Event('iGO_settings_updated'));

      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 3000);
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        activeSection="nav-impostazioni"
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
          <form
            onSubmit={handleSave}
            className="max-w-screen-xl mx-auto px-6 lg:px-8 py-6 space-y-6"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Impostazioni Ristorante</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {user?.restaurantName || 'Il tuo ristorante'}
                </p>
              </div>
              <button
                type="submit"
                className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-[#d43d22] transition-colors cursor-pointer w-full sm:w-auto"
              >
                <Save size={16} />
                Salva Modifiche
              </button>
            </div>

            {/* Success Feedback Notification */}
            {showFeedback && (
              <div className="bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
                <CheckCircle size={20} className="text-[var(--success)] flex-shrink-0" />
                <p className="text-sm font-semibold text-foreground">
                  Impostazioni salvate con successo! Ricarica per applicare le modifiche globali.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card & Order Modes (Left Col - spans 2) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Profile Edit */}
                <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2 pb-3 border-b border-border">
                    <Sparkles size={16} className="text-primary" />
                    Profilo Ristorante
                  </h3>

                  <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                    <div className="relative group cursor-pointer w-24 h-24 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center shadow-xs">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Camera size={24} className="text-muted-foreground" />
                      )}
                      <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Camera size={20} className="text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setLogoUrl(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="flex-1 w-full space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Nome Ristorante
                          </label>
                          <input
                            type="text"
                            required
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            className="w-full px-3.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Categoria cucina
                          </label>
                          <input
                            type="text"
                            required
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="Es. Pizza / Italiana, Giapponese"
                            className="w-full px-3.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Logo Ristorante
                        </label>
                        {logoUrl ? (
                          <div className="flex items-center gap-4 p-3 bg-muted/30 border border-border rounded-xl">
                            <img src={logoUrl} alt="Logo Preview" className="h-12 w-24 object-contain bg-white rounded border p-1" />
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-foreground">Logo caricato</p>
                              <p className="text-[10px] text-muted-foreground">Immagine salvata nel profilo</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setLogoUrl('')}
                              className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                            >
                              Rimuovi
                            </button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-4 transition-colors flex flex-col items-center justify-center gap-1.5 bg-muted/10 relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setLogoUrl(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <Camera size={20} className="text-muted-foreground" />
                            <div className="text-center">
                              <p className="text-xs font-bold text-foreground">Trascina o clicca per caricare</p>
                              <p className="text-[10px] text-muted-foreground">PNG, JPG o SVG fino a 2MB</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Slogan / Descrizione breve
                      </label>
                      <input
                        type="text"
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        placeholder="Es. La migliore pizza cotta nel forno a legna"
                        className="w-full px-3.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Indirizzo ristorante
                      </label>
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Telefono
                        </label>
                        <input
                          type="text"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Email Contatto
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-3.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Configuration */}
                <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2 pb-3 border-b border-border">
                    <Sparkles size={16} className="text-primary" />
                    Configurazione Consegna
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Costo Fisso Consegna (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        required
                        value={fixedFee}
                        onChange={(e) => setFixedFee(e.target.value)}
                        className="w-full px-3.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Ordine Minimo (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        required
                        value={minOrder}
                        onChange={(e) => setMinOrder(e.target.value)}
                        className="w-full px-3.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Soglia Consegna Gratuita (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={freeDeliveryThreshold}
                        onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                        className="w-full px-3.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Toggle
                      checked={freeDeliveryActive}
                      onChange={setFreeDeliveryActive}
                      size="sm"
                    />
                    <span className="text-sm font-semibold text-foreground">
                      Attiva soglia di consegna gratuita
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Modes & Payments (Right Column) */}
              <div className="space-y-6">
                {/* Order Modes */}
                <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2 pb-3 border-b border-border">
                    <Sparkles size={16} className="text-primary" />
                    Modalità Ordinazione
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    Abilita o disabilita i canali di ordinazione per il cliente.
                  </p>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between py-2 border-b border-border/40">
                      <div>
                        <p className="text-sm font-bold text-foreground">Consegna a domicilio</p>
                        <p className="text-[11px] text-muted-foreground">
                          Il corriere consegna a casa
                        </p>
                      </div>
                      <Toggle checked={deliveryMode} onChange={setDeliveryMode} size="sm" />
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-border/40">
                      <div>
                        <p className="text-sm font-bold text-foreground">Asporto</p>
                        <p className="text-[11px] text-muted-foreground">
                          Ritiro direttamente in locale
                        </p>
                      </div>
                      <Toggle checked={pickupMode} onChange={setPickupMode} size="sm" />
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-bold text-foreground">Ordinazione al tavolo</p>
                        <p className="text-[11px] text-muted-foreground">
                          Ordinazione interna con QR Code
                        </p>
                      </div>
                      <Toggle checked={tableMode} onChange={setTableMode} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2 pb-3 border-b border-border">
                    <Sparkles size={16} className="text-primary" />
                    Metodi di Pagamento
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    Configura quali metodi sono accettati per ogni canale.
                  </p>

                  <div className="space-y-4 pt-2">
                    {/* Delivery Section */}
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Per Consegna a domicilio
                      </h4>
                      <div className="space-y-2 pl-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">Carta di credito (online)</span>
                          <Toggle checked={cardDelivery} onChange={setCardDelivery} size="sm" />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">Contanti alla consegna</span>
                          <Toggle checked={cashDelivery} onChange={setCashDelivery} size="sm" />
                        </div>
                      </div>
                    </div>

                    {/* Pickup Section */}
                    <div className="pt-2 border-t border-border/40">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Per Asporto / Ritiro
                      </h4>
                      <div className="space-y-2 pl-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">Carta di credito (online)</span>
                          <Toggle checked={cardPickup} onChange={setCardPickup} size="sm" />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">Contanti al ritiro</span>
                          <Toggle checked={cashPickup} onChange={setCashPickup} size="sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
