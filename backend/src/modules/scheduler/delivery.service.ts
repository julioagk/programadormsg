import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  async processDelivery(recipientId: string): Promise<void> {
    this.logger.log(`Processing delivery for recipient: ${recipientId}`);

    const recipient = await this.prisma.scheduledMessageRecipient.findUnique({
      where: { id: recipientId },
      include: {
        scheduledMessage: {
          include: {
            attachments: true,
          },
        },
      },
    });

    if (!recipient) {
      this.logger.error(`Recipient ${recipientId} not found in database.`);
      return;
    }

    if (recipient.status === 'CANCELLED') {
      this.logger.log(`Recipient ${recipientId} was cancelled. Skipping.`);
      return;
    }

    // Update status to SENDING
    await this.prisma.scheduledMessageRecipient.update({
      where: { id: recipientId },
      data: { status: 'SENDING' },
    });

    try {
      const schedule = recipient.scheduledMessage;
      const userId = schedule.userId;

      // 1. Get WhatsApp socket
      const socket = this.whatsappService.getSocket(userId);
      const sessionStatus = await this.whatsappService.getSessionStatus(userId);

      if (!socket || sessionStatus.status !== 'CONNECTED') {
        throw new Error('WhatsApp session is disconnected or not initialized.');
      }

      // 2. Format recipient number
      let jid = recipient.whatsappNumber;
      if (!jid.includes('@')) {
        // Remove non-numeric characters just in case, except we keep it clean
        const cleanedNumber = jid.replace(/\D/g, '');
        jid = `${cleanedNumber}@s.whatsapp.net`;
      }

      // 3. Personalize message: replace {{nombre}}
      const contactName = recipient.contactName || 'amigo';
      let personalizedMessage = schedule.message
        .replace(/{{nombre}}/g, contactName)
        .replace(/{{name}}/g, contactName);

      // 4. Send Message (with or without attachments)
      if (schedule.attachments && schedule.attachments.length > 0) {
        // Send attachments first, and attach the text to the first image/video, or send them as separate messages
        // For standard scheduler, we can send the first attachment with the text as caption, and other attachments as separate messages.
        for (let i = 0; i < schedule.attachments.length; i++) {
          const attachment = schedule.attachments[i];
          const isFirst = i === 0;
          const caption = isFirst ? personalizedMessage : '';

          const mimeType = attachment.mimeType.toLowerCase();
          const options: Record<string, any> = {};

          if (mimeType.startsWith('image/')) {
            await socket.sendMessage(jid, {
              image: { url: attachment.fileUrl },
              caption: caption,
            });
          } else if (mimeType.startsWith('video/')) {
            await socket.sendMessage(jid, {
              video: { url: attachment.fileUrl },
              caption: caption,
              mimetype: attachment.mimeType,
            });
          } else if (mimeType.startsWith('audio/')) {
            await socket.sendMessage(jid, {
              audio: { url: attachment.fileUrl },
              mimetype: attachment.mimeType,
              ptt: mimeType.includes('ogg'), // Push to talk (voice note) if ogg
            });
            // If it's audio, send text separately
            if (caption) {
              await socket.sendMessage(jid, { text: caption });
            }
          } else {
            // General document
            await socket.sendMessage(jid, {
              document: { url: attachment.fileUrl },
              mimetype: attachment.mimeType,
              fileName: attachment.fileName,
              caption: caption,
            });
          }
        }
      } else {
        // Just text message
        await socket.sendMessage(jid, { text: personalizedMessage });
      }

      // 5. Success update
      await this.prisma.scheduledMessageRecipient.update({
        where: { id: recipientId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          errorLog: null,
        },
      });

      this.logger.log(`Successfully sent message to recipient ${recipientId} (${jid})`);

    } catch (err) {
      this.logger.error(`Failed to send message to recipient ${recipientId}: ${err.message}`);
      
      await this.prisma.scheduledMessageRecipient.update({
        where: { id: recipientId },
        data: {
          status: 'ERROR',
          errorLog: err.message,
        },
      });
    } finally {
      // 6. Check if parent ScheduledMessage is completed
      await this.updateParentStatus(recipient.scheduledMessageId);
    }
  }

  private async updateParentStatus(scheduledMessageId: string) {
    const recipients = await this.prisma.scheduledMessageRecipient.findMany({
      where: { scheduledMessageId },
    });

    const total = recipients.length;
    const completed = recipients.filter((r) => r.status === 'SENT' || r.status === 'ERROR' || r.status === 'CANCELLED').length;

    if (completed === total) {
      this.logger.log(`All recipients for ScheduledMessage ${scheduledMessageId} processed.`);
      // Update parent status. Since the parent does not have a status column in the database schema!
      // Wait, let's verify if schema.prisma ScheduledMessage model has a status column.
      // Ah! In schema.prisma:
      // model ScheduledMessage {
      //   id          String                      @id @default(uuid())
      //   userId      String
      //   user        User                        @relation(fields: [userId], references: [id], onDelete: Cascade)
      //   title       String?
      //   message     String
      //   scheduledAt DateTime
      //   timezone    String
      //   createdAt   DateTime                    @default(now())
      //   updatedAt   DateTime                    @updatedAt
      //   attachments ScheduledMessageAttachment[]
      //   recipients  ScheduledMessageRecipient[]
      // }
      // There is NO status column on the ScheduledMessage parent in schema.prisma!
      // The status is entirely determined by its recipients! That's correct, since each recipient is independent.
      // We don't need to update a parent status, we just log that it's complete.
    }
  }
}
