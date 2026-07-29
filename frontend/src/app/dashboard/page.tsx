'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { 
  CheckCircle2, 
  Clock, 
  QrCode, 
  AlertCircle, 
  ArrowRight,
  RefreshCw,
  MessageSquare,
  Send,
  Zap
} from 'lucide-react';

interface DashboardStats {
  whatsappConnected: boolean;
  whatsappPhone: string | null;
  whatsappName: string | null;
  scheduledCount: number;
  sentCount: number;
}

interface UpcomingMessage {
  id: string;
  title: string | null;
  message: string;
  scheduledAt: string;
  recipientsCount: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    whatsappConnected: false,
    whatsappPhone: null,
    whatsappName: null,
    scheduledCount: 0,
    sentCount: 0,
  });
  const [upcoming, setUpcoming] = useState<UpcomingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setError(null);
    try {
      const data = await apiFetch('/dashboard/stats');

      setStats({
        whatsappConnected: data.whatsapp?.status === 'CONNECTED',
        whatsappPhone: data.whatsapp?.phoneNumber || null,
        whatsappName: data.whatsapp?.profileName || null,
        scheduledCount: data.stats?.pending || 0,
        sentCount: data.stats?.sent || 0,
      });

      setUpcoming(
        (data.nextSends || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          message: item.messagePreview,
          scheduledAt: item.runAt,
          recipientsCount: 1,
        })),
      );
    } catch (err: any) {
      console.error(err);
      setError('No se pudieron obtener los datos de la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/10 border-t-emerald-500" />
        <p className="text-sm font-medium text-muted-foreground">Cargando panel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-800 to-zinc-900 bg-clip-text">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Resumen del estado de vinculación y mensajes de WhatsApp
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin text-emerald-600' : 'transition-transform hover:rotate-180 duration-300'} />
          <span>Actualizar</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* WhatsApp Connection */}
        <div className="group rounded-2xl border border-zinc-200/80 bg-white p-6 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.015)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.025)] hover:border-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Canal WhatsApp</span>
            <div className={`h-2.5 w-2.5 rounded-full ${stats.whatsappConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`} />
          </div>
          <div className="mt-5">
            {stats.whatsappConnected ? (
              <div className="space-y-1">
                <p className="text-lg font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors">
                  {stats.whatsappName || 'Conectado'}
                </p>
                <p className="text-sm font-medium text-zinc-500">{stats.whatsappPhone || 'Desconocido'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-base font-bold text-zinc-400">Desvinculado</p>
                <Link
                  href="/dashboard/connect"
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <QrCode size={14} />
                  Vincular Cuenta
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Scheduled Messages */}
        <div className="group rounded-2xl border border-zinc-200/80 bg-white p-6 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.015)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.025)] hover:border-amber-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Programados</span>
            <Clock size={16} className="text-zinc-400 group-hover:text-amber-500 transition-colors" />
          </div>
          <div className="mt-5">
            <p className="text-3xl font-extrabold tracking-tight text-zinc-900">{stats.scheduledCount}</p>
            <p className="text-xs font-semibold text-zinc-400 mt-1">Mensajes pendientes de envío</p>
          </div>
        </div>

        {/* Sent Messages */}
        <div className="group rounded-2xl border border-zinc-200/80 bg-white p-6 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.015)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.025)] hover:border-sky-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Enviados</span>
            <CheckCircle2 size={16} className="text-zinc-400 group-hover:text-sky-500 transition-colors" />
          </div>
          <div className="mt-5">
            <p className="text-3xl font-extrabold tracking-tight text-zinc-900">{stats.sentCount}</p>
            <p className="text-xs font-semibold text-zinc-400 mt-1">Entregas exitosas</p>
          </div>
        </div>
      </div>

      {/* Upcoming Sendings */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.015)]">
        <div className="border-b border-zinc-100 bg-zinc-50/40 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send size={16} className="text-zinc-500" />
            <h2 className="font-bold text-sm text-zinc-800">Próximos Envíos</h2>
          </div>
          <Link
            href="/dashboard/schedule"
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <span>Nuevo envío</span>
            <ArrowRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-zinc-100">
          {upcoming.length === 0 ? (
            <div className="text-center py-16 text-zinc-400 space-y-3">
              <Zap size={32} className="mx-auto opacity-35" />
              <p className="text-sm font-medium">No tienes próximos mensajes programados.</p>
            </div>
          ) : (
            upcoming.map((msg) => (
              <div key={msg.id} className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-zinc-50/40 transition-colors">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-zinc-800">
                    {msg.title || 'Mensaje Programado'}
                  </h3>
                  <p className="text-sm text-zinc-500 line-clamp-1 max-w-xl">
                    {msg.message}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium shrink-0">
                  <span className="text-zinc-400">
                    {new Date(msg.scheduledAt).toLocaleString('es-MX', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                  <span className="rounded-lg bg-zinc-100 text-zinc-600 border border-zinc-200/50 px-2.5 py-1 text-[11px] font-bold">
                    {msg.recipientsCount} {msg.recipientsCount === 1 ? 'destinatario' : 'destinatarios'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
