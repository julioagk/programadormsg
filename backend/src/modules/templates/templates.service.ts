import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTemplateDto } from './dtos/create-template.dto';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createTemplate(userId: string, dto: CreateTemplateDto) {
    this.logger.log(`Creating template '${dto.name}' for user ${userId}`);

    return this.prisma.messageTemplate.create({
      data: {
        userId,
        name: dto.name,
        message: dto.message,
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
  }

  async getTemplates(userId: string) {
    return this.prisma.messageTemplate.findMany({
      where: { userId },
      include: {
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteTemplate(userId: string, templateId: string) {
    this.logger.log(`Deleting template ${templateId} for user ${userId}`);

    const template = await this.prisma.messageTemplate.findFirst({
      where: { id: templateId, userId },
    });

    if (!template) {
      throw new NotFoundException('Plantilla no encontrada');
    }

    await this.prisma.messageTemplate.delete({
      where: { id: templateId },
    });

    return { success: true };
  }
}
