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
  ShieldCheck,
} from 'lucide-react';

interface LoginForm {
  email: string;
  password: string;
}

const adminCredentials = {
  email: 'admin@igodelivering.it',
  password: 'Admin2026!',
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).catch(() => { });
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

export default function AdminLoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    defaultValues: { email: '', password: '' },
  });

  const handleLogin = handleSubmit((data) => {
    setLoginLoading(true);
    setLoginError('');

    // Simulazione autenticazione amministratore
    setTimeout(() => {
      setLoginLoading(false);
      if (data.email === adminCredentials.email && data.password === adminCredentials.password) {
        login(data.email, 'admin');
        window.location.href = '/admin/restaurants';
      } else {
        setLoginError('Credenziali di amministrazione non valide.');
      }
    }, 1200);
  });

  const useDemoAdmin = () => {
    setValue('email', adminCredentials.email);
    setValue('password', adminCredentials.password);
    setLoginError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 relative overflow-hidden select-none">
      {/* Background ambient glowing details for security-focused aesthetic */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-primary/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] aspect-square rounded-full bg-orange-600/5 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-10 shadow-2xl relative z-10">

        {/* Header Block */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center justify-center p-2">
            <AppLogo size={200} />
          </div>
          <h1 className="text-xl font-bold text-zinc-100">Accesso Amministratore</h1>
          <p className="text-zinc-400 text-xs mt-1.5 max-w-xs">
            Inserisci le credenziali di root per la gestione globale del sistema iGOdelivering.
          </p>
        </div>

        {/* Form Block */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Email Amministratore
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                id="admin-email"
                type="email"
                placeholder="admin@igodelivering.it"
                {...register('email', {
                  required: 'Email obbligatoria',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Formato email non valido',
                  },
                })}
                className={`w-full pl-10 pr-4 py-3 text-base bg-zinc-950 border rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-colors duration-150 ${errors.email ? 'border-red-500/50' : 'border-zinc-800'
                  }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Password di Sicurezza
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password', {
                  required: 'Password obbligatoria',
                })}
                className={`w-full pl-10 pr-10 py-3 text-base bg-zinc-950 border rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-colors duration-150 ${errors.password ? 'border-red-500/50' : 'border-zinc-800'
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          {loginError && (
            <div className="bg-red-950/30 border border-red-900/50 rounded-xl px-4 py-3 text-xs text-red-400 flex items-start gap-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full py-3.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl disabled:opacity-50 hover:shadow-lg hover:shadow-orange-600/10 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 text-sm mt-2"
          >
            {loginLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Autenticazione in corso...
              </>
            ) : (
              <>
                Accedi all&apos;Area Riservata
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Root Credential Helper */}
        <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
            Credenziale di Test Root
          </p>
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
            <div className="text-left">
              <p className="text-[10px] font-mono text-zinc-300">{adminCredentials.email}</p>
              <p className="text-[10px] font-mono text-zinc-500">{adminCredentials.password}</p>
            </div>
            <div className="flex items-center gap-2">
              <CopyButton value={adminCredentials.email} />
              <button
                onClick={useDemoAdmin}
                className="text-[10px] font-extrabold text-orange-500 hover:underline px-2 py-1 rounded bg-zinc-800/40 border border-zinc-800 hover:bg-zinc-800 transition-colors"
              >
                Usa
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
