'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/context/AuthContext';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle,
  Copy,
  AlertTriangle,
} from 'lucide-react';

interface LoginForm {
  email: string;
  password: string;
  remember: boolean;
}

interface ChangePasswordForm {
  newPassword: string;
  confirmPassword: string;
}

const demoCredentials = [
  {
    role: 'ristoratore',
    email: 'giuseppe@bellanapoli.it',
    password: 'Ristoro2026!',
    isFirstLogin: true,
  },
  {
    role: 'superadmin',
    email: 'admin@igodelivering.it',
    password: 'Admin2026!',
    isFirstLogin: false,
  },
];

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      title="Copia"
    >
      {copied ? <CheckCircle size={13} className="text-[var(--success)]" /> : <Copy size={13} />}
    </button>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);

  const loginForm = useForm<LoginForm>({
    defaultValues: { email: '', password: '', remember: false },
  });
  const changePasswordForm = useForm<ChangePasswordForm>();

  const handleLogin = loginForm.handleSubmit((data) => {
    setLoginLoading(true);
    setLoginError('');

    // Simulazione chiamata API
    setTimeout(() => {
      setLoginLoading(false);
      const match = demoCredentials.find(
        (c) => c.email === data.email && c.password === data.password
      );

      if (!match) {
        setLoginError("Credenziali non valide. Contatta il supporto se hai smarrito l'accesso.");
        return;
      }

      if (match.isFirstLogin) {
        setIsFirstLogin(true);
        setTempToken('temp-session-token');
      } else {
        login(data.email, match.role as any);
        if (match.role === 'superadmin') {
          window.location.href = '/superadmin/restaurants';
        } else {
          window.location.href = '/ristoratore/dashboard';
        }
      }
    }, 1400);
  });

  const handleChangePassword = changePasswordForm.handleSubmit((data) => {
    setLoginLoading(true);
    setTimeout(() => {
      setLoginLoading(false);
      const email = loginForm.getValues('email');
      login(email, 'ristoratore');
      window.location.href = '/ristoratore/dashboard';
    }, 1600);
  });

  const autofill = (email: string, password: string) => {
    loginForm.setValue('email', email);
    loginForm.setValue('password', password);
    setLoginError('');
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left brandpanel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col bg-primary relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #E8472A 0%, #FF8C42 100%)' }}
        />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 80%, #fff 0%, transparent 50%), radial-gradient(circle at 80% 20%, #fff 0%, transparent 50%)',
          }}
        />
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
          <div className="flex items-center gap-3 mb-auto">
            <AppLogo size={256} />
          </div>

          <div className="my-auto">
            <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-4 text-balance">
              Il tuo ristorante,
              <br />
              online in minuti.
            </h2>
            <p className="text-white/80 text-lg leading-relaxed mb-10 max-w-md">
              Gestisci ordini, menu e consegne da un unico pannello professionale. iGOdelivering è
              lo strumento definitivo per la tua crescita.
            </p>

            <div className="grid grid-cols-2 gap-4 max-w-sm mb-10">
              {[
                { label: '4.200+', sub: 'Ristoranti attivi' },
                { label: '98,4%', sub: 'Uptime garantito' },
                { label: '€ 2,1M', sub: 'Ordini processati/mese' },
                { label: '4,8 ★', sub: 'Rating medio app' },
              ].map((stat) => (
                <div
                  key={`stat-${stat.label}`}
                  className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20"
                >
                  <p className="text-white font-extrabold text-xl tabular-nums">{stat.label}</p>
                  <p className="text-white/70 text-xs mt-0.5">{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-8 border-t border-white/20">
            <p className="text-white/50 text-xs">© 2026 innovaGO · Privacy · Termini di servizio</p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <AppLogo size={36} />
            <span className="font-extrabold text-xl text-foreground">iGOdelivering</span>
          </div>

          {!isFirstLogin ? (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-foreground mb-2">Accesso Ristoratore</h1>
                <p className="text-muted-foreground text-sm">
                  Inserisci le credenziali fornite dal Superadmin per gestire il tuo locale.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
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
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Email non valida',
                        },
                      })}
                      className={`w-full pl-9 pr-3 py-3 text-base bg-input border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${loginForm.formState.errors.email ? 'border-[var(--danger)]' : 'border-border'}`}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="mt-1.5 text-xs text-[var(--danger)]">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

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
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Password dimenticata?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Password"
                      {...loginForm.register('password', {
                        required: 'Password obbligatoria',
                      })}
                      className={`w-full pl-9 pr-10 py-3 text-base bg-input border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${loginForm.formState.errors.password ? 'border-[var(--danger)]' : 'border-border'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
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
                  className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-[#d43d22] disabled:opacity-70 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 text-sm"
                >
                  {loginLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifica in corso...
                    </>
                  ) : (
                    <>
                      Accedi al Pannello
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Demo Section (per test) */}
              <div className="mt-10 pt-6 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 text-center">
                  Account di test
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {demoCredentials.map((creds) => (
                    <div key={creds.role} className="bg-muted p-3 rounded-xl border border-border">
                      <p className="text-[10px] font-bold text-primary uppercase mb-1">
                        {creds.role}
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-mono text-foreground">{creds.email}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">
                            {creds.password}
                          </p>
                        </div>
                        <button
                          onClick={() => autofill(creds.email, creds.password)}
                          className="text-[10px] font-bold text-primary hover:underline"
                        >
                          Usa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8">
                <div className="w-12 h-12 bg-orange-100 text-primary rounded-full flex items-center justify-center mb-4">
                  <Lock size={24} />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Primo Accesso</h1>
                <p className="text-muted-foreground text-sm">
                  Per motivi di sicurezza, devi impostare una nuova password personale prima di
                  procedere alla dashboard.
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Nuova Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type="password"
                      placeholder="Minimo 8 caratteri"
                      {...changePasswordForm.register('newPassword', {
                        required: true,
                        minLength: 8,
                      })}
                      className="w-full pl-9 pr-3 py-3 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Conferma Nuova Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type="password"
                      placeholder="Ripeti la password"
                      {...changePasswordForm.register('confirmPassword', {
                        required: true,
                        validate: (v) =>
                          v === changePasswordForm.watch('newPassword') ||
                          'Le password non corrispondono',
                      })}
                      className="w-full pl-9 pr-3 py-3 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {changePasswordForm.formState.errors.confirmPassword && (
                    <p className="mt-1.5 text-xs text-[var(--danger)]">
                      {changePasswordForm.formState.errors.confirmPassword.message as string}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-[#d43d22] disabled:opacity-70 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 text-sm"
                >
                  {loginLoading ? 'Aggiornamento...' : 'Conferma e Accedi'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
