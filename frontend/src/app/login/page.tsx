'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Mail, Lock, Loader2, MessageSquare, AlertCircle } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        json: { email, password },
      });

      // Save token and user details to localStorage
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Credenciales incorrectas. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50/50 via-background to-background px-4 py-12 text-foreground font-sans overflow-hidden">
      {/* Decorative Floating Blobs */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl animate-float-reverse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-96 w-96 rounded-full bg-teal-100/10 blur-3xl animate-pulse-slow" />

      <div className="w-full max-w-[420px] space-y-6 z-10">
        {/* Logo/Branding Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/20 text-white transition-transform hover:scale-105 duration-300">
            <MessageSquare size={28} className="fill-white/10" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
              Mensajes Web
            </h1>
            <p className="text-sm font-medium text-muted-foreground">
              Programa envíos masivos y gestiona tus campañas
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-white/40 bg-white/70 backdrop-blur-md p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all">
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">Iniciar Sesión</h2>
            <p className="text-xs text-muted-foreground mt-1">Ingresa tus datos de acceso al sistema</p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle size={15} className="shrink-0" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500" htmlFor="email">
                Correo Electrónico
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 text-muted-foreground pointer-events-none" size={16} />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-input bg-white/50 pl-11 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground shadow-sm transition-all focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500" htmlFor="password">
                Contraseña
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 text-muted-foreground pointer-events-none" size={16} />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-input bg-white/50 pl-11 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground shadow-sm transition-all focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/10 hover:shadow-lg hover:shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 focus:outline-none hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-75 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <span>Ingresar al Sistema</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
