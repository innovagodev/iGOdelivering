'use client';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import AppLogo from '@/components/ui/AppLogo';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, Mail, Lock, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

interface LoginForm {
  email: string;
  password: string;
  remember: boolean;
}

interface ChangePasswordForm {
  newPassword: string;
  confirmPassword: string;
}

// ── PasswordInput ─────────────────────────────────────────────────────────────
function PasswordInput({
  id,
  placeholder,
  hasError,
  registration,
}: {
  id: string;
  placeholder: string;
  hasError?: boolean;
  registration: Record<string, unknown>;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete="current-password"
        className={`w-full pl-9 pr-10 py-3 text-base bg-input border rounded-xl focus:outline-none transition-colors ${hasError ? 'border-[var(--danger)]' : 'border-border'}`}
        {...registration}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
        aria-label={show ? 'Nascondi password' : 'Mostra password'}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [view, setView] = useState<'login' | 'forgot-password'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const loginForm = useForm<LoginForm>({
    defaultValues: { email: '', password: '', remember: false },
  });
  const changePasswordForm = useForm<ChangePasswordForm>({
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setLoginLoading(true);
    setLoginError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setLoginError(error.message);
        setLoginLoading(false);
        return;
      }
      setResetEmailSent(true);
      setLoginLoading(false);
    } catch (err: any) {
      console.error(err);
      setLoginError('Impossibile inviare il link di ripristino.');
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'suspended') {
        setLoginError(
          "Il tuo account ristorante è stato sospeso dall'amministratore. Contatta il supporto per assistenza."
        );
      }
    }
  }, []);

  const handleLogin = loginForm.handleSubmit(async (data) => {
    setLoginLoading(true);
    setLoginError('');

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        setLoginError(
          error.message === 'Invalid login credentials' ? 'Credenziali non valide.' : error.message
        );
        setLoginLoading(false);
        return;
      }

      const user = authData.user;
      if (user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!profile) {
          await supabase.auth.signOut();
          setLoginError('Profilo utente non trovato.');
          setLoginLoading(false);
          return;
        }

        if (profile.role === 'ristoratore') {
          const { data: restaurant } = await supabase
            .from('restaurants')
            .select('status')
            .eq('owner_id', user.id)
            .maybeSingle();

          if (restaurant && restaurant.status === 'suspended') {
            await supabase.auth.signOut();
            document.cookie = 'igodelivering_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            setLoginError(
              "Il tuo account ristorante è stato sospeso dall'amministratore. Contatta il supporto per assistenza."
            );
            setLoginLoading(false);
            return;
          }
        }

        // Set role cookie for middleware redirect rules
        document.cookie = `igodelivering_role=${profile.role}; path=/; max-age=86400; SameSite=Lax`;

        // Check if first login is required
        if (user.user_metadata?.is_first_login) {
          setIsFirstLogin(true);
          setPendingEmail(data.email);
          setLoginLoading(false);
        } else {
          window.location.href =
            profile.role === 'admin' ? '/admin/dashboard' : '/ristoratore/dashboard';
        }
      }
    } catch (err: any) {
      console.error(err);
      setLoginError("Si è verificato un errore durante l'accesso.");
      setLoginLoading(false);
    }
  });

  const handleChangePassword = changePasswordForm.handleSubmit(async (data) => {
    setLoginLoading(true);
    setLoginError('');
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
        data: { is_first_login: false },
      });

      if (error) {
        setLoginError(error.message);
        setLoginLoading(false);
        return;
      }

      window.location.href = '/ristoratore/dashboard';
    } catch (err: any) {
      console.error(err);
      setLoginError('Errore durante il cambio password.');
      setLoginLoading(false);
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 relative overflow-hidden">
      {/* Background ambient glowing details for security-focused aesthetic */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-primary/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] aspect-square rounded-full bg-orange-600/5 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-8 md:p-10 shadow-xl relative z-10">
        {/* Top Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center justify-center p-2">
            <AppLogo size={100} />
          </div>
        </div>

        {view === 'forgot-password' ? (
          <>
            {!resetEmailSent && (
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-foreground mb-1.5">Ripristina Password</h1>
                <p className="text-muted-foreground text-sm">
                  Inserisci l&apos;indirizzo email associato al tuo account per ricevere le
                  istruzioni di ripristino.
                </p>
              </div>
            )}

            {!resetEmailSent ? (
              <form
                key="forgot-password-form"
                onSubmit={handleForgotPassword}
                className="space-y-4"
              >
                {/* Email */}
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-sm font-semibold text-foreground mb-1.5"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      placeholder="nome@ristorante.it"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-3 text-base bg-input border border-border rounded-xl focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {loginError && (
                  <div className="bg-[var(--danger-bg)] border border-red-200 rounded-xl px-4 py-3 text-sm text-[var(--danger)] flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover disabled:opacity-70 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  {loginLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Invio in corso...
                    </>
                  ) : (
                    <>Invia link di ripristino</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setView('login');
                    setLoginError('');
                  }}
                  className="w-full py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Torna al Login
                </button>
              </form>
            ) : (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground">Link Inviato!</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Abbiamo inviato le istruzioni di ripristino all&apos;indirizzo{' '}
                    <strong className="text-foreground">{forgotEmail}</strong>. Controlla la tua
                    casella di posta.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setView('login');
                    setLoginError('');
                    setResetEmailSent(false);
                  }}
                  className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-colors text-sm cursor-pointer"
                >
                  Accedi
                </button>
              </div>
            )}
          </>
        ) : !isFirstLogin ? (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-foreground mb-1.5">Accesso Pannello</h1>
              <p className="text-muted-foreground text-sm">
                Inserisci le credenziali per accedere al tuo pannello di gestione.
              </p>
            </div>

            <form key="login-form" onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-sm font-semibold text-foreground mb-1.5"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="nome@ristorante.it"
                    {...loginForm.register('email', {
                      required: 'Email obbligatoria',
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email non valida' },
                    })}
                    className={`w-full pl-9 pr-3 py-3 text-base bg-input border rounded-xl focus:outline-none transition-colors ${loginForm.formState.errors.email ? 'border-[var(--danger)]' : 'border-border'}`}
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="mt-1.5 text-xs text-[var(--danger)]">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-semibold text-foreground"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setView('forgot-password');
                      setLoginError('');
                      setResetEmailSent(false);
                    }}
                    className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors cursor-pointer"
                  >
                    Dimenticata?
                  </button>
                </div>
                <PasswordInput
                  id="login-password"
                  placeholder="Password"
                  hasError={!!loginForm.formState.errors.password}
                  registration={loginForm.register('password', {
                    required: 'Password obbligatoria',
                  })}
                />
                {loginForm.formState.errors.password && (
                  <p className="mt-1.5 text-xs text-[var(--danger)]">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              {loginError && (
                <div className="bg-[var(--danger-bg)] border border-red-200 rounded-xl px-4 py-3 text-sm text-[var(--danger)] flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover disabled:opacity-70 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {loginLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifica in corso...
                  </>
                ) : (
                  <>Accedi al Pannello</>
                )}
              </button>
            </form>
          </>
        ) : (
          /* ── Primo Accesso ── */
          <>
            <div className="mb-6 text-center">
              <div className="w-12 h-12 bg-orange-100 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={24} />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-1.5">Primo Accesso</h1>
              <p className="text-muted-foreground text-sm">
                Per motivi di sicurezza, imposta una nuova password personale prima di procedere.
              </p>
            </div>

            <form
              key="first-login-change-password-form"
              onSubmit={handleChangePassword}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Nuova Password
                </label>
                <PasswordInput
                  id="new-password"
                  placeholder="Minimo 8 caratteri"
                  hasError={!!changePasswordForm.formState.errors.newPassword}
                  registration={changePasswordForm.register('newPassword', {
                    required: true,
                    minLength: { value: 8, message: 'Minimo 8 caratteri' },
                  })}
                />
                {changePasswordForm.formState.errors.newPassword && (
                  <p className="mt-1.5 text-xs text-[var(--danger)]">
                    {changePasswordForm.formState.errors.newPassword.message as string}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Conferma Nuova Password
                </label>
                <PasswordInput
                  id="confirm-password"
                  placeholder="Ripeti la password"
                  hasError={!!changePasswordForm.formState.errors.confirmPassword}
                  registration={changePasswordForm.register('confirmPassword', {
                    required: true,
                    validate: (v) =>
                      v === changePasswordForm.watch('newPassword') ||
                      'Le password non corrispondono',
                  })}
                />
                {changePasswordForm.formState.errors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-[var(--danger)]">
                    {changePasswordForm.formState.errors.confirmPassword.message as string}
                  </p>
                )}
              </div>

              {loginError && (
                <div className="bg-[var(--danger-bg)] border border-red-200 rounded-xl px-4 py-3 text-sm text-[var(--danger)] flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover disabled:opacity-70 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 text-sm"
              >
                {loginLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Aggiornamento...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Conferma e Accedi
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
