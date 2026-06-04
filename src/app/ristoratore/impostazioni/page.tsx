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
  
  // Stripe Connect OAuth (mock pre-Supabase)
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeAccountLabel, setStripeAccountLabel] = useState(''); // email/nome account connesso
  const [showStripeModal, setShowStripeModal] = useState(false);
  
  // PayPal OAuth (mock pre-Supabase)
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [paypalConnected, setPaypalConnected] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [showPaypalModal, setShowPaypalModal] = useState(false);
  
  // IBAN (nessun OAuth, form diretto)
  const [ibanEnabled, setIbanEnabled] = useState(false);
  const [onlinePaymentAccount, setOnlinePaymentAccount] = useState('');
  const [ibanHolder, setIbanHolder] = useState('');

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
        
        setPaypalEnabled(data.paymentMethods?.paypal_enabled ?? (data.paymentMethods as any)?.paypal ?? false);
        setPaypalConnected(data.paymentMethods?.paypal_connected ?? false);
        setPaypalEmail(data.paymentMethods?.paypal_email || '');
        
        setStripeEnabled(data.paymentMethods?.stripe_enabled ?? false);
        setStripeConnected(data.paymentMethods?.stripe_connected ?? false);
        setStripeAccountLabel(data.paymentMethods?.stripe_account_label || '');
        // Credenziali OAuth gestite server-side post-Supabase
        
        setIbanEnabled(data.paymentMethods?.iban_enabled ?? false);
        setOnlinePaymentAccount(data.paymentMethods?.onlinePaymentAccount || '');
        setIbanHolder((data.paymentMethods as any)?.ibanHolder || '');

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
        paypal_enabled: paypalEnabled,
        paypal_connected: paypalConnected,
        paypal_email: paypalEmail,
        stripe_enabled: stripeEnabled,
        stripe_connected: stripeConnected,
        stripe_account_label: stripeAccountLabel,
        // Credenziali OAuth (stripe_account_id ecc.) gestite server-side post-Supabase
        iban_enabled: ibanEnabled,
        onlinePaymentAccount,
        ibanHolder,
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
                <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                      <Sparkles size={16} className="text-primary" />
                      Metodi di Pagamento Ristorante
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Configura i canali di pagamento per la consegna, l&apos;asporto e i pagamenti online.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Delivery POS / Cash */}
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        POS Fisico & Contanti
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1">
                        <div className="flex items-center justify-between text-sm p-3 bg-muted/20 border border-border rounded-xl">
                          <div>
                            <p className="font-semibold text-foreground">POS alla Consegna</p>
                            <p className="text-[10px] text-muted-foreground">POS portatile del corriere</p>
                          </div>
                          <Toggle checked={cardDelivery} onChange={setCardDelivery} size="sm" />
                        </div>
                        <div className="flex items-center justify-between text-sm p-3 bg-muted/20 border border-border rounded-xl">
                          <div>
                            <p className="font-semibold text-foreground">POS al Ritiro</p>
                            <p className="text-[10px] text-muted-foreground">POS in cassa per asporto</p>
                          </div>
                          <Toggle checked={cardPickup} onChange={setCardPickup} size="sm" />
                        </div>
                        <div className="flex items-center justify-between text-sm p-3 bg-muted/20 border border-border rounded-xl">
                          <div>
                            <p className="font-semibold text-foreground">Contanti alla Consegna</p>
                            <p className="text-[10px] text-muted-foreground">Pagamento al fattorino</p>
                          </div>
                          <Toggle checked={cashDelivery} onChange={setCashDelivery} size="sm" />
                        </div>
                        <div className="flex items-center justify-between text-sm p-3 bg-muted/20 border border-border rounded-xl">
                          <div>
                            <p className="font-semibold text-foreground">Contanti al Ritiro</p>
                            <p className="text-[10px] text-muted-foreground">Pagamento in cassa</p>
                          </div>
                          <Toggle checked={cashPickup} onChange={setCashPickup} size="sm" />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border/60 my-6" />

                    {/* ── STRIPE CONNECT ─────────────────────────── */}
                    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      stripeConnected
                        ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-border bg-card'
                    }`}>
                      <div className="flex items-center justify-between gap-4 p-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Stripe logo */}
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                            <svg viewBox="0 -149 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" preserveAspectRatio="xMidYMid">
                              <path d="M35.9822222,83.4844444 C35.9822222,77.9377778 40.5333333,75.8044444 48.0711111,75.8044444 C58.88,75.8044444 72.5333333,79.0755556 83.3422222,84.9066667 L83.3422222,51.4844444 C71.5377778,46.7911111 59.8755556,44.9422222 48.0711111,44.9422222 C19.2,44.9422222 0,60.0177778 0,85.1911111 C0,124.444444 54.0444444,118.186667 54.0444444,135.111111 C54.0444444,141.653333 48.3555556,143.786667 40.3911111,143.786667 C28.5866667,143.786667 13.5111111,138.951111 1.56444444,132.408889 L1.56444444,166.257778 C14.7911111,171.946667 28.16,174.364444 40.3911111,174.364444 C69.9733333,174.364444 90.3111111,159.715556 90.3111111,134.257778 C90.1688889,91.8755556 35.9822222,99.4133333 35.9822222,83.4844444 Z M132.124444,16.4977778 L97.4222222,23.8933333 L97.28,137.813333 C97.28,158.862222 113.066667,174.364444 134.115556,174.364444 C145.777778,174.364444 154.311111,172.231111 159.004444,169.671111 L159.004444,140.8 C154.453333,142.648889 131.982222,149.191111 131.982222,128.142222 L131.982222,77.6533333 L159.004444,77.6533333 L159.004444,47.36 L131.982222,47.36 L132.124444,16.4977778 Z M203.235556,57.8844444 L200.96,47.36 L170.24,47.36 L170.24,171.804444 L205.795556,171.804444 L205.795556,87.4666667 C214.186667,76.5155556 228.408889,78.5066667 232.817778,80.0711111 L232.817778,47.36 C228.266667,45.6533333 211.626667,42.5244444 203.235556,57.8844444 Z M241.493333,47.36 L277.191111,47.36 L277.191111,171.804444 L241.493333,171.804444 L241.493333,47.36 Z M241.493333,36.5511111 L277.191111,28.8711111 L277.191111,0 L241.493333,7.53777778 L241.493333,36.5511111 Z M351.431111,44.9422222 C337.493333,44.9422222 328.533333,51.4844444 323.555556,56.0355556 L321.706667,47.2177778 L290.417778,47.2177778 L290.417778,213.048889 L325.973333,205.511111 L326.115556,165.262222 C331.235556,168.96 338.773333,174.222222 351.288889,174.222222 C376.746667,174.222222 399.928889,153.742222 399.928889,108.657778 C399.786667,67.4133333 376.32,44.9422222 351.431111,44.9422222 Z M342.897778,142.933333 C334.506667,142.933333 329.528889,139.946667 326.115556,136.248889 L325.973333,83.4844444 C329.671111,79.36 334.791111,76.5155556 342.897778,76.5155556 C355.84,76.5155556 364.8,91.0222222 364.8,109.653333 C364.8,128.711111 355.982222,142.933333 342.897778,142.933333 Z M512,110.08 C512,73.6711111 494.364444,44.9422222 460.657778,44.9422222 C426.808889,44.9422222 406.328889,73.6711111 406.328889,109.795556 C406.328889,152.604444 430.506667,174.222222 465.208889,174.222222 C482.133333,174.222222 494.933333,170.382222 504.604444,164.977778 L504.604444,136.533333 C494.933333,141.368889 483.84,144.355556 469.76,144.355556 C455.964444,144.355556 443.733333,139.52 442.168889,122.737778 L511.715556,122.737778 C511.715556,120.888889 512,113.493333 512,110.08 Z M441.742222,96.5688889 C441.742222,80.4977778 451.555556,73.8133333 460.515556,73.8133333 C469.191111,73.8133333 478.435556,80.4977778 478.435556,96.5688889 L441.742222,96.5688889 L441.742222,96.5688889 Z" fill="#6772E5"/>
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-foreground">Stripe</span>
                              {stripeConnected && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Attivo
                                </span>
                              )}
                            </div>
                            {stripeConnected && stripeAccountLabel ? (
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{stripeAccountLabel}</p>
                            ) : (
                              <p className="text-[11px] text-muted-foreground">Accetta pagamenti con carta di credito online</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {stripeConnected ? (
                            <>
                              <Toggle checked={stripeEnabled} onChange={setStripeEnabled} size="sm" />
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('Vuoi disconnettere il tuo account Stripe? Il pagamento con carta online verrà disabilitato.')) {
                                    setStripeConnected(false);
                                    setStripeAccountLabel('');
                                    setStripeEnabled(false);
                                  }
                                }}
                                className="text-[10px] text-muted-foreground hover:text-destructive transition-colors underline whitespace-nowrap"
                              >
                                Disconnetti
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowStripeModal(true)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all active:scale-95 whitespace-nowrap shadow-sm"
                            >
                              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM7 5h2v2H7V5zm0 4h2v2H7V9z"/></svg>
                              Connetti Stripe →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ── PAYPAL CONNECT ──────────────────────────── */}
                    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      paypalConnected
                        ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-border bg-card'
                    }`}>
                      <div className="flex items-center justify-between gap-4 p-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" aria-label="PayPal" role="img" viewBox="0 0 512 512" className="w-5 h-5">
                              <g id="SVGRepo_bgCarrier" strokeWidth="0" />
                              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
                              <g id="SVGRepo_iconCarrier">
                                <path fill="#002c8a" d="M377 184.8L180.7 399h-72c-5 0-9-5-8-10l48-304c1-7 7-12 14-12h122c84 3 107 46 92 112z" />
                                <path fill="#009be1" d="M380.2 165c30 16 37 46 27 86-13 59-52 84-109 85l-16 1c-6 0-10 4-11 10l-13 79c-1 7-7 12-14 12h-60c-5 0-9-5-8-10l22-143c1-5 182-120 182-120z" />
                                <path fill="#001f6b" d="M197 292l20-127a14 14 0 0 1 13-11h96c23 0 40 4 54 11-5 44-26 115-128 117h-44c-5 0-10 4-11 10z" />
                              </g>
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-foreground">PayPal</span>
                              {paypalConnected && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Attivo
                                </span>
                              )}
                            </div>
                            {paypalConnected && paypalEmail ? (
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{paypalEmail}</p>
                            ) : (
                              <p className="text-[11px] text-muted-foreground">Accetta pagamenti PayPal e carte online</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {paypalConnected ? (
                            <>
                              <Toggle checked={paypalEnabled} onChange={setPaypalEnabled} size="sm" />
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('Vuoi disconnettere il tuo account PayPal?')) {
                                    setPaypalConnected(false);
                                    setPaypalEmail('');
                                    setPaypalEnabled(false);
                                  }
                                }}
                                className="text-[10px] text-muted-foreground hover:text-destructive transition-colors underline whitespace-nowrap"
                              >
                                Disconnetti
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowPaypalModal(true)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#003087] hover:bg-[#00256b] text-white text-[11px] font-bold transition-all active:scale-95 whitespace-nowrap shadow-sm"
                            >
                              Connetti PayPal →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ── IBAN ────────────────────────────────────── */}
                    <div className="rounded-2xl border border-border bg-card overflow-hidden">
                      <div className="flex items-center justify-between gap-4 p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                          </div>
                          <div>
                            <span className="text-sm font-bold text-foreground">Accredito IBAN</span>
                            <p className="text-[11px] text-muted-foreground">Mostra le coordinate bancarie ai clienti</p>
                          </div>
                        </div>
                        <Toggle checked={ibanEnabled} onChange={setIbanEnabled} size="sm" />
                      </div>
                      {ibanEnabled && (
                        <div className="px-4 pb-4 space-y-3 border-t border-border/60 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Codice IBAN</label>
                            <input
                              type="text"
                              value={onlinePaymentAccount}
                              onChange={(e) => setOnlinePaymentAccount(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ''))}
                              placeholder="IT60 X 00000 00000 000000000000"
                              maxLength={34}
                              className="w-full px-3.5 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring font-mono tracking-widest"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Intestatario Conto</label>
                            <input
                              type="text"
                              value={ibanHolder}
                              onChange={(e) => setIbanHolder(e.target.value)}
                              placeholder="Nome Cognome / Ragione Sociale"
                              className="w-full px-3.5 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* STRIPE CONNECT MODAL                                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showStripeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <svg viewBox="0 -149 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" preserveAspectRatio="xMidYMid">
                  <path d="M35.9822222,83.4844444 C35.9822222,77.9377778 40.5333333,75.8044444 48.0711111,75.8044444 C58.88,75.8044444 72.5333333,79.0755556 83.3422222,84.9066667 L83.3422222,51.4844444 C71.5377778,46.7911111 59.8755556,44.9422222 48.0711111,44.9422222 C19.2,44.9422222 0,60.0177778 0,85.1911111 C0,124.444444 54.0444444,118.186667 54.0444444,135.111111 C54.0444444,141.653333 48.3555556,143.786667 40.3911111,143.786667 C28.5866667,143.786667 13.5111111,138.951111 1.56444444,132.408889 L1.56444444,166.257778 C14.7911111,171.946667 28.16,174.364444 40.3911111,174.364444 C69.9733333,174.364444 90.3111111,159.715556 90.3111111,134.257778 C90.1688889,91.8755556 35.9822222,99.4133333 35.9822222,83.4844444 Z M132.124444,16.4977778 L97.4222222,23.8933333 L97.28,137.813333 C97.28,158.862222 113.066667,174.364444 134.115556,174.364444 C145.777778,174.364444 154.311111,172.231111 159.004444,169.671111 L159.004444,140.8 C154.453333,142.648889 131.982222,149.191111 131.982222,128.142222 L131.982222,77.6533333 L159.004444,77.6533333 L159.004444,47.36 L131.982222,47.36 L132.124444,16.4977778 Z M203.235556,57.8844444 L200.96,47.36 L170.24,47.36 L170.24,171.804444 L205.795556,171.804444 L205.795556,87.4666667 C214.186667,76.5155556 228.408889,78.5066667 232.817778,80.0711111 L232.817778,47.36 C228.266667,45.6533333 211.626667,42.5244444 203.235556,57.8844444 Z M241.493333,47.36 L277.191111,47.36 L277.191111,171.804444 L241.493333,171.804444 L241.493333,47.36 Z M241.493333,36.5511111 L277.191111,28.8711111 L277.191111,0 L241.493333,7.53777778 L241.493333,36.5511111 Z M351.431111,44.9422222 C337.493333,44.9422222 328.533333,51.4844444 323.555556,56.0355556 L321.706667,47.2177778 L290.417778,47.2177778 L290.417778,213.048889 L325.973333,205.511111 L326.115556,165.262222 C331.235556,168.96 338.773333,174.222222 351.288889,174.222222 C376.746667,174.222222 399.928889,153.742222 399.928889,108.657778 C399.786667,67.4133333 376.32,44.9422222 351.431111,44.9422222 Z M342.897778,142.933333 C334.506667,142.933333 329.528889,139.946667 326.115556,136.248889 L325.973333,83.4844444 C329.671111,79.36 334.791111,76.5155556 342.897778,76.5155556 C355.84,76.5155556 364.8,91.0222222 364.8,109.653333 C364.8,128.711111 355.982222,142.933333 342.897778,142.933333 Z M512,110.08 C512,73.6711111 494.364444,44.9422222 460.657778,44.9422222 C426.808889,44.9422222 406.328889,73.6711111 406.328889,109.795556 C406.328889,152.604444 430.506667,174.222222 465.208889,174.222222 C482.133333,174.222222 494.933333,170.382222 504.604444,164.977778 L504.604444,136.533333 C494.933333,141.368889 483.84,144.355556 469.76,144.355556 C455.964444,144.355556 443.733333,139.52 442.168889,122.737778 L511.715556,122.737778 C511.715556,120.888889 512,113.493333 512,110.08 Z M441.742222,96.5688889 C441.742222,80.4977778 451.555556,73.8133333 460.515556,73.8133333 C469.191111,73.8133333 478.435556,80.4977778 478.435556,96.5688889 L441.742222,96.5688889 L441.742222,96.5688889 Z" fill="#6772E5"/>
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Connetti il tuo account Stripe</h3>
                <p className="text-xs text-muted-foreground">Pochi click, nessuna chiave da copiare</p>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3 mb-5">
              {[
                { n: '1', text: 'Verrai reindirizzato alla pagina di autorizzazione di Stripe' },
                { n: '2', text: 'Accedi con il tuo account Stripe (o creane uno gratuito)' },
                { n: '3', text: 'Autorizza iGOdelivering ad accettare pagamenti per te' },
                { n: '4', text: 'Torni qui con il tuo account Stripe collegato ✓' },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.n}</span>
                  <p className="text-sm text-foreground/80">{s.text}</p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl mb-5">
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                <strong>Nota:</strong> La connessione OAuth con Stripe sarà attiva dopo la migrazione al database. Per ora, simuliamo la connessione per testare il flusso.
              </p>
            </div>

            {/* Mock: chiedi email account */}
            <div className="space-y-1 mb-4">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email del tuo account Stripe (demo)</label>
              <input
                type="email"
                placeholder="tuaemail@esempio.it"
                className="w-full px-3.5 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                id="stripe-connect-email-input"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowStripeModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  const emailInput = document.getElementById('stripe-connect-email-input') as HTMLInputElement;
                  const emailVal = emailInput?.value?.trim() || 'account@stripe.com';
                  setStripeConnected(true);
                  setStripeEnabled(true);
                  setStripeAccountLabel(emailVal);
                  setShowStripeModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all active:scale-95 shadow-sm"
              >
                Connetti a Stripe →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PAYPAL CONNECT MODAL                                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showPaypalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" aria-label="PayPal" role="img" viewBox="0 0 512 512" className="w-6 h-6">
                  <g id="SVGRepo_bgCarrier" strokeWidth="0" />
                  <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
                  <g id="SVGRepo_iconCarrier">
                    <path fill="#002c8a" d="M377 184.8L180.7 399h-72c-5 0-9-5-8-10l48-304c1-7 7-12 14-12h122c84 3 107 46 92 112z" />
                    <path fill="#009be1" d="M380.2 165c30 16 37 46 27 86-13 59-52 84-109 85l-16 1c-6 0-10 4-11 10l-13 79c-1 7-7 12-14 12h-60c-5 0-9-5-8-10l22-143c1-5 182-120 182-120z" />
                    <path fill="#001f6b" d="M197 292l20-127a14 14 0 0 1 13-11h96c23 0 40 4 54 11-5 44-26 115-128 117h-44c-5 0-10 4-11 10z" />
                  </g>
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Connetti il tuo account PayPal</h3>
                <p className="text-xs text-muted-foreground">Autorizza iGOdelivering a ricevere pagamenti per te</p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              {[
                { n: '1', text: 'Verrai reindirizzato a PayPal per autorizzare la connessione' },
                { n: '2', text: 'Accedi con il tuo account PayPal Business' },
                { n: '3', text: 'Conferma le autorizzazioni per iGOdelivering' },
                { n: '4', text: 'Il tuo account è collegato, i clienti potranno pagarti con PayPal ✓' },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.n}</span>
                  <p className="text-sm text-foreground/80">{s.text}</p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl mb-5">
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                <strong>Nota:</strong> L&apos;integrazione OAuth con PayPal sarà attiva dopo la migrazione al database. Per ora, simuliamo la connessione per testare il flusso.
              </p>
            </div>

            <div className="space-y-1 mb-4">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email account PayPal Business (demo)</label>
              <input
                type="email"
                placeholder="tuaemail@paypal.com"
                className="w-full px-3.5 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                id="paypal-connect-email-input"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPaypalModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  const emailInput = document.getElementById('paypal-connect-email-input') as HTMLInputElement;
                  const emailVal = emailInput?.value?.trim() || 'account@paypal.com';
                  setPaypalConnected(true);
                  setPaypalEnabled(true);
                  setPaypalEmail(emailVal);
                  setShowPaypalModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#003087] hover:bg-[#00256b] text-white text-sm font-bold transition-all active:scale-95 shadow-sm"
              >
                Connetti a PayPal →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
