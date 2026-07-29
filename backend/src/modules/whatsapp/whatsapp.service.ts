import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import makeWASocket, {
  AuthenticationCreds,
  BufferJSON,
  DisconnectReason,
  fetchLatestBaileysVersion,
  initAuthCreds,
  useMultiFileAuthState,
  WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { WhatsAppGateway } from './whatsapp.gateway';

@Injectable()
export class WhatsAppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppService.name);
  private sockets = new Map<string, WASocket>();
  private gateway: WhatsAppGateway;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Clean up any legacy LID/group/broadcast contacts from database
    try {
      await this.prisma.whatsAppContact.deleteMany({
        where: {
          NOT: {
            jid: { endsWith: '@s.whatsapp.net' },
          },
        },
      });
      this.logger.log('Legacy non-user contacts cleaned up successfully from database.');
    } catch (err) {
      this.logger.error('Error cleaning up legacy non-user contacts:', err);
    }

    // We will auto-reconnect existing active sessions on startup
    this.reconnectActiveSessions();
  }

  onModuleDestroy() {
    // Close all sockets on shutdown
    for (const [userId, socket] of this.sockets.entries()) {
      socket.end(undefined);
      this.sockets.delete(userId);
    }
  }

  setGateway(gateway: WhatsAppGateway) {
    this.gateway = gateway;
  }

  getSocket(userId: string): WASocket | undefined {
    return this.sockets.get(userId);
  }

  async getSessionStatus(userId: string) {
    const session = await this.prisma.whatsAppSession.findUnique({
      where: { userId },
      select: {
        status: true,
        phoneNumber: true,
        profileName: true,
        connectedAt: true,
        qrCode: true,
      },
    });

    return session || { status: 'DISCONNECTED', phoneNumber: null, profileName: null, connectedAt: null, qrCode: null };
  }

  async disconnect(userId: string) {
    const socket = this.sockets.get(userId);
    if (socket) {
      try {
        await socket.logout();
      } catch (err) {
        this.logger.error(`Error logging out socket for user ${userId}:`, err);
      }
      socket.end(undefined);
      this.sockets.delete(userId);
    }

    await this.prisma.whatsAppSession.update({
      where: { userId },
      data: {
        status: 'DISCONNECTED',
        qrCode: null,
        sessionData: Prisma.DbNull,
      },
    });

    if (this.gateway) {
      this.gateway.emitToUser(userId, 'whatsapp-status', { status: 'DISCONNECTED' });
    }
  }

  async connect(userId: string) {
    // If already connected, do nothing
    if (this.sockets.has(userId)) {
      const status = await this.getSessionStatus(userId);
      if (status.status === 'CONNECTED') {
        if (this.gateway) {
          this.gateway.emitToUser(userId, 'whatsapp-status', {
            status: 'CONNECTED',
            profileName: status.profileName,
            phoneNumber: status.phoneNumber,
          });
        }
        return;
      }

      // If it exists but is not connected, clean it up before creating a new one
      const existingSocket = this.sockets.get(userId);
      if (existingSocket) {
        try {
          existingSocket.end(undefined);
        } catch (e) {}
        this.sockets.delete(userId);
      }
    }

    this.logger.log(`Initializing WhatsApp connection for user ${userId}`);
    await this.prisma.whatsAppSession.upsert({
      where: { userId },
      create: { userId, status: 'CONNECTING' },
      update: { status: 'CONNECTING', qrCode: null },
    });

    if (this.gateway) {
      this.gateway.emitToUser(userId, 'whatsapp-status', { status: 'CONNECTING' });
    }

    try {
      const { state, saveCreds } = await this.usePrismaAuthState(userId);

      // Fetch the latest WhatsApp Web version to bypass 405 Method Not Allowed error
      let version: [number, number, number] = [2, 3000, 1017531287]; // Fallback version
      try {
        const latest = await fetchLatestBaileysVersion();
        version = latest.version;
        this.logger.log(`Fetched latest WhatsApp Web version: ${version.join('.')}`);
      } catch (err) {
        this.logger.warn(`Failed to fetch latest WhatsApp version, using fallback: ${err.message}`);
      }

      const socket = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }) as any,
        printQRInTerminal: false,
      });

      this.sockets.set(userId, socket);

      socket.ev.on('creds.update', saveCreds);

      socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.logger.log(`New QR code generated for user ${userId}`);
          await this.prisma.whatsAppSession.update({
            where: { userId },
            data: { qrCode: qr },
          });

          if (this.gateway) {
            this.gateway.emitToUser(userId, 'whatsapp-qr', { qr });
          }
        }

        if (connection === 'open') {
          const userJid = socket.user?.id;
          const phoneNumber = userJid ? userJid.split(':')[0] : null;
          const profileName = socket.user?.name || null;

          this.logger.log(`WhatsApp connection opened for user ${userId} (${phoneNumber})`);

          await this.prisma.whatsAppSession.update({
            where: { userId },
            data: {
              status: 'CONNECTED',
              phoneNumber,
              profileName,
              qrCode: null,
              connectedAt: new Date(),
            },
          });

          if (this.gateway) {
            this.gateway.emitToUser(userId, 'whatsapp-status', {
              status: 'CONNECTED',
              profileName,
              phoneNumber,
            });
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const errorMsg = lastDisconnect?.error?.message || lastDisconnect?.error;

          const shouldReconnect =
            statusCode !== DisconnectReason.loggedOut &&
            statusCode !== DisconnectReason.badSession &&
            statusCode !== 403 &&
            statusCode !== 405;

          this.logger.warn(
            `WhatsApp connection closed for user ${userId}. Status: ${statusCode}, Error: ${errorMsg}. Reconnecting: ${shouldReconnect}`,
          );

          // Clean up the socket reference
          const currentSocket = this.sockets.get(userId);
          if (currentSocket) {
            try {
              currentSocket.end(undefined);
            } catch (e) {}
            this.sockets.delete(userId);
          }

          if (shouldReconnect) {
            // Reconnect with 5-second delay to prevent fast infinite loops
            setTimeout(() => {
              this.connect(userId);
            }, 5000);
          } else {
            // Logged out
             await this.prisma.whatsAppSession.update({
              where: { userId },
              data: {
                status: 'DISCONNECTED',
                phoneNumber: null,
                profileName: null,
                qrCode: null,
                sessionData: Prisma.DbNull,
              },
            });

            if (this.gateway) {
              this.gateway.emitToUser(userId, 'whatsapp-status', { status: 'DISCONNECTED' });
            }
          }
        }
      });

      // Cache contacts when they are synced
      socket.ev.on('contacts.upsert', async (contacts) => {
        this.logger.log(`Contacts sync: Upserting ${contacts.length} contacts for user ${userId}`);
        const session = await this.prisma.whatsAppSession.findUnique({
          where: { userId },
        });

        if (!session) return;

        for (const contact of contacts) {
          // Only keep standard WhatsApp user contacts
          if (!contact.id.endsWith('@s.whatsapp.net')) continue;

          await this.prisma.whatsAppContact.upsert({
            where: {
              sessionId_jid: {
                sessionId: session.id,
                jid: contact.id,
              },
            },
            create: {
              sessionId: session.id,
              jid: contact.id,
              name: contact.name || contact.verifiedName || null,
              pushName: contact.notify || null,
            },
            update: {
              name: contact.name || contact.verifiedName || null,
              pushName: contact.notify || null,
            },
          });
        }
      });

      // Cache contacts from connection history
      socket.ev.on('messaging-history.set', async ({ contacts }) => {
        if (!contacts) return;
        this.logger.log(`History sync: Loading ${contacts.length} contacts for user ${userId}`);
        
        const session = await this.prisma.whatsAppSession.findUnique({
          where: { userId },
        });

        if (!session) return;

        for (const contact of contacts) {
          // Only keep standard WhatsApp user contacts
          if (!contact.id.endsWith('@s.whatsapp.net')) continue;

          await this.prisma.whatsAppContact.upsert({
            where: {
              sessionId_jid: {
                sessionId: session.id,
                jid: contact.id,
              },
            },
            create: {
              sessionId: session.id,
              jid: contact.id,
              name: contact.name || contact.verifiedName || null,
              pushName: contact.notify || null,
            },
            update: {
              name: contact.name || contact.verifiedName || null,
              pushName: contact.notify || null,
            },
          });
        }
      });

    } catch (err) {
      this.logger.error(`Failed to initialize WhatsApp connection for user ${userId}:`, err);
      await this.prisma.whatsAppSession.update({
        where: { userId },
        data: { status: 'DISCONNECTED', qrCode: null },
      });
      if (this.gateway) {
        this.gateway.emitToUser(userId, 'whatsapp-status', { status: 'DISCONNECTED' });
      }
    }
  }

  private async reconnectActiveSessions() {
    const activeSessions = await this.prisma.whatsAppSession.findMany({
      where: { status: 'CONNECTED' },
    });

    this.logger.log(`Found ${activeSessions.length} active sessions to reconnect on startup.`);
    for (const session of activeSessions) {
      this.connect(session.userId);
    }
  }

  // Custom database-backed auth state provider
  private async usePrismaAuthState(userId: string) {
    const prisma = this.prisma;
    
    // Get initial session
    const getSession = async () => {
      return prisma.whatsAppSession.findUnique({
        where: { userId },
      });
    };

    const session = await getSession();
    let sessionMap: Record<string, any> = {};

    if (session && session.sessionData) {
      const dataStr = typeof session.sessionData === 'string'
        ? session.sessionData
        : JSON.stringify(session.sessionData);
      try {
        sessionMap = JSON.parse(dataStr, BufferJSON.reviver) || {};
      } catch (err) {
        this.logger.error(`Error parsing session data for user ${userId}:`, err);
        sessionMap = {};
      }
    }

    const creds: AuthenticationCreds = sessionMap.creds || initAuthCreds();

    let saveTimeout: NodeJS.Timeout | null = null;
    let isSaving = false;

    const saveState = () => {
      if (saveTimeout) clearTimeout(saveTimeout);

      const runSave = async () => {
        if (isSaving) {
          saveTimeout = setTimeout(runSave, 50);
          return;
        }

        isSaving = true;
        try {
          sessionMap.creds = creds;
          const serialized = JSON.parse(JSON.stringify(sessionMap, BufferJSON.replacer));
          await prisma.whatsAppSession.update({
            where: { userId },
            data: {
              sessionData: serialized,
            },
          });
        } catch (err) {
          this.logger.error(`Error saving auth state for user ${userId}:`, err);
        } finally {
          isSaving = false;
        }
      };

      saveTimeout = setTimeout(runSave, 200);
    };

    return {
      state: {
        creds,
        keys: {
          get: async (type: string, ids: string[]) => {
            const data: Record<string, any> = {};
            for (const id of ids) {
              const key = `${type}-${id}`;
              let value = sessionMap[key];
              if (value) {
                // If it's a Buffer format object, restore it
                if (value && typeof value === 'object' && value.type === 'Buffer') {
                  value = Buffer.from(value.data);
                }
                data[id] = value;
              }
            }
            return data;
          },
          set: async (data: any) => {
            for (const category of Object.keys(data)) {
              for (const id of Object.keys(data[category])) {
                const value = data[category][id];
                const key = `${category}-${id}`;
                if (value) {
                  sessionMap[key] = value;
                } else {
                  delete sessionMap[key];
                }
              }
            }
            saveState();
          },
        },
      },
      saveCreds: saveState,
    };
  }
}
