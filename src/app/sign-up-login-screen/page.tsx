'use client';
import React, { useState } from 'react';

import { useForm } from 'react-hook-form';
import AppLogo from '@/components/ui/AppLogo';
import { Eye, EyeOff, Mail, Lock, User, Store, ArrowRight, CheckCircle, Copy } from 'lucide-react';

type Role = 'ristoratore' | 'cliente';
type AuthMode = 'login' | 'signup';

interface LoginForm {
  email: string;
  password: string;
  remember: boolean;
}

interface SignupForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  restaurantName?: string;
  terms: boolean;
}

const demoCredentials = [
{ role: 'Super Admin', email: 'admin@gloriaorder.it', password: 'Admin2026!' },
{ role: 'Ristoratore', email: 'giuseppe@bellanapoli.it', password: 'Ristoro2026!' },
{ role: 'Cliente', email: 'marco.ferretti@gmail.com', password: 'Cliente2026!' }];


function CopyButton({ value }: {value: string;}) {
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
      title="Copia">

      {copied ? <CheckCircle size={13} className="text-[var(--success)]" /> : <Copy size={13} />}
    </button>);

}

export default function AuthPage() {
  const [role, setRole] = useState<Role>('cliente');
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const loginForm = useForm<LoginForm>({ defaultValues: { email: '', password: '', remember: false } });
  const signupForm = useForm<SignupForm>({ defaultValues: { name: '', email: '', password: '', confirmPassword: '', restaurantName: '', terms: false } });

  const autofill = (email: string, password: string) => {
    loginForm.setValue('email', email);
    loginForm.setValue('password', password);
    setLoginError('');
  };

  const handleLogin = loginForm.handleSubmit((data) => {
    setLoginLoading(true);
    setLoginError('');
    setTimeout(() => {
      setLoginLoading(false);
      const match = demoCredentials.find((c) => c.email === data.email && c.password === data.password);
      if (!match) {
        setLoginError('Credenziali non valide — usa gli account demo in basso per accedere');
        return;
      }
      if (match.role === 'Super Admin') {
        window.location.href = '/superadmin/restaurants';
      } else if (match.role === 'Ristoratore') {
        window.location.href = '/ristoratore/menu';
      } else {
        window.location.href = '/';
      }
    }, 1400);
  });

  const handleSignup = signupForm.handleSubmit((data) => {
    setSignupLoading(true);
    setTimeout(() => {
      setSignupLoading(false);
      window.location.href = role === 'ristoratore' ? '/restaurant-management-dashboard' : '/';
    }, 1600);
  });

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left brandpanel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col bg-primary relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #E8472A 0%, #FF8C42 100%)' }} />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, #fff 0%, transparent 50%), radial-gradient(circle at 80% 20%, #fff 0%, transparent 50%)' }} />
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
          <div className="flex items-center gap-3 mb-auto">
            <AppLogo size={40} />
            <span className="font-extrabold text-2xl text-white tracking-tight">iGO Delivering</span>
          </div>

          <div className="my-auto">
            <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-4 text-balance">
              Il tuo ristorante,<br />online in minuti.
            </h2>
            <p className="text-white/80 text-lg leading-relaxed mb-10 max-w-md">
              Gestisci ordini, menu e consegne da un unico pannello professionale. Migliaia di ristoranti italiani già ci usano ogni giorno.
            </p>

            <div className="grid grid-cols-2 gap-4 max-w-sm mb-10">
              {[
              { label: '4.200+', sub: 'Ristoranti attivi' },
              { label: '98,4%', sub: 'Uptime garantito' },
              { label: '€ 2,1M', sub: 'Ordini processati/mese' },
              { label: '4,8 ★', sub: 'Rating medio app' }].
              map((stat) =>
              <div key={`stat-${stat.label}`} className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <p className="text-white font-extrabold text-xl tabular-nums">{stat.label}</p>
                  <p className="text-white/70 text-xs mt-0.5">{stat.sub}</p>
                </div>
              )}
            </div>

            {/* Testimonial */}
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 border border-white/20 max-w-md">
              <p className="text-white/90 text-sm leading-relaxed italic mb-3">
                "Con GloriaOrder abbiamo triplicato gli ordini online in 3 mesi. Il pannello è intuitivo e il supporto è eccezionale."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/30 flex items-center justify-center text-white font-bold text-sm">A</div>
                <div>
                  <p className="text-white font-semibold text-sm">Antonio Marchetti</p>
                  <p className="text-white/60 text-xs">Trattoria da Antonio, Napoli</p>
                </div>
              </div>
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
            <span className="font-extrabold text-xl text-foreground">GloriaOrder</span>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center bg-muted rounded-xl p-1 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              mode === 'login' ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'}`
              }>

              Accedi
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              mode === 'signup' ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'}`
              }>

              Registrati
            </button>
          </div>

          {/* Role selector */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide" style={{ letterSpacing: '0.06em' }}>Accedi come</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('cliente')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 ${
                role === 'cliente' ? 'border-primary bg-secondary text-primary' : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted'}`
                }>

                <User size={22} strokeWidth={role === 'cliente' ? 2.5 : 1.8} />
                <span className="text-sm font-semibold">Cliente</span>
                <span className="text-[10px] text-center leading-tight opacity-70">Ordina dal tuo ristorante preferito</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('ristoratore')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 ${
                role === 'ristoratore' ? 'border-primary bg-secondary text-primary' : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted'}`
                }>

                <Store size={22} strokeWidth={role === 'ristoratore' ? 2.5 : 1.8} />
                <span className="text-sm font-semibold">Ristoratore</span>
                <span className="text-[10px] text-center leading-tight opacity-70">Gestisci il tuo ristorante</span>
              </button>
            </div>
          </div>

          {/* ── LOGIN FORM ── */}
          {mode === 'login' &&
          <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-semibold text-foreground mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder={role === 'ristoratore' ? 'nome@ristorante.it' : 'nome@email.it'}
                  {...loginForm.register('email', {
                    required: 'Email obbligatoria',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email non valida' }
                  })}
                  className={`w-full pl-9 pr-3 py-3 text-sm bg-input border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
                  loginForm.formState.errors.email ? 'border-[var(--danger)]' : 'border-border'}`
                  } />

                </div>
                {loginForm.formState.errors.email &&
              <p className="mt-1.5 text-xs text-[var(--danger)]">{loginForm.formState.errors.email.message}</p>
              }
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="block text-sm font-semibold text-foreground">
                    Password
                  </label>
                  <button type="button" className="text-xs text-primary hover:underline font-medium">
                    Password dimenticata?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="La tua password"
                  {...loginForm.register('password', {
                    required: 'Password obbligatoria',
                    minLength: { value: 6, message: 'Minimo 6 caratteri' }
                  })}
                  className={`w-full pl-9 pr-10 py-3 text-sm bg-input border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
                  loginForm.formState.errors.password ? 'border-[var(--danger)]' : 'border-border'}`
                  } />

                  <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}>

                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {loginForm.formState.errors.password &&
              <p className="mt-1.5 text-xs text-[var(--danger)]">{loginForm.formState.errors.password.message}</p>
              }
              </div>

              <div className="flex items-center gap-2">
                <input
                id="remember"
                type="checkbox"
                {...loginForm.register('remember')}
                className="w-4 h-4 rounded border-border text-primary focus:ring-ring" />

                <label htmlFor="remember" className="text-sm text-muted-foreground">Ricordami su questo dispositivo</label>
              </div>

              {loginError &&
            <div className="bg-[var(--danger-bg)] border border-red-200 rounded-xl px-4 py-3 text-sm text-[var(--danger)]">
                  {loginError}
                </div>
            }

              <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-[#d43d22] disabled:opacity-70 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 text-sm">

                {loginLoading ?
              <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Accesso in corso...
                  </> :

              <>
                    Accedi
                    <ArrowRight size={16} />
                  </>
              }
              </button>

              <p className="text-center text-sm text-muted-foreground">
                Non hai un account?{' '}
                <button type="button" onClick={() => setMode('signup')} className="text-primary font-semibold hover:underline">
                  Registrati gratis
                </button>
              </p>
            </form>
          }

          {/* ── SIGNUP FORM ── */}
          {mode === 'signup' &&
          <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label htmlFor="signup-name" className="block text-sm font-semibold text-foreground mb-1.5">
                  {role === 'ristoratore' ? 'Nome referente' : 'Nome completo'}
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                  id="signup-name"
                  type="text"
                  placeholder="Mario Rossi"
                  {...signupForm.register('name', { required: 'Nome obbligatorio', minLength: { value: 2, message: 'Minimo 2 caratteri' } })}
                  className={`w-full pl-9 pr-3 py-3 text-sm bg-input border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring ${
                  signupForm.formState.errors.name ? 'border-[var(--danger)]' : 'border-border'}`
                  } />

                </div>
                {signupForm.formState.errors.name &&
              <p className="mt-1.5 text-xs text-[var(--danger)]">{signupForm.formState.errors.name.message}</p>
              }
              </div>

              {role === 'ristoratore' &&
            <div>
                  <label htmlFor="signup-restaurant" className="block text-sm font-semibold text-foreground mb-1.5">
                    Nome del ristorante
                  </label>
                  <p className="text-xs text-muted-foreground mb-1.5">Sarà visibile ai tuoi clienti nella vetrina online</p>
                  <div className="relative">
                    <Store size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                  id="signup-restaurant"
                  type="text"
                  placeholder="es. Pizzeria Bella Napoli"
                  {...signupForm.register('restaurantName', {
                    required: role === 'ristoratore' ? 'Nome ristorante obbligatorio' : false
                  })}
                  className={`w-full pl-9 pr-3 py-3 text-sm bg-input border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring ${
                  signupForm.formState.errors.restaurantName ? 'border-[var(--danger)]' : 'border-border'}`
                  } />

                  </div>
                  {signupForm.formState.errors.restaurantName &&
              <p className="mt-1.5 text-xs text-[var(--danger)]">{signupForm.formState.errors.restaurantName.message}</p>
              }
                </div>
            }

              <div>
                <label htmlFor="signup-email" className="block text-sm font-semibold text-foreground mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder={role === 'ristoratore' ? 'nome@ristorante.it' : 'nome@email.it'}
                  {...signupForm.register('email', {
                    required: 'Email obbligatoria',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email non valida' }
                  })}
                  className={`w-full pl-9 pr-3 py-3 text-sm bg-input border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring ${
                  signupForm.formState.errors.email ? 'border-[var(--danger)]' : 'border-border'}`
                  } />

                </div>
                {signupForm.formState.errors.email &&
              <p className="mt-1.5 text-xs text-[var(--danger)]">{signupForm.formState.errors.email.message}</p>
              }
              </div>

              <div>
                <label htmlFor="signup-password" className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
                <p className="text-xs text-muted-foreground mb-1.5">Minimo 8 caratteri, includi un numero e un carattere speciale</p>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Crea una password sicura"
                  {...signupForm.register('password', {
                    required: 'Password obbligatoria',
                    minLength: { value: 8, message: 'Minimo 8 caratteri' },
                    pattern: { value: /^(?=.*[0-9])(?=.*[!@#$%^&*])/, message: 'Includi almeno un numero e un carattere speciale' }
                  })}
                  className={`w-full pl-9 pr-10 py-3 text-sm bg-input border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring ${
                  signupForm.formState.errors.password ? 'border-[var(--danger)]' : 'border-border'}`
                  } />

                  <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}>

                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {signupForm.formState.errors.password &&
              <p className="mt-1.5 text-xs text-[var(--danger)]">{signupForm.formState.errors.password.message}</p>
              }
              </div>

              <div>
                <label htmlFor="signup-confirm" className="block text-sm font-semibold text-foreground mb-1.5">Conferma password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                  id="signup-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Ripeti la password"
                  {...signupForm.register('confirmPassword', {
                    required: 'Conferma la password',
                    validate: (val) => val === signupForm.watch('password') || 'Le password non corrispondono'
                  })}
                  className={`w-full pl-9 pr-10 py-3 text-sm bg-input border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring ${
                  signupForm.formState.errors.confirmPassword ? 'border-[var(--danger)]' : 'border-border'}`
                  } />

                  <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirm ? 'Nascondi' : 'Mostra'}>

                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {signupForm.formState.errors.confirmPassword &&
              <p className="mt-1.5 text-xs text-[var(--danger)]">{signupForm.formState.errors.confirmPassword.message}</p>
              }
              </div>

              <div className="flex items-start gap-2.5">
                <input
                id="terms"
                type="checkbox"
                {...signupForm.register('terms', { required: 'Devi accettare i termini' })}
                className="w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-ring flex-shrink-0" />

                <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                  Accetto i{' '}
                  <a href="#" className="text-primary hover:underline font-medium">Termini di servizio</a>
                  {' '}e la{' '}
                  <a href="#" className="text-primary hover:underline font-medium">Privacy Policy</a>
                  {' '}di GloriaOrder
                </label>
              </div>
              {signupForm.formState.errors.terms &&
            <p className="text-xs text-[var(--danger)]">{signupForm.formState.errors.terms.message}</p>
            }

              <button
              type="submit"
              disabled={signupLoading}
              className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-[#d43d22] disabled:opacity-70 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 text-sm">

                {signupLoading ?
              <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Registrazione...
                  </> :

              <>
                    {role === 'ristoratore' ? 'Registra il tuo ristorante' : 'Crea account gratuito'}
                    <ArrowRight size={16} />
                  </>
              }
              </button>

              <p className="text-center text-sm text-muted-foreground">
                Hai già un account?{' '}
                <button type="button" onClick={() => setMode('login')} className="text-primary font-semibold hover:underline">
                  Accedi
                </button>
              </p>
            </form>
          }

          {/* Demo credentials */}
          <div className="mt-6 rounded-xl border border-border bg-muted/60 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide" style={{ letterSpacing: '0.06em' }}>
                Account demo — clicca per compilare
              </p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-muted-foreground font-semibold">Ruolo</th>
                  <th className="px-4 py-2 text-left text-muted-foreground font-semibold">Email</th>
                  <th className="px-4 py-2 text-left text-muted-foreground font-semibold">Password</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {demoCredentials.map((cred) =>
                <tr key={`demo-${cred.role}`} className="border-b border-border last:border-0 hover:bg-muted transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-foreground whitespace-nowrap">{cred.role}</td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono">{cred.email}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-muted-foreground">{cred.password}</span>
                        <CopyButton value={cred.password} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                      type="button"
                      onClick={() => {setMode('login');autofill(cred.email, cred.password);}}
                      className="px-2.5 py-1 bg-secondary text-primary rounded-lg text-[11px] font-semibold hover:bg-orange-100 transition-colors border border-orange-200">

                        Usa
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>);

}