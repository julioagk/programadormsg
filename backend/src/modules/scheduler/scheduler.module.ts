import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueueService } from './queue.service';
import { DeliveryService } from './delivery.service';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { DashboardController } from './dashboard.controller';
import { PrismaModule } from '../../database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    forwardRef(() => AuthModule),
    forwardRef(() => WhatsAppModule),
  ],
  controllers: [SchedulerController, DashboardController],
  providers: [QueueService, DeliveryService, SchedulerService],
  exports: [SchedulerService, QueueService, DeliveryService],
})
export class SchedulerModule {}
