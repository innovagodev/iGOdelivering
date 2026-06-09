'use client';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import AppLogo from '@/components/ui/AppLogo';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface RegisterForm {
  name: string;
  email: string;
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
export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailParam, setEmailParam] = useState('');
  const [restaurantId, setRestaurantId] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const email = params.get('email') || '';
      const rId = params.get('restaurant_id') || '';
      setEmailParam(email);
      setRestaurantId(rId);
      if (email) {
        setValue('email', email);
      }
    }
  }, [setValue]);

  const handleRegister = handleSubmit(async (data) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/ristoratore/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: emailParam || data.email,
          password: data.password,
          restaurantId: restaurantId,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        setError(resData.error || 'Si è verificato un errore durante la registrazione.');
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError('Impossibile connettersi al server. Riprova più tardi.');
      setLoading(false);
    }
  });

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
              <h1 className="text-2xl font-bold text-foreground mb-1.5">
                Attiva Account Ristorante
              </h1>
              <p className="text-muted-foreground text-sm">
                Crea le tue credenziali di accesso per attivare l&apos;account ed entrare nel tuo
                pannello ristoratore.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Email (Readonly) */}
              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-sm font-semibold text-foreground mb-1.5"
                >
                  Email Ristorante
                </label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    id="reg-email"
                    type="email"
                    disabled
                    value={emailParam}
                    placeholder="email@ristorante.it"
                    className="w-full pl-9 pr-3 py-3 text-base bg-muted border border-border rounded-xl text-muted-foreground focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label
                  htmlFor="reg-name"
                  className="block text-sm font-semibold text-foreground mb-1.5"
                >
                  Nome Completo / Referente
                </label>
                <div className="relative">
                  <User
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    id="reg-name"
                    type="text"
                    placeholder="Mario Rossi"
                    {...register('name', { required: 'Nome referente obbligatorio' })}
                    className={`w-full pl-9 pr-3 py-3 text-base bg-input border rounded-xl focus:outline-none transition-colors ${errors.name ? 'border-[var(--danger)]' : 'border-border'}`}
                  />
                </div>
                {errors.name && (
                  <p className="mt-1.5 text-xs text-[var(--danger)]">{errors.name.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-sm font-semibold text-foreground mb-1.5"
                >
                  Crea Password
                </label>
                <PasswordInput
                  id="reg-password"
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
                  htmlFor="reg-confirm"
                  className="block text-sm font-semibold text-foreground mb-1.5"
                >
                  Ripeti Password
                </label>
                <PasswordInput
                  id="reg-confirm"
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
                disabled={loading || !restaurantId}
                className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Attivazione in corso...
                  </>
                ) : (
                  <>Attiva il tuo Account</>
                )}
              </button>

              {!restaurantId && (
                <p className="text-center text-xs text-[var(--danger)] mt-2 font-medium">
                  Link di attivazione non valido (ID ristorante mancante).
                </p>
              )}
            </form>
          </>
        ) : (
          /* ── Success Screen ── */
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CheckCircle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">Account Attivato!</h1>
            <p className="text-muted-foreground text-sm leading-relaxed mb-8">
              Le tue credenziali sono state registrate con successo. Ora puoi accedere al tuo
              pannello ristoratore con i dati scelti.
            </p>
            <a
              href={`/login?email=${encodeURIComponent(emailParam)}`}
              className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              Accedi al Pannello
              <ArrowRight size={16} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
