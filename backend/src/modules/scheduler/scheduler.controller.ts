import { Controller, Post, Get, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { CreateScheduleDto } from './dtos/create-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSchedule(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateScheduleDto,
  ) {
    return this.schedulerService.scheduleMessage(user.id, dto);
  }

  @Get()
  async getSchedules(@CurrentUser() user: { id: string }) {
    return this.schedulerService.getSchedules(user.id);
  }

  @Get(':id')
  async getScheduleDetails(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.schedulerService.getScheduleDetails(user.id, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSchedule(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.schedulerService.cancelSchedule(user.id, id);
  }

  @Delete(':id')
  async deleteSchedule(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.schedulerService.deleteSchedule(user.id, id);
  }
}
