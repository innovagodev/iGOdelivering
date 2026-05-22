'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { Save, Check, AlertCircle } from 'lucide-react';

interface GlobalSettings {
  slogan: string;
  supportEmail: string;
  supportPhone: string;
  allowRegistrations: boolean;
  maintenanceMode: boolean;
  
  // Fatturazione & Abbonamento
  trialPeriodDays: number;
  defaultCurrency: string;

  // Servizi & Integrazioni (API)
  stripeLiveMode: boolean;
  stripePublishableKey: string;
  stripeSecretKey: string;

  mapProvider: string;
  mapApiKey: string;

  twilioEnabled: boolean;
  twilioAccountSid: string;
  twilioAuthToken: string;
}

const defaultSettings: GlobalSettings = {
  slogan: 'I tuoi piatti preferiti, consegnati caldi a casa tua.',
  supportEmail: 'supporto@igodelivering.it',
  supportPhone: '+39 02 8888 9999',
  allowRegistrations: true,
  maintenanceMode: false,
  
  trialPeriodDays: 14,
  defaultCurrency: 'EUR',

  stripeLiveMode: false,
  stripePublishableKey: '',
  stripeSecretKey: '',

  mapProvider: 'google',
  mapApiKey: '',

  twilioEnabled: false,
  twilioAccountSid: '',
  twilioAuthToken: '',
};

export default function AdminImpostazioniPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [settings, setSettings] = useState<GlobalSettings>(defaultSettings);
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    // Restore sidebar state
    const storedSidebar = localStorage.getItem('iGO_sidebar_collapsed');
    if (storedSidebar !== null) {
      setSidebarCollapsed(JSON.parse(storedSidebar));
    }

    // Load global settings
    const storedSettings = localStorage.getItem('iGO_global_settings');
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (e) {
        console.error('Error parsing global settings', e);
      }
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('iGO_global_settings', JSON.stringify(settings));
    setShowSavedToast(true);
    setTimeout(() => {
      setShowSavedToast(false);
    }, 3000);
  };

  const handleChange = (field: keyof GlobalSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        activeSection="nav-impostazioni"
        onSectionChange={() => {}}
        role="admin"
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Topbar
          role="admin"
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMobileMenuOpen={() => setIsMobileOpen(true)}
          leftContent={
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground text-base">Admin</span>
              <span className="text-muted-foreground text-sm">/ Impostazioni</span>
            </div>
          }
        />

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-foreground">Impostazioni Globali</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Configura i parametri di funzionamento della piattaforma e del portale admin.
              </p>
            </div>

            {/* Toast feedback */}
            {showSavedToast && (
              <div className="bg-[var(--success-bg)] border border-[var(--success)]/20 text-foreground px-4 py-3 rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
                <Check size={18} className="text-[var(--success)]" />
                <span className="text-sm font-semibold">Impostazioni salvate con successo!</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              {/* Box 1: Platform identity */}
              <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-card">
                <h3 className="text-base font-bold text-foreground">Identità della Piattaforma</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Slogan Piattaforma
                    </label>
                    <input
                      type="text"
                      value={settings.slogan}
                      onChange={(e) => handleChange('slogan', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                      placeholder="Slogan visibile in homepage"
                    />
                  </div>
                </div>
              </div>

              {/* Box 2: Fatturazione & Abbonamento */}
              <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-card">
                <h3 className="text-base font-bold text-foreground">Fatturazione & Abbonamento</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Periodo di Prova (giorni)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={settings.trialPeriodDays}
                      onChange={(e) =>
                        handleChange('trialPeriodDays', parseInt(e.target.value, 10) || 0)
                      }
                      className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Valuta Predefinita
                    </label>
                    <select
                      value={settings.defaultCurrency}
                      onChange={(e) => handleChange('defaultCurrency', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm text-foreground"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Box 3: Servizi & Integrazioni (API) */}
              <div className="bg-card rounded-2xl border border-border p-6 space-y-6 shadow-card">
                <h3 className="text-base font-bold text-foreground">Servizi & Integrazioni (API)</h3>
                
                {/* Stripe Integration */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Integrazione Stripe</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Configura i pagamenti online per la piattaforma.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-300">
                        {settings.stripeLiveMode ? 'Live' : 'Sandbox'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleChange('stripeLiveMode', !settings.stripeLiveMode)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${settings.stripeLiveMode ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.stripeLiveMode ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        Publishable Key
                      </label>
                      <input
                        type="text"
                        value={settings.stripePublishableKey || ''}
                        onChange={(e) => handleChange('stripePublishableKey', e.target.value)}
                        placeholder="pk_test_..."
                        className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        Secret Key
                      </label>
                      <input
                        type="password"
                        value={settings.stripeSecretKey || ''}
                        onChange={(e) => handleChange('stripeSecretKey', e.target.value)}
                        placeholder="sk_test_..."
                        className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Map Provider Integration */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Provider Mappe & Geocodifica</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Seleziona il provider per il calcolo delle distanze e la visualizzazione delle mappe.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        Provider Mappe
                      </label>
                      <select
                        value={settings.mapProvider}
                        onChange={(e) => handleChange('mapProvider', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm text-foreground"
                      >
                        <option value="google">Google Maps</option>
                        <option value="mapbox">Mapbox</option>
                        <option value="openstreetmap">OpenStreetMap</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        Access Token / API Key
                      </label>
                      <input
                        type="text"
                        value={settings.mapApiKey || ''}
                        onChange={(e) => handleChange('mapApiKey', e.target.value)}
                        placeholder="Inserisci la chiave API"
                        className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Twilio SMS Integration */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Twilio (SMS Gateway)</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Invia notifiche SMS per gli aggiornamenti dello stato dell&apos;ordine.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChange('twilioEnabled', !settings.twilioEnabled)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${settings.twilioEnabled ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.twilioEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        Account SID
                      </label>
                      <input
                        type="text"
                        value={settings.twilioAccountSid || ''}
                        onChange={(e) => handleChange('twilioAccountSid', e.target.value)}
                        placeholder="AC..."
                        disabled={!settings.twilioEnabled}
                        className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        Auth Token
                      </label>
                      <input
                        type="password"
                        value={settings.twilioAuthToken || ''}
                        onChange={(e) => handleChange('twilioAuthToken', e.target.value)}
                        placeholder="••••••••••••••••••••••••••••••••"
                        disabled={!settings.twilioEnabled}
                        className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 3: Support contacts */}
              <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-card">
                <h3 className="text-base font-bold text-foreground">Supporto & Assistenza</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Email di Supporto</label>
                    <input
                      type="email"
                      value={settings.supportEmail}
                      onChange={(e) => handleChange('supportEmail', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Telefono Assistenza
                    </label>
                    <input
                      type="text"
                      value={settings.supportPhone}
                      onChange={(e) => handleChange('supportPhone', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Box 4: System Toggles */}
              <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-card">
                <h3 className="text-base font-bold text-foreground">Stato del Sistema</h3>
                <div className="space-y-4">
                  {/* Toggle 1: Allow Registrations */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Registrazione Nuovi Ristoranti
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Consenti ai nuovi ristoratori di auto-registrarsi sulla piattaforma.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleChange('allowRegistrations', !settings.allowRegistrations)
                      }
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${settings.allowRegistrations ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.allowRegistrations ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>

                  <div className="border-t border-border my-2" />

                  {/* Toggle 2: Maintenance mode */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        Modalità Manutenzione
                        {settings.maintenanceMode && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wide">
                            Attiva
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Mette offline l&apos;intera applicazione per gli utenti finali eccetto gli
                        admin.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChange('maintenanceMode', !settings.maintenanceMode)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${settings.maintenanceMode ? 'bg-amber-500' : 'bg-muted'}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.maintenanceMode ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Maintenance warning */}
              {settings.maintenanceMode && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-3 rounded-xl flex items-start gap-2.5">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold">La modalità manutenzione è abilitata!</p>
                    <p className="mt-0.5 text-amber-500/80 leading-relaxed">
                      I clienti visualizzeranno una schermata di avviso e non potranno effettuare
                      ordini o prenotazioni finché questa opzione non verrà disattivata.
                    </p>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="flex items-center justify-end pt-4 border-t border-border">
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-[#d43d22] transition-all duration-150 active:scale-95"
                >
                  <Save size={16} />
                  Salva Impostazioni
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
