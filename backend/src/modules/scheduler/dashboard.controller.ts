import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  async getDashboardStats(@CurrentUser() user: { id: string }) {
    // 1. Get WhatsApp status
    const whatsapp = await this.prisma.whatsAppSession.findUnique({
      where: { userId: user.id },
      select: {
        status: true,
        phoneNumber: true,
        profileName: true,
      },
    });

    // 2. Count recipients statuses
    const pendingCount = await this.prisma.scheduledMessageRecipient.count({
      where: {
        scheduledMessage: { userId: user.id },
        status: 'PENDING',
      },
    });

    const sentCount = await this.prisma.scheduledMessageRecipient.count({
      where: {
        scheduledMessage: { userId: user.id },
        status: 'SENT',
      },
    });

    const errorCount = await this.prisma.scheduledMessageRecipient.count({
      where: {
        scheduledMessage: { userId: user.id },
        status: 'ERROR',
      },
    });

    // 3. Get next sends
    const nextSends = (await this.prisma.scheduledMessageRecipient.findMany({
      where: {
        scheduledMessage: { userId: user.id },
        status: 'PENDING',
      },
      include: {
        scheduledMessage: {
          select: {
            title: true,
            message: true,
          },
        },
      },
      orderBy: { runAt: 'asc' } as any,
      take: 5,
    })) as any[];

    return {
      whatsapp: whatsapp || { status: 'DISCONNECTED', phoneNumber: null, profileName: null },
      stats: {
        pending: pendingCount,
        sent: sentCount,
        error: errorCount,
      },
      nextSends: nextSends.map((item) => ({
        id: item.id,
        recipientNumber: item.whatsappNumber,
        recipientName: item.contactName,
        runAt: item.runAt,
        title: item.scheduledMessage.title,
        messagePreview: item.scheduledMessage.message.length > 50 
          ? `${item.scheduledMessage.message.substring(0, 50)}...`
          : item.scheduledMessage.message,
      })),
    };
  }
}
