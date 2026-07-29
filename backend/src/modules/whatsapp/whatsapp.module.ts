import { Module, forwardRef } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppGateway } from './whatsapp.gateway';
import { ContactsController } from './contacts.controller';
import { PrismaModule } from '../../database/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [ContactsController],
  providers: [WhatsAppService, WhatsAppGateway],
  exports: [WhatsAppService, WhatsAppGateway],
})
export class WhatsAppModule {}
