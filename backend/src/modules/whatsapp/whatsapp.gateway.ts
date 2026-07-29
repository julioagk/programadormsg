import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'whatsapp',
})
export class WhatsAppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WhatsAppGateway.name);

  @WebSocketServer() server: Server;

  constructor(
    @Inject(forwardRef(() => WhatsAppService))
    private readonly whatsappService: WhatsAppService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit() {
    this.whatsappService.setGateway(this);
    this.logger.log('WhatsApp WebSocket Gateway Initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Authenticate socket connection via query token
      const token = client.handshake.query.token as string;
      if (!token) {
        this.logger.warn(`Disconnecting unauthenticated socket client: ${client.id}`);
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync(token, { secret });
      
      const userId = payload.sub;
      client.data.userId = userId;
      
      // Join a room specific to the user
      await client.join(`user-${userId}`);
      this.logger.log(`Client ${client.id} authenticated for user ${userId} and joined room`);
      
      // Send initial status
      const status = await this.whatsappService.getSessionStatus(userId);
      client.emit('whatsapp-status', {
        status: status.status,
        profileName: status.profileName,
        phoneNumber: status.phoneNumber,
        qrCode: status.qrCode,
      });

    } catch (err) {
      this.logger.warn(`Authentication failed for client ${client.id}: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('initialize-whatsapp')
  async handleInitializeWhatsApp(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    this.logger.log(`Received initialize-whatsapp request for user ${userId}`);
    await this.whatsappService.connect(userId);
  }

  @SubscribeMessage('disconnect-whatsapp')
  async handleDisconnectWhatsApp(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    this.logger.log(`Received disconnect-whatsapp request for user ${userId}`);
    await this.whatsappService.disconnect(userId);
  }

  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user-${userId}`).emit(event, data);
  }
}
