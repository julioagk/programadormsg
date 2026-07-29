'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Save, Key, User, Settings as SettingsIcon, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function Settings() {
  // Profile & Config State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [minDelay, setMinDelay] = useState(20);
  const [maxDelay, setMaxDelay] = useState(90);
  const [timezone, setTimezone] = useState('UTC');

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Alerts
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Loading states
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiFetch('/auth/me');
        setName(data.name || '');
        setEmail(data.email || '');
        if (data.settings) {
          setMinDelay(data.settings.minDelay);
          setMaxDelay(data.settings.maxDelay);
          setTimezone(data.settings.timezone);
        }
      } catch (err: any) {
        setProfileError('Error al cargar la información del perfil');
      }
    };
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setProfileLoading(true);

    try {
      const data = await apiFetch('/auth/profile', {
        method: 'PUT',
        json: {
          name,
          email,
          minDelay: Number(minDelay),
          maxDelay: Number(maxDelay),
          timezone,
        },
      });

      // Update user details in localStorage
      localStorage.setItem('user', JSON.stringify(data));
      setProfileSuccess('Configuraciones y perfil actualizados con éxito');
    } catch (err: any) {
      setProfileError(err.message || 'Error al actualizar el perfil');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('La nueva contraseña y la confirmación no coinciden');
      return;
    }

    setPasswordLoading(true);

    try {
      const data = await apiFetch('/auth/change-password', {
        method: 'POST',
        json: {
          currentPassword,
          newPassword,
        },
      });

      setPasswordSuccess(data.message || 'Contraseña cambiada con éxito');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err: any) {
      setPasswordError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Administra la información de tu perfil, contraseña y preferencias del Scheduler
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Profile & Delay Settings Card */}
        <div className="rounded-xl border border-border bg-card text-card-foreground p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <User size={18} className="text-muted-foreground" />
            <h2 className="font-semibold text-base">Perfil y Parámetros de Envío</h2>
          </div>

          {profileSuccess && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-600 flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Nombre</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground shadow-sm focus:border-ring focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Correo Electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground shadow-sm focus:border-ring focus:outline-none"
              />
            </div>

            {/* Delay Settings */}
            <div className="border-t border-border pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <SettingsIcon size={16} className="text-muted-foreground" />
                <h3 className="font-semibold text-sm">Frecuencia de Envío (Antiban)</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Retraso Mínimo (seg)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={minDelay}
                    onChange={(e) => setMinDelay(Number(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Retraso Máximo (seg)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={maxDelay}
                    onChange={(e) => setMaxDelay(Number(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Zona Horaria</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
                >
                  <option value="America/Mexico_City">America/Mexico_City (GMT-6)</option>
                  <option value="America/New_York">America/New_York (GMT-5)</option>
                  <option value="America/Bogota">America/Bogota (GMT-5)</option>
                  <option value="America/Argentina/Buenos_Aires">Argentina (GMT-3)</option>
                  <option value="Europe/Madrid">Europe/Madrid (GMT+1)</option>
                  <option value="UTC">UTC (GMT+0)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none disabled:opacity-50"
            >
              <Save size={16} />
              {profileLoading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="rounded-xl border border-border bg-card text-card-foreground p-6 space-y-6 flex flex-col justify-between shadow-sm">
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <Key size={18} className="text-muted-foreground" />
              <h2 className="font-semibold text-base">Seguridad</h2>
            </div>

            {passwordSuccess && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-600 flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Contraseña Actual</label>
                <div className="relative flex items-center">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background pl-3.5 pr-10 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                    title={showCurrentPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Nueva Contraseña</label>
                <div className="relative flex items-center">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background pl-3.5 pr-10 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                    title={showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Confirmar Nueva Contraseña</label>
                <div className="relative flex items-center">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background pl-3.5 pr-10 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                    title={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="flex items-center justify-center gap-2 rounded-lg bg-secondary border border-border px-4 py-2 text-sm font-medium text-secondary-foreground shadow transition-colors hover:bg-secondary/80 focus:outline-none disabled:opacity-50"
              >
                {passwordLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
