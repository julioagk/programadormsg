'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { 
  History, 
  Trash2, 
  XCircle, 
  Eye, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  HelpCircle,
  Search,
  X
} from 'lucide-react';

interface Recipient {
  id: string;
  whatsappNumber: string;
  contactName: string | null;
  status: 'PENDING' | 'SENDING' | 'SENT' | 'ERROR' | 'CANCELLED';
  errorLog: string | null;
  sentAt: string | null;
  runAt: string | null;
}

interface Attachment {
  fileName: string;
  fileUrl: string;
}

interface Schedule {
  id: string;
  title: string | null;
  message: string;
  scheduledAt: string;
  timezone: string;
  createdAt: string;
  attachments: Attachment[];
  recipients: Recipient[];
}

export default function DeliveryHistory() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Detail Modal State
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchHistory = async () => {
    try {
      const data = await apiFetch('/schedules');
      setSchedules(data);
    } catch (err: any) {
      setError(err.message || 'Error al obtener el historial de envíos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleCancelMessage = async (scheduleId: string) => {
    if (!confirm('¿Estás seguro de que deseas cancelar todos los envíos pendientes de este mensaje?')) {
      return;
    }

    try {
      await apiFetch(`/schedules/${scheduleId}/cancel`, { method: 'POST' });
      fetchHistory();
      
      // Update modal if open
      if (selectedSchedule && selectedSchedule.id === scheduleId) {
        const updated = await apiFetch(`/schedules/${scheduleId}`);
        setSelectedSchedule(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Error al cancelar la programación');
    }
  };

  const handleDeleteMessage = async (scheduleId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este registro? Esto cancelará envíos pendientes.')) {
      return;
    }

    try {
      await apiFetch(`/schedules/${scheduleId}`, { method: 'DELETE' });
      setSchedules(schedules.filter((s) => s.id !== scheduleId));
      if (selectedSchedule?.id === scheduleId) {
        setModalOpen(false);
      }
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la programación');
    }
  };

  const openDetails = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setModalOpen(true);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
      case 'SENDING':
        return 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
      case 'ERROR':
        return 'bg-destructive/10 text-destructive border border-destructive/20';
      default:
        return 'bg-secondary text-secondary-foreground border border-border';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SENT': return 'Enviado';
      case 'PENDING': return 'Pendiente';
      case 'SENDING': return 'Enviando';
      case 'ERROR': return 'Error';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  };

  const calculateDeliveryStats = (recipients: Recipient[]) => {
    const total = recipients.length;
    const sent = recipients.filter((r) => r.status === 'SENT').length;
    const pending = recipients.filter((r) => r.status === 'PENDING' || r.status === 'SENDING').length;
    const failed = recipients.filter((r) => r.status === 'ERROR').length;
    const cancelled = recipients.filter((r) => r.status === 'CANCELLED').length;

    return { total, sent, pending, failed, cancelled };
  };


  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historial de Envíos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Revisa el estado de todos tus mensajes programados, enviados y cancelados
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-3">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Schedules Table */}
      <div className="rounded-xl border border-border bg-card text-card-foreground overflow-hidden shadow-sm">
        {schedules.length === 0 ? (
          <div className="text-center py-20 text-sm text-muted-foreground">
            No se han programado envíos todavía.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-medium">
                  <th className="px-6 py-4">Campaña / Mensaje</th>
                  <th className="px-6 py-4">Fecha Programación</th>
                  <th className="px-6 py-4">Destinatarios</th>
                  <th className="px-6 py-4">Progreso de Envío</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {schedules.map((schedule) => {
                  const stats = calculateDeliveryStats(schedule.recipients);
                  const isFinished = stats.pending === 0;

                  return (
                    <tr key={schedule.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 max-w-xs">
                        <div className="font-semibold text-foreground truncate">
                          {schedule.title || 'Mensaje General'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {schedule.message}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-foreground">
                        {new Date(schedule.scheduledAt).toLocaleString('es-MX', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-6 py-4 text-foreground">
                        {stats.total} {stats.total === 1 ? 'contacto' : 'contactos'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex gap-2 text-xs">
                            {stats.sent > 0 && <span className="text-emerald-500 font-medium">{stats.sent} env.</span>}
                            {stats.failed > 0 && <span className="text-red-400 font-medium">{stats.failed} err.</span>}
                            {stats.pending > 0 && <span className="text-amber-500 font-medium">{stats.pending} pend.</span>}
                            {stats.cancelled > 0 && <span className="text-muted-foreground">{stats.cancelled} canc.</span>}
                          </div>
                          {/* Progress Bar visual indicator */}
                          <div className="h-1.5 w-32 bg-muted rounded-full overflow-hidden border border-border">
                            <div 
                              className="h-full bg-emerald-500 transition-all"
                              style={{ width: `${(stats.sent / stats.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => openDetails(schedule)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                          title="Ver detalles"
                        >
                          <Eye size={14} />
                        </button>
                        
                        {!isFinished && (
                          <button
                            onClick={() => handleCancelMessage(schedule.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-input bg-background text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                            title="Cancelar envíos pendientes"
                          >
                            <XCircle size={14} />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteMessage(schedule.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-input bg-background text-destructive hover:bg-destructive/10 transition-colors"
                          title="Eliminar registro"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Dialog Modal */}
      {modalOpen && selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-2xl bg-card text-card-foreground border border-border rounded-xl overflow-hidden shadow-2xl animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
              <div>
                <h3 className="font-semibold text-lg">Detalles de Envío</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedSchedule.title || 'Mensaje General'}
                </p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto">
              {/* Message details */}
              <div className="p-4 rounded-lg bg-muted/40 border border-border text-sm space-y-2">
                <p className="font-medium text-muted-foreground">Mensaje enviado:</p>
                <p className="text-foreground whitespace-pre-wrap">{selectedSchedule.message}</p>
                
                {selectedSchedule.attachments && selectedSchedule.attachments.length > 0 && (
                  <div className="pt-2 border-t border-border mt-2">
                    <p className="text-xs font-semibold text-muted-foreground">Archivos adjuntos:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedSchedule.attachments.map((att, i) => (
                        <span key={i} className="text-xs rounded bg-secondary text-secondary-foreground border border-border px-2.5 py-1">
                          {att.fileName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Recipients list table */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Estado por Destinatario</h4>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-muted/60 text-muted-foreground font-medium border-b border-border">
                        <th className="px-4 py-3">Contacto</th>
                        <th className="px-4 py-3">Número</th>
                        <th className="px-4 py-3">Hora Envío</th>
                        <th className="px-4 py-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedSchedule.recipients.map((rec) => (
                        <tr key={rec.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-semibold text-foreground">
                            {rec.contactName || 'Desconocido'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            +{rec.whatsappNumber.split('@')[0]}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {rec.sentAt 
                              ? new Date(rec.sentAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                              : rec.runAt
                                ? new Date(rec.runAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) + ' (Prog.)'
                                : 'No definida'
                            }
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${getStatusBadgeClass(rec.status)}`}>
                              {getStatusText(rec.status)}
                            </span>
                            {rec.errorLog && (
                              <p className="text-[10px] text-red-400 mt-1 max-w-[150px] truncate" title={rec.errorLog}>
                                Error: {rec.errorLog}
                              </p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end px-6 py-4 border-t border-border bg-muted/20">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg bg-secondary text-secondary-foreground px-4 py-2 text-sm font-semibold hover:bg-secondary/80 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
