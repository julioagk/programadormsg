'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { 
  FileText, 
  Trash2, 
  Plus, 
  Send, 
  Paperclip, 
  FileText as FileIcon, 
  AlertCircle, 
  CheckCircle2, 
  X 
} from 'lucide-react';

interface Attachment {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
}

interface Template {
  id: string;
  name: string;
  message: string;
  createdAt: string;
  attachments?: Attachment[];
}

export default function MessageTemplates() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Template Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTemplates = async () => {
    try {
      const data = await apiFetch('/templates');
      setTemplates(data);
    } catch (err: any) {
      setError(err.message || 'Error al obtener las plantillas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta plantilla?')) {
      return;
    }

    try {
      await apiFetch(`/templates/${templateId}`, { method: 'DELETE' });
      setTemplates(templates.filter((t) => t.id !== templateId));
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la plantilla');
    }
  };

  const handleUseTemplate = (templateId: string) => {
    router.push(`/dashboard/schedule?templateId=${templateId}`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setModalError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await apiFetch('/storage/upload', {
        method: 'POST',
        body: formData,
      });

      setAttachments([...attachments, {
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
      }]);
    } catch (err: any) {
      setModalError(err.message || 'Error al subir el archivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!name.trim()) {
      setModalError('El nombre de la plantilla es requerido');
      return;
    }

    if (!message.trim()) {
      setModalError('El cuerpo del mensaje no puede estar vacío');
      return;
    }

    try {
      const newTemplate = await apiFetch('/templates', {
        method: 'POST',
        json: {
          name,
          message,
          attachments,
        },
      });

      setTemplates([newTemplate, ...templates]);
      setModalOpen(false);
      
      // Reset
      setName('');
      setMessage('');
      setAttachments([]);
    } catch (err: any) {
      setModalError(err.message || 'Error al guardar la plantilla');
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plantillas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona plantillas de mensajes reutilizables con adjuntos y personalización
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus size={16} />
          Nueva Plantilla
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-3">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="rounded-xl border border-border bg-card text-card-foreground py-20 text-center text-sm shadow-sm">
          No has guardado ninguna plantilla. ¡Crea una nueva arriba!
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {templates.map((template) => (
            <div key={template.id} className="rounded-xl border border-border bg-card text-card-foreground p-6 flex flex-col justify-between space-y-4 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-base">{template.name}</h3>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(template.createdAt).toLocaleDateString('es-MX')}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                  {template.message}
                </p>

                {template.attachments && template.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {template.attachments.map((att, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[10px] rounded bg-secondary text-secondary-foreground px-2 py-0.5 border border-border">
                        <FileIcon size={8} />
                        {att.fileName}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border flex justify-between gap-4">
                <button
                  onClick={() => handleUseTemplate(template.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary border border-border text-secondary-foreground px-3 py-1.5 text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  <Send size={12} />
                  Usar Plantilla
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-input bg-background text-destructive hover:bg-destructive/10 transition-colors"
                  title="Eliminar plantilla"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Template Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <form onSubmit={handleSubmit} className="w-full max-w-lg bg-card text-card-foreground border border-border rounded-xl overflow-hidden shadow-2xl animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
              <h3 className="font-semibold text-lg">Nueva Plantilla</h3>
              <button 
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {modalError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Nombre de la plantilla</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Recordatorio de Cobro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring"
                />
              </div>

              {/* Message Body */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-muted-foreground">Mensaje</label>
                  <span className="text-[10px] text-muted-foreground">Usa {"{{nombre}}"} para insertar el nombre del destinatario</span>
                </div>
                <textarea
                  rows={5}
                  required
                  placeholder="Hola {{nombre}}, espero que te encuentres bien..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring font-sans"
                />
              </div>

              {/* Attachments */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-muted-foreground">Archivos Adjuntos</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary-foreground border border-input bg-secondary hover:bg-secondary/80 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Paperclip size={12} />
                    {uploading ? 'Subiendo...' : 'Adjuntar archivo'}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {attachments.length > 0 && (
                  <div className="grid gap-2 grid-cols-2">
                    {attachments.map((att, index) => (
                      <div key={index} className="relative group rounded-lg border border-border bg-muted/40 p-2 flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                          <FileIcon size={12} />
                        </div>
                        <p className="text-xs font-medium text-foreground truncate flex-1">{att.fileName}</p>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="h-4 w-4 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full flex items-center justify-center transition-colors"
                        >
                          <Trash2 size={8} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg bg-secondary text-secondary-foreground px-4 py-2 text-sm font-semibold hover:bg-secondary/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Crear Plantilla
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
