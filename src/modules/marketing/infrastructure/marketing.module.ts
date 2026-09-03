import { Module } from '@nestjs/common';
import { BillingModule } from 'src/modules/billing/infrastructure/billing.module';
import { JoinWaitlistUseCase } from '../application/join-waitlist.use-case';
import { ListWaitlistUseCase } from '../application/list-waitlist.use-case';
import { IWaitlistRepository } from '../domain/waitlist.repository.interface';
import { MarketingController } from './marketing.controller';
import { PlatformWaitlistController } from './platform-waitlist.controller';
import { WaitlistRepository } from './waitlist.repository';

@Module({
  imports: [BillingModule],
  controllers: [MarketingController, PlatformWaitlistController],
  providers: [
    { provide: IWaitlistRepository, useClass: WaitlistRepository },
    JoinWaitlistUseCase,
    ListWaitlistUseCase,
  ],
})
export class MarketingModule {}
