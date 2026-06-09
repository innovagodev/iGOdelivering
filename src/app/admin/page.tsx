'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import AppLogo from '@/components/ui/AppLogo';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, Mail, Lock, ArrowRight, AlertTriangle } from 'lucide-react';

interface LoginForm {
  email: string;
  password: string;
}

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    defaultValues: { email: '', password: '' },
  });

  const handleLogin = handleSubmit(async (data) => {
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

        if (!profile || profile.role !== 'admin') {
          await supabase.auth.signOut();
          setLoginError("Non sei autorizzato ad accedere all'area amministrazione.");
          setLoginLoading(false);
          return;
        }

        // Set role cookie for middleware
        document.cookie = `igodelivering_role=admin; path=/; max-age=86400; SameSite=Lax`;
        window.location.href = '/admin/dashboard';
      }
    } catch (err: any) {
      console.error(err);
      setLoginError("Si è verificato un errore durante l'accesso.");
      setLoginLoading(false);
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 relative overflow-hidden select-none">
      {/* Background ambient glowing details for security-focused aesthetic */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-primary/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] aspect-square rounded-full bg-orange-600/5 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-10 shadow-2xl relative z-10">
        {/* Header Block */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center justify-center p-2">
            <AppLogo size={100} />
          </div>
          <h1 className="text-xl font-bold text-zinc-100">Accesso Amministratore</h1>
        </div>

        {/* Form Block */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="admin-email"
              className="block text-xs font-semibold text-zinc-300 mb-1.5"
            >
              Email Amministratore
            </label>
            <div className="relative">
              <Mail
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
              />
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
                className={`w-full pl-10 pr-4 py-3 text-base bg-zinc-950 border rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors duration-150 ${
                  errors.email ? 'border-red-500/50' : 'border-zinc-800'
                }`}
              />
            </div>
            {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>}
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-semibold text-zinc-300 mb-1.5"
            >
              Password di Sicurezza
            </label>
            <div className="relative">
              <Lock
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password', {
                  required: 'Password obbligatoria',
                })}
                className={`w-full pl-10 pr-10 py-3 text-base bg-zinc-950 border rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors duration-150 ${
                  errors.password ? 'border-red-500/50' : 'border-zinc-800'
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
            className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl disabled:opacity-50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 text-sm mt-2 cursor-pointer"
          >
            {loginLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Autenticazione in corso...
              </>
            ) : (
              <>Accedi all&apos;Area Riservata</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
