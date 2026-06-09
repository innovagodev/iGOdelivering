'use client';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import AppLogo from '@/components/ui/AppLogo';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, Lock, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';

interface ResetPasswordForm {
  password: string;
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
        autoComplete="new-password"
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
export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          setHasSession(true);
        } else {
          setError(
            'Sessione di recupero password scaduta, non valida o non trovata. Richiedi un nuovo link.'
          );
        }
      } catch (err) {
        console.error(err);
        setError('Errore durante il controllo della sessione.');
      } finally {
        setSessionLoading(false);
      }
    }
    checkSession();
  }, []);

  const handleReset = handleSubmit(async (data) => {
    setLoading(true);
    setError('');

    try {
      // Update the user password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      // Fetch user profile to set igodelivering_role cookie and redirect
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile) {
          document.cookie = `igodelivering_role=${profile.role}; path=/; max-age=86400; SameSite=Lax`;
          setSuccess(true);
          setTimeout(() => {
            window.location.href =
              profile.role === 'admin' ? '/admin/dashboard' : '/ristoratore/dashboard';
          }, 2000);
        } else {
          setError('Profilo utente non trovato.');
          setLoading(false);
        }
      } else {
        setError("Impossibile verificare l'utente autenticato.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      setError("Errore durante l'aggiornamento della password.");
      setLoading(false);
    }
  });

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
          <p className="text-sm text-muted-foreground font-semibold">
            Verifica sessione in corso...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 relative overflow-hidden">
      {/* Background ambient glowing details */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-primary/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] aspect-square rounded-full bg-orange-600/5 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-8 md:p-10 shadow-xl relative z-10">
        {/* Top Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center justify-center p-2">
            <AppLogo size={100} />
          </div>
        </div>

        {!success ? (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-1.5">Reimposta Password</h1>
              <p className="text-muted-foreground text-sm">
                Inserisci la tua nuova password personale per ripristinare l&apos;accesso.
              </p>
            </div>

            {hasSession ? (
              <form onSubmit={handleReset} className="space-y-4">
                {/* Password */}
                <div>
                  <label
                    htmlFor="reset-password-input"
                    className="block text-sm font-semibold text-foreground mb-1.5"
                  >
                    Nuova Password
                  </label>
                  <PasswordInput
                    id="reset-password-input"
                    placeholder="Minimo 8 caratteri"
                    hasError={!!errors.password}
                    registration={register('password', {
                      required: 'Password obbligatoria',
                      minLength: { value: 8, message: 'Minimo 8 caratteri' },
                    })}
                  />
                  {errors.password && (
                    <p className="mt-1.5 text-xs text-[var(--danger)]">{errors.password.message}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="reset-confirm-input"
                    className="block text-sm font-semibold text-foreground mb-1.5"
                  >
                    Conferma Nuova Password
                  </label>
                  <PasswordInput
                    id="reset-confirm-input"
                    placeholder="Ripeti la password"
                    hasError={!!errors.confirmPassword}
                    registration={register('confirmPassword', {
                      required: 'Conferma password obbligatoria',
                      validate: (value) =>
                        value === watch('password') || 'Le password non corrispondono',
                    })}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1.5 text-xs text-[var(--danger)]">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="bg-[var(--danger-bg)] border border-red-200 rounded-xl px-4 py-3 text-sm text-[var(--danger)] flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover disabled:opacity-70 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Aggiornamento in corso...
                    </>
                  ) : (
                    <>
                      Salva Nuova Password
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-[var(--danger-bg)] border border-red-200 rounded-xl px-4 py-3 text-sm text-[var(--danger)] flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
                <a
                  href="/login"
                  className="w-full py-3.5 bg-muted text-foreground font-semibold rounded-xl hover:bg-border transition-all flex items-center justify-center text-sm"
                >
                  Torna al Login
                </a>
              </div>
            )}
          </>
        ) : (
          /* ── Success Screen ── */
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CheckCircle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">Password Aggiornata!</h1>
            <p className="text-muted-foreground text-sm leading-relaxed mb-8">
              La tua password è stata salvata correttamente. Verrai reindirizzato al pannello di
              gestione in pochi istanti...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
