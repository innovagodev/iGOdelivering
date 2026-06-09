'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Save,
  Check,
  AlertTriangle,
  Settings2,
  User,
  Lock,
  Mail,
  Shield,
} from 'lucide-react';

export default function AdminImpostazioniPage() {
  const { user } = useAuth();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Loading states
  const [profileLoading, setProfileLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Maintenance state
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceUpdating, setMaintenanceUpdating] = useState(false);
  const [maintenanceSuccess, setMaintenanceSuccess] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState('');

  // Profile state
  const [adminName, setAdminName] = useState('');
  const [profileUpdating, setProfileUpdating] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    // Restore sidebar state
    const storedSidebar = localStorage.getItem('iGO_sidebar_collapsed');
    if (storedSidebar !== null) {
      setSidebarCollapsed(JSON.parse(storedSidebar));
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        setProfileLoading(true);
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();

        if (profileErr) throw profileErr;
        if (profileData) {
          setAdminName(profileData.name || '');
        }
      } catch (e) {
        console.error('Error fetching admin profile:', e);
      } finally {
        setProfileLoading(false);
      }

      try {
        setSettingsLoading(true);
        const { data: settingsData, error: settingsErr } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'maintenance_mode')
          .maybeSingle();

        if (settingsErr) throw settingsErr;
        if (settingsData && settingsData.value) {
          setMaintenanceMode(!!settingsData.value.active);
        }
      } catch (e) {
        console.error('Error fetching platform settings:', e);
      } finally {
        setSettingsLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Maintenance Save Handler
  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setMaintenanceUpdating(true);
    setMaintenanceSuccess(false);
    setMaintenanceError('');

    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          key: 'maintenance_mode',
          value: { active: maintenanceMode },
        });

      if (error) throw error;
      setMaintenanceSuccess(true);
      setTimeout(() => setMaintenanceSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setMaintenanceError(err.message || 'Errore durante il salvataggio dello stato.');
    } finally {
      setMaintenanceUpdating(false);
    }
  };

  // Profile Save Handler
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!adminName.trim()) {
      setProfileError('Il nome non può essere vuoto.');
      return;
    }

    setProfileUpdating(true);
    setProfileSuccess(false);
    setProfileError('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: adminName.trim() })
        .eq('id', user.id);

      if (error) throw error;
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setProfileError(err.message || "Errore durante l'aggiornamento del profilo.");
    } finally {
      setProfileUpdating(false);
    }
  };

  // Password Save Handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError('La password deve contenere almeno 6 caratteri.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Le password non coincidono.');
      return;
    }

    setPasswordUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setPasswordError(err.message || "Errore durante l'aggiornamento della password.");
    } finally {
      setPasswordUpdating(false);
    }
  };

  const pageLoading = profileLoading && settingsLoading;

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
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-foreground text-base flex-shrink-0">Admin</span>
              <span className="text-muted-foreground text-sm truncate">/ Impostazioni</span>
            </div>
          }
        />

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                <Settings2 size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Impostazioni Piattaforma</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Gestisci lo stato globale della piattaforma e la sicurezza del tuo account amministratore.
                </p>
              </div>
            </div>

            {pageLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground">Caricamento impostazioni...</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* 1. System Maintenance Card */}
                <form onSubmit={handleSaveMaintenance} className="bg-card rounded-2xl border border-border p-6 shadow-card space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <Shield className="text-primary" size={18} />
                      <h3 className="text-base font-bold text-foreground">Stato della Piattaforma</h3>
                    </div>
                    {maintenanceSuccess && (
                      <span className="text-xs font-semibold text-[var(--success)] flex items-center gap-1 animate-fade-in">
                        <Check size={14} /> Salvato
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4 py-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                        Modalità Manutenzione
                        {maintenanceMode && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wide">
                            Attiva
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Mette offline la piattaforma per gli utenti finali. Gli admin mantengono l&apos;accesso per gestione.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMaintenanceMode(!maintenanceMode)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                        maintenanceMode ? 'bg-amber-500' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {maintenanceMode && (
                    <div className="bg-amber-500/10 border border-amber-500/25 text-amber-500 px-4 py-3 rounded-xl flex items-start gap-2.5">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      <div className="text-xs leading-relaxed">
                        <p className="font-bold">Attenzione: la piattaforma è offline per gli utenti</p>
                        <p className="mt-0.5 text-amber-500/80">
                          I clienti e i ristoratori visualizzeranno una schermata di cortesia &quot;Lavori in corso&quot;.
                        </p>
                      </div>
                    </div>
                  )}

                  {maintenanceError && (
                    <p className="text-xs text-red-500 font-semibold">{maintenanceError}</p>
                  )}

                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="submit"
                      disabled={maintenanceUpdating}
                      className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-primary-hover transition-all duration-150 active:scale-95 disabled:opacity-50"
                    >
                      <Save size={14} />
                      {maintenanceUpdating ? 'Salvataggio...' : 'Salva Stato'}
                    </button>
                  </div>
                </form>

                {/* 2. Admin Profile Details Card */}
                <form onSubmit={handleUpdateProfile} className="bg-card rounded-2xl border border-border p-6 shadow-card space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <User className="text-primary" size={18} />
                      <h3 className="text-base font-bold text-foreground">Profilo Amministratore</h3>
                    </div>
                    {profileSuccess && (
                      <span className="text-xs font-semibold text-[var(--success)] flex items-center gap-1 animate-fade-in">
                        <Check size={14} /> Salvato
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Read-only Email Field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <Mail size={12} className="text-zinc-500" />
                        Email Account (non modificabile)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={user?.email || ''}
                        className="w-full px-3.5 py-2.5 bg-muted border border-border rounded-xl text-sm text-muted-foreground cursor-not-allowed select-none"
                      />
                    </div>

                    {/* Editable Name Field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        Nome dell&apos;Amministratore
                      </label>
                      <input
                        type="text"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="Es. Mario Rossi"
                        className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm text-foreground"
                      />
                    </div>
                  </div>

                  {profileError && (
                    <p className="text-xs text-red-500 font-semibold">{profileError}</p>
                  )}

                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="submit"
                      disabled={profileUpdating}
                      className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-primary-hover transition-all duration-150 active:scale-95 disabled:opacity-50"
                    >
                      <Save size={14} />
                      {profileUpdating ? 'Aggiornamento...' : 'Aggiorna Profilo'}
                    </button>
                  </div>
                </form>

                {/* 3. Admin Password Security Card */}
                <form onSubmit={handleUpdatePassword} className="bg-card rounded-2xl border border-border p-6 shadow-card space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <Lock className="text-primary" size={18} />
                      <h3 className="text-base font-bold text-foreground">Sicurezza Account</h3>
                    </div>
                    {passwordSuccess && (
                      <span className="text-xs font-semibold text-[var(--success)] flex items-center gap-1 animate-fade-in">
                        <Check size={14} /> Password Aggiornata
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        Nuova Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Almeno 6 caratteri"
                        className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm text-foreground"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        Conferma Nuova Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ripeti la password"
                        className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm text-foreground"
                      />
                    </div>
                  </div>

                  {passwordError && (
                    <p className="text-xs text-red-500 font-semibold">{passwordError}</p>
                  )}

                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="submit"
                      disabled={passwordUpdating}
                      className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-primary-hover transition-all duration-150 active:scale-95 disabled:opacity-50"
                    >
                      <Save size={14} />
                      {passwordUpdating ? 'Aggiornamento...' : 'Aggiorna Password'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
