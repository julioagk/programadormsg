'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import ContactSelector from '@/components/shared/ContactSelector';
import { 
  Send, 
  Paperclip, 
  Trash2, 
  FileText, 
  FileImage, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  HelpCircle,
  Plus
} from 'lucide-react';

interface Contact {
  id: string;
  jid: string;
  name: string | null;
  pushName: string | null;
}

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
  attachments?: Attachment[];
}

export default function ScheduleMessage() {
  const router = useRouter();
  
  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [scheduledAtDate, setScheduledAtDate] = useState('');
  const [scheduledAtTime, setScheduledAtTime] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [sendImmediately, setSendImmediately] = useState(true);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // UI States
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // 1. Fetch user timezone
    const fetchUserConfig = async () => {
      try {
        const user = await apiFetch('/auth/me');
        if (user.settings?.timezone) {
          setTimezone(user.settings.timezone);
        }
      } catch (err) {
        // ignore
      }
    };

    // 2. Fetch templates
    const fetchTemplates = async () => {
      try {
        const data = await apiFetch('/templates');
        setTemplates(data);
        
        // Check query parameters for pre-selected template
        const urlParams = new URLSearchParams(window.location.search);
        const queryTemplateId = urlParams.get('templateId');
        if (queryTemplateId) {
          const template = data.find((t: any) => t.id === queryTemplateId);
          if (template) {
            setSelectedTemplateId(queryTemplateId);
            setMessage(template.message);
            if (template.attachments) {
              setAttachments(template.attachments);
            }
          }
        }
      } catch (err) {
        // ignore
      }
    };

    // Default scheduled date/time to tomorrow 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduledAtDate(tomorrow.toISOString().split('T')[0]);
    setScheduledAtTime('10:00');

    fetchUserConfig();
    fetchTemplates();
  }, []);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setMessage(template.message);
      if (template.attachments) {
        setAttachments(template.attachments);
      } else {
        setAttachments([]);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await apiFetch('/storage/upload', {
        method: 'POST',
        body: formData, // Fetch helper handles FormData correctly if json isn't passed
      });

      setAttachments([...attachments, {
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
      }]);
    } catch (err: any) {
      setError(err.message || 'Error al subir el archivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const insertVariable = () => {
    const textarea = messageAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    const newValue = value.substring(0, start) + '{{nombre}}' + value.substring(end);
    setMessage(newValue);

    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 10, start + 10);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (selectedContacts.length === 0) {
      setError('Debes seleccionar al menos un destinatario');
      return;
    }

    if (!message.trim()) {
      setError('El cuerpo del mensaje no puede estar vacío');
      return;
    }

    if (saveAsTemplate && !templateName.trim()) {
      setError('Ingresa un nombre para guardar la plantilla');
      return;
    }

    setLoading(true);

    try {
      // 1. Save template if checked
      if (saveAsTemplate) {
        await apiFetch('/templates', {
          method: 'POST',
          json: {
            name: templateName,
            message,
            attachments,
          },
        });
      }

      // 2. Schedule message
      let scheduledAt = new Date().toISOString();
      if (!sendImmediately) {
        // Parse date and time in local timezone or UTC depending on user config
        // For simple execution, construct date string
        scheduledAt = new Date(`${scheduledAtDate}T${scheduledAtTime}:00`).toISOString();
      }

      await apiFetch('/schedules', {
        method: 'POST',
        json: {
          title: title.trim() || undefined,
          message,
          scheduledAt,
          timezone,
          recipients: selectedContacts.map((c) => ({
            whatsappNumber: c.jid,
            contactName: c.name || c.pushName || undefined,
          })),
          attachments,
        },
      });

      setSuccess(
        sendImmediately 
          ? 'Mensajes en cola para envío inmediato.' 
          : 'Mensajes programados correctamente.'
      );

      // Reset form
      setTitle('');
      setMessage('');
      setSelectedContacts([]);
      setAttachments([]);
      setSaveAsTemplate(false);
      setTemplateName('');
      
      // Redirect to history page after delay
      setTimeout(() => {
        router.push('/dashboard/history');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Error al programar el mensaje');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Programar Envío</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Crea un mensaje personalizado, adjunta archivos y selecciona tus destinatarios
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-950/50 border border-red-900/50 p-4 text-sm text-red-200 flex items-center gap-3">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-emerald-950/50 border border-emerald-900/50 p-4 text-sm text-emerald-200 flex items-center gap-3">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-3">
        {/* Left column: Message compose */}
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card text-card-foreground p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold">1. Componer Mensaje</h2>

            {/* Template Selector */}
            {templates.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Usar Plantilla existente</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring"
                >
                  <option value="">-- Seleccionar Plantilla (Ninguna) --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Título de la Campaña (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. Recordatorio de Pago, Saludos Semanales..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-muted-foreground">Cuerpo del Mensaje</label>
                <button
                  type="button"
                  onClick={insertVariable}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  title="Inserta el nombre del contacto de WhatsApp dinámicamente"
                >
                  <Plus size={12} />
                  Insertar {"{{nombre}}"}
                </button>
              </div>
              <textarea
                ref={messageAreaRef}
                rows={6}
                placeholder="Escribe tu mensaje aquí..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring font-sans"
              />
            </div>

            {/* Attachments list & Upload */}
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

              {/* Attachments Previews */}
              {attachments.length > 0 && (
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                  {attachments.map((att, index) => {
                    const isImage = att.mimeType.startsWith('image/');
                    return (
                      <div key={index} className="relative group rounded-lg border border-border bg-muted/40 p-2 flex items-center gap-2">
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-muted-foreground shrink-0 overflow-hidden">
                          {isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={att.fileUrl} alt={att.fileName} className="h-full w-full object-cover" />
                          ) : (
                            <FileText size={16} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{att.fileName}</p>
                          <p className="text-[10px] text-muted-foreground">{(att.fileSize / 1024).toFixed(0)} KB</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Template Toggle */}
            <div className="pt-2 border-t border-border space-y-3">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="rounded border-input bg-background text-primary focus:ring-primary/20"
                />
                <span>Guardar este mensaje como plantilla</span>
              </label>

              {saveAsTemplate && (
                <div className="space-y-1.5 pl-6">
                  <label className="text-xs font-semibold text-muted-foreground">Nombre de la Plantilla</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Plantilla de Bienvenida"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-ring"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Time Scheduling Configuration */}
          <div className="rounded-xl border border-border bg-card text-card-foreground p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold">2. Programar Fecha y Hora</h2>

            <div className="grid grid-cols-2 gap-4">
              <label className={`rounded-xl border p-4 flex flex-col gap-1 cursor-pointer transition-colors ${
                sendImmediately 
                  ? 'bg-primary/10 border-primary/20 text-primary' 
                  : 'bg-background border-border hover:border-muted-foreground/30'
              }`}>
                <input
                  type="radio"
                  name="schedule_type"
                  checked={sendImmediately}
                  onChange={() => setSendImmediately(true)}
                  className="sr-only"
                />
                <span className="text-sm font-semibold">Enviar ahora</span>
                <span className="text-xs text-muted-foreground">
                  Comienza el envío tan pronto como presiones el botón
                </span>
              </label>

              <label className={`rounded-xl border p-4 flex flex-col gap-1 cursor-pointer transition-colors ${
                !sendImmediately 
                  ? 'bg-primary/10 border-primary/20 text-primary' 
                  : 'bg-background border-border hover:border-muted-foreground/30'
              }`}>
                <input
                  type="radio"
                  name="schedule_type"
                  checked={!sendImmediately}
                  onChange={() => setSendImmediately(false)}
                  className="sr-only"
                />
                <span className="text-sm font-semibold">Programar fecha</span>
                <span className="text-xs text-muted-foreground">
                  Selecciona una fecha y hora específicas de envío
                </span>
              </label>
            </div>

            {!sendImmediately && (
              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border animate-fadeIn">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Fecha de envío</label>
                  <input
                    type="date"
                    required={!sendImmediately}
                    value={scheduledAtDate}
                    onChange={(e) => setScheduledAtDate(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Hora de envío</label>
                  <input
                    type="time"
                    required={!sendImmediately}
                    value={scheduledAtTime}
                    onChange={(e) => setScheduledAtTime(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Contact selection & Submit */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card text-card-foreground p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold">3. Destinatarios</h2>
            <ContactSelector 
              selectedContacts={selectedContacts}
              onChange={setSelectedContacts}
            />
          </div>

          <div className="rounded-xl border border-border bg-card text-card-foreground p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-semibold">Resumen de Envío</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Destinatarios:</span>
                <span className="font-semibold text-foreground">{selectedContacts.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Archivos adjuntos:</span>
                <span className="font-semibold text-foreground">{attachments.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Programación:</span>
                <span className="font-semibold text-foreground">
                  {sendImmediately ? 'Inmediato' : 'Programado'}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || selectedContacts.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 mt-4 shadow"
            >
              {loading ? (
                <>
                  <Clock className="animate-spin" size={16} />
                  Programando...
                </>
              ) : (
                <>
                  <Send size={16} />
                  {sendImmediately ? 'Enviar Mensajes' : 'Programar Envío'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
