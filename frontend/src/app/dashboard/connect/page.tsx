'use client';

import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { QrCode, RefreshCw, CheckCircle2, AlertCircle, Smartphone, Info } from 'lucide-react';
import QRCode from 'qrcode';

export default function ConnectWhatsApp() {
  const [status, setStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    // Initialize socket connection
    const socketInstance = io(`${apiUrl}/whatsapp`, {
      query: { token },
      transports: ['websocket'],
    });

    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setError(null);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError('Error de conexión con el servidor de mensajería.');
      setInitializing(false);
    });

    socketInstance.on('whatsapp-status', (data) => {
      setStatus(data.status);
      if (data.status === 'CONNECTED') {
        setProfileName(data.profileName);
        setPhoneNumber(data.phoneNumber);
        setQrCodeData(null);
      }
      setInitializing(false);
    });

    socketInstance.on('whatsapp-qr', async (data) => {
      try {
        // Baileys emits raw QR text, we generate a data URL image from it
        const qrImage = await QRCode.toDataURL(data.qr, {
          width: 250,
          margin: 2,
          color: {
            dark: '#18181b', // tailwind zinc-900
            light: '#ffffff',
          },
        });
        setQrCodeData(qrImage);
        setStatus('DISCONNECTED'); // Re-evaluate status
      } catch (err) {
        console.error('Failed to render QR Code:', err);
      }
      setInitializing(false);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const handleStartConnection = () => {
    if (!socket) return;
    setInitializing(true);
    setError(null);
    socket.emit('initialize-whatsapp');
  };

  const handleCancelConnection = () => {
    if (!socket) return;
    socket.emit('disconnect-whatsapp');
    setInitializing(false);
    setQrCodeData(null);
  };

  const handleDisconnect = () => {
    if (!socket) return;
    if (confirm('¿Estás seguro de que deseas desconectar tu cuenta de WhatsApp?')) {
      socket.emit('disconnect-whatsapp');
      setQrCodeData(null);
      setProfileName(null);
      setPhoneNumber(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conectar WhatsApp</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Vincula tu cuenta de WhatsApp mediante código QR para enviar mensajes
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-3">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {/* Connection Panel */}
        <div className="rounded-xl border border-border bg-card text-card-foreground p-6 flex flex-col justify-between space-y-6 shadow-sm">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Estado de Conexión</h2>
            
            {/* Status indicator */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
              <div className={`h-3 w-3 rounded-full animate-pulse ${
                status === 'CONNECTED' ? 'bg-emerald-500' :
                status === 'CONNECTING' ? 'bg-amber-500' : 'bg-muted-foreground/30'
              }`} />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {status === 'CONNECTED' && 'Conectado'}
                  {status === 'CONNECTING' && 'Iniciando conexión...'}
                  {status === 'DISCONNECTED' && 'Desconectado'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {status === 'CONNECTED' && 'Tu dispositivo está listo para enviar mensajes.'}
                  {status === 'CONNECTING' && 'Generando código QR, por favor espera.'}
                  {status === 'DISCONNECTED' && 'Escanea el código QR para vincular tu dispositivo.'}
                </p>
              </div>
            </div>

            {status === 'CONNECTED' && (
              <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border text-sm">
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Nombre de perfil:</span>
                  <span className="font-medium text-foreground">{profileName || 'Desconocido'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Número de teléfono:</span>
                  <span className="font-medium text-foreground">+{phoneNumber}</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border space-y-2">
            {status === 'CONNECTED' ? (
              <button
                onClick={handleDisconnect}
                className="w-full rounded-lg bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 text-sm font-medium transition-colors hover:bg-destructive/20"
              >
                Desconectar cuenta
              </button>
            ) : (
              <>
                <button
                  onClick={handleStartConnection}
                  disabled={initializing || status === 'CONNECTING'}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {initializing || status === 'CONNECTING' ? (
                    <>
                      <RefreshCw className="animate-spin" size={16} />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <QrCode size={16} />
                      Generar código QR
                    </>
                  )}
                </button>
                {(initializing || status === 'CONNECTING') && (
                  <button
                    onClick={handleCancelConnection}
                    className="w-full rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2 text-sm font-medium transition-colors"
                  >
                    Cancelar vinculación
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* QR Code Panel */}
        <div className="rounded-xl border border-border bg-card text-card-foreground p-6 flex flex-col items-center justify-center min-h-[350px] shadow-sm">
          {status === 'CONNECTED' ? (
            <div className="text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">¡Conexión Exitosa!</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Tu cuenta está vinculada. Ya puedes crear y programar mensajes para tus contactos.
                </p>
              </div>
            </div>
          ) : qrCodeData ? (
            <div className="text-center space-y-6">
              <div className="bg-white p-4 rounded-xl inline-block shadow-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodeData} alt="WhatsApp QR Code" className="w-[200px] h-[200px]" />
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Escanea el código con tu celular:</p>
                <ol className="list-decimal text-left max-w-xs mx-auto space-y-1 pl-4 mt-2">
                  <li>Abre WhatsApp en tu teléfono.</li>
                  <li>Ve a Menú o Configuración &gt; Dispositivos vinculados.</li>
                  <li>Toca en Vincular un dispositivo.</li>
                  <li>Apunta tu cámara a esta pantalla.</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3 text-muted-foreground">
              <Smartphone size={48} className="mx-auto stroke-[1.5]" />
              <p className="text-sm max-w-xs mx-auto">
                Haz clic en &quot;Generar código QR&quot; para iniciar el proceso de vinculación.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
