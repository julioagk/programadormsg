import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('whatsapp/contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getContacts(
    @CurrentUser() user: { id: string },
    @Query('search') search?: string,
  ) {
    const session = await this.prisma.whatsAppSession.findUnique({
      where: { userId: user.id },
    });

    if (!session || session.status !== 'CONNECTED') {
      return [];
    }

    const whereClause: any = {
      sessionId: session.id,
      jid: { endsWith: '@s.whatsapp.net' },
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { pushName: { contains: search } },
        { jid: { contains: search } },
      ];
    }

    return this.prisma.whatsAppContact.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      take: 100, // Limit to 100 for performance
    });
  }
}
