import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateScheduleDto } from './dtos/create-schedule.dto';
import { QueueService } from './queue.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async scheduleMessage(userId: string, dto: CreateScheduleDto) {
    this.logger.log(`Scheduling message for user ${userId} to ${dto.recipients.length} recipients`);

    // 1. Fetch user delay settings
    const settings = await this.prisma.settings.findUnique({
      where: { userId },
    });

    const minDelay = settings?.minDelay ?? 20;
    const maxDelay = settings?.maxDelay ?? 90;

    const now = new Date();
    const baseScheduledAt = new Date(dto.scheduledAt);

    if (baseScheduledAt.getTime() < now.getTime() - 60000) {
      // Allow up to 1 minute of clock drift, otherwise throw if it's too far in the past
      // But if it is meant to send immediately, we just adjust it to now.
      baseScheduledAt.setTime(now.getTime());
    }

    // 2. We run the schedule creation in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create ScheduledMessage
      const scheduledMessage = await tx.scheduledMessage.create({
        data: {
          userId,
          title: dto.title,
          message: dto.message,
          scheduledAt: baseScheduledAt,
          timezone: dto.timezone,
          attachments: dto.attachments && dto.attachments.length > 0 
            ? {
                create: dto.attachments.map((att) => ({
                  fileName: att.fileName,
                  fileUrl: att.fileUrl,
                  mimeType: att.mimeType,
                  fileSize: att.fileSize,
                })),
              }
            : undefined,
        },
        include: {
          attachments: true,
        },
      });

      // Create Recipients inside the transaction (but do NOT queue them yet)
      let cumulativeOffsetSec = 0;
      const createdRecipients = [];

      for (let i = 0; i < dto.recipients.length; i++) {
        const recipientDto = dto.recipients[i];
        
        if (i > 0) {
          const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
          cumulativeOffsetSec += randomDelay;
        }

        const runAt = new Date(baseScheduledAt.getTime() + cumulativeOffsetSec * 1000);

        const recipient = await tx.scheduledMessageRecipient.create({
          data: {
            scheduledMessageId: scheduledMessage.id,
            whatsappNumber: recipientDto.whatsappNumber,
            contactName: recipientDto.contactName || null,
            status: 'PENDING',
            runAt,
          } as any,
        });

        createdRecipients.push(recipient);
      }

      return {
        scheduledMessage,
        createdRecipients,
      };
    });

    // 3. Queue jobs and update job IDs outside the transaction
    const updatedRecipients = [];
    const executionTime = new Date();
    
    for (const recipient of result.createdRecipients) {
      const delayMs = (recipient.runAt ? new Date(recipient.runAt).getTime() : Date.now()) - executionTime.getTime();

      // Enqueue job via QueueService (guaranteed to find the committed record)
      const jobId = await this.queueService.scheduleMessageRecipient(recipient.id, delayMs);

      // Update recipient with its jobId
      const updatedRecipient = await this.prisma.scheduledMessageRecipient.update({
        where: { id: recipient.id },
        data: { jobId },
      });

      updatedRecipients.push(updatedRecipient);
    }

    return {
      ...result.scheduledMessage,
      recipients: updatedRecipients,
    };
  }

  async getSchedules(userId: string) {
    return this.prisma.scheduledMessage.findMany({
      where: { userId },
      include: {
        attachments: true,
        recipients: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async getScheduleDetails(userId: string, scheduleId: string) {
    const schedule = await this.prisma.scheduledMessage.findFirst({
      where: { id: scheduleId, userId },
      include: {
        attachments: true,
        recipients: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException('Programación de mensaje no encontrada');
    }

    return schedule;
  }

  async cancelSchedule(userId: string, scheduleId: string) {
    this.logger.log(`Canceling scheduled message ${scheduleId} for user ${userId}`);

    const schedule = await this.prisma.scheduledMessage.findFirst({
      where: { id: scheduleId, userId },
      include: {
        recipients: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException('Programación de mensaje no encontrada');
    }

    // Cancel all pending or sending recipients
    for (const recipient of schedule.recipients) {
      if (recipient.status === 'PENDING' || recipient.status === 'SENDING') {
        if (recipient.jobId) {
          await this.queueService.cancelScheduledRecipient(recipient.id, recipient.jobId);
        }
        
        await this.prisma.scheduledMessageRecipient.update({
          where: { id: recipient.id },
          data: { status: 'CANCELLED' },
        });
      }
    }

    return { success: true };
  }

  async deleteSchedule(userId: string, scheduleId: string) {
    const schedule = await this.prisma.scheduledMessage.findFirst({
      where: { id: scheduleId, userId },
    });

    if (!schedule) {
      throw new NotFoundException('Programación de mensaje no encontrada');
    }

    // Cancel first
    await this.cancelSchedule(userId, scheduleId);

    // Delete
    await this.prisma.scheduledMessage.delete({
      where: { id: scheduleId },
    });

    return { success: true };
  }
}
