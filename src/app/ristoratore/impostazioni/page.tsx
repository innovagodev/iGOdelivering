'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Toggle from '@/components/ui/Toggle';
import { useAuth } from '@/context/AuthContext';
import { Settings, Save, Sparkles, AlertCircle, CheckCircle, Camera, Store, Link as LinkIcon, Copy, Download, Printer } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

import { STORAGE_KEYS } from '@/lib/storage-keys';
import { RestaurantSettingsFull as SettingsData } from '@/types/settings';
import { isMockRestaurant } from '@/lib/restaurant-utils';
import ScheduledOrdersStep from '@/components/admin/restaurant-wizard/ScheduledOrdersStep';
import { ScheduledOrdersConfig } from '@/types';
import { TIME_UNITS, TIME_WINDOWS } from '@/lib/constants';

export default function ImpostazioniPage() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || 'r-001';

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Hydration state & Copy/QR actions
  const [isHydrated, setIsHydrated] = useState(false);
  const [copied, setCopied] = useState(false);

  const restaurantSlug = user?.restaurantName
    ? user.restaurantName
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '')
    : 'pizzeria-bella-napoli';

  const showcaseUrl = isHydrated && typeof window !== 'undefined'
    ? `${window.location.origin}/menu/${restaurantSlug}`
    : `https://igodelivering.it/menu/${restaurantSlug}`;

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(showcaseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    const canvas = document.getElementById('showcase-qr-canvas') as HTMLCanvasElement;
    if (canvas) {
      try {
        const url = canvas.toDataURL("image/png");
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-vetrina-${restaurantSlug}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      } catch (e) {
        console.error("Canvas export failed", e);
      }
    }
  };

  const handlePrintQr = () => {
    const canvas = document.getElementById('showcase-qr-canvas') as HTMLCanvasElement;
    let qrDataUrl = '';
    if (canvas) {
      try {
        qrDataUrl = canvas.toDataURL("image/png");
      } catch (e) { }
    }
    if (!qrDataUrl) {
      qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(showcaseUrl)}&ecc=H`;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const restName = profileName || user?.restaurantName || 'Il mio Ristorante';
    const logoHtml = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <div style="font-size: 14px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;">${restName}</div>
      </div>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Stampa QR Code - Vetrina ${restName}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #fff;
            }
            .card {
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 24px;
              text-align: center;
              width: 280px;
              height: 280px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              box-sizing: border-box;
              box-shadow: none;
            }
            .qr-wrapper {
              position: relative;
              display: inline-block;
              width: 170px;
              height: 170px;
              margin: 0 auto;
            }
            .qr-image {
              width: 170px;
              height: 170px;
              display: block;
            }
            .title-badge {
              background-color: #f97316;
              color: white;
              font-size: 14px;
              font-weight: 800;
              padding: 4px 14px;
              border-radius: 9999px;
              letter-spacing: 0.05em;
              display: inline-block;
            }
            .footer-text {
              font-size: 10px;
              color: #64748b;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            @media print {
              body { height: auto; }
              @page { size: portrait; margin: 0; }
              .card { border: 1px solid #cbd5e1 !important; box-shadow: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            ${logoHtml}
            <div class="qr-wrapper">
              <img class="qr-image" src="${qrDataUrl}" alt="QR Code" />
            </div>
            <div>
              <div class="title-badge">MENU DIGITALE</div>
              <div class="footer-text" style="margin-top: 6px;">Inquadra e Ordina</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 800);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Form states
  const [profileName, setProfileName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

  const isEmailValid = React.useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, [email]);
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
  const [onlinePaymentAccount, setOnlinePaymentAccount] = useState('');

  const [scheduledOrders, setScheduledOrders] = useState<ScheduledOrdersConfig>({
    enabled: true,
    pickup: { minNoticeValue: 30, minNoticeUnit: 'minuti', maxNoticeDays: 4 },
    delivery: { minNoticeValue: 1, minNoticeUnit: 'ore', maxNoticeDays: 4, timeWindowMinutes: 15 },
    onPremise: { minNoticeValue: 30, minNoticeUnit: 'minuti', maxNoticeDays: 1 },
    hideAsap: false,
    pickupExpanded: true,
    deliveryExpanded: true,
    onPremiseExpanded: true,
    altroExpanded: true,
  });

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
        const storedStr = localStorage.getItem(STORAGE_KEYS.settings(restaurantId));
        let data: SettingsData;

        if (storedStr) {
          data = JSON.parse(storedStr);
        } else if (!isMockRestaurant(restaurantId)) {
          // Defaults for newly created custom restaurants (clean slate)
          data = {
            profile: {
              name: user?.restaurantName || '',
              logoUrl: '',
              category: '',
              address: '',
              phone: '',
              email: user?.email || '',
              tagline: '',
            },
            orderModes: {
              delivery: false,
              pickup: false,
              table: false,
            },
            deliveryConfig: {
              fixedFee: 0,
              minOrder: 0,
              freeDeliveryThreshold: 0,
              freeDeliveryActive: false,
            },
            paymentMethods: {
              card_delivery: false,
              card_pickup: false,
              cash_delivery: false,
              cash_pickup: false,
            },
          };
          localStorage.setItem(STORAGE_KEYS.settings(restaurantId), JSON.stringify(data));
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
          localStorage.setItem(STORAGE_KEYS.settings(restaurantId), JSON.stringify(data));
        }

        // Hydrate state
        setProfileName(data.profile.name || '');
        setLogoUrl(data.profile.logoUrl || '');
        setCategory(data.profile.category || '');
        setAddress(data.profile.address || '');
        setPhone(data.profile.phone || '');
        setEmail(data.profile.email || '');
        setTagline(data.profile.tagline || data.profile.description || '');

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
        setOnlinePaymentAccount(data.paymentMethods?.onlinePaymentAccount || '');

        if (data.scheduledOrders) {
          setScheduledOrders(data.scheduledOrders);
        }
      } catch (e) {
        console.error('Error parsing settings:', e);
      }
    }
  }, [restaurantId, user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid) {
      setEmailTouched(true);
      return;
    }

    const updatedData: SettingsData = {
      profile: {
        name: profileName,
        logoUrl,
        category,
        address,
        phone,
        email,
        tagline,
        description: tagline,
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
        onlinePaymentAccount,
      },
      scheduledOrders,
    };

    try {
      localStorage.setItem(STORAGE_KEYS.settings(restaurantId), JSON.stringify(updatedData));

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
        onSectionChange={() => { }}
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
                          onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
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
                          onChange={(e) => {
                            setEmail(e.target.value);
                          }}
                          onBlur={() => setEmailTouched(true)}
                          className="w-full px-3.5 py-2 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        {emailTouched && email && !isEmailValid && (
                          <p className="text-xs text-red-500 font-semibold mt-1">
                            Inserisci un indirizzo email valido.
                          </p>
                        )}
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

                {/* Scheduled Orders Configuration */}
                <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
                  <ScheduledOrdersStep
                    scheduledOrders={scheduledOrders}
                    setScheduledOrders={setScheduledOrders}
                    timeUnits={TIME_UNITS}
                    timeWindows={TIME_WINDOWS}
                  />
                </div>
              </div>

              {/* Order Modes & Payments (Right Column) */}
              <div className="space-y-6">
                {/* Link & QR Code Vetrina */}
                <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2 pb-3 border-b border-border">
                    <LinkIcon size={16} className="text-primary" />
                    Link & QR Code Vetrina
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    Condividi il link della tua vetrina digitale o scarica il QR Code da stampare per asporto e consegne.
                  </p>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Link Vetrina Pubblica
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={showcaseUrl}
                          className="flex-1 px-3 py-2 text-xs bg-muted border border-border rounded-xl focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="px-3 py-2 bg-secondary hover:bg-muted text-foreground border border-border rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {copied ? <CheckCircle size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                          {copied ? 'Copiato' : 'Copia'}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-xl border border-border/60 relative min-h-[148px]">
                      <QRCodeCanvas
                        id="showcase-qr-canvas"
                        value={showcaseUrl}
                        size={512}
                        level="H"
                        includeMargin={true}
                        style={{ width: "120px", height: "120px" }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadQr}
                        className="flex items-center justify-center gap-1 py-2 px-2 bg-secondary text-foreground hover:bg-muted rounded-lg text-xs font-semibold transition-colors border border-border cursor-pointer"
                      >
                        <Download size={12} className="text-muted-foreground" />
                        Scarica QR
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintQr}
                        className="flex items-center justify-center gap-1 py-2 px-2 bg-secondary text-foreground hover:bg-muted rounded-lg text-xs font-semibold transition-colors border border-border cursor-pointer"
                      >
                        <Printer size={12} className="text-muted-foreground" />
                        Stampa QR
                      </button>
                    </div>
                  </div>
                </div>

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

                    {/* Conto di Accredito Section */}
                    <div className="pt-3 border-t border-border/40 space-y-2">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Conto di Accredito
                      </h4>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        IBAN / Conto di accredito pagamenti online
                      </label>
                      <input
                        type="text"
                        value={onlinePaymentAccount}
                        onChange={(e) => setOnlinePaymentAccount(e.target.value)}
                        placeholder="Inserisci l'IBAN per ricevere i pagamenti"
                        className="w-full px-3.5 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                      />
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
