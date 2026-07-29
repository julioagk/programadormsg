import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dtos/create-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  async createTemplate(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateTemplateDto,
  ) {
    return this.templatesService.createTemplate(user.id, dto);
  }

  @Get()
  async getTemplates(@CurrentUser() user: { id: string }) {
    return this.templatesService.getTemplates(user.id);
  }

  @Delete(':id')
  async deleteTemplate(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.templatesService.deleteTemplate(user.id, id);
  }
}
