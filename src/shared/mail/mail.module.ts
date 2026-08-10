import { Global, Module } from '@nestjs/common';
import { AuthMailService } from './application/auth-mail.service';
import { IMailService } from './application/mail.service';
import { ResendMailService } from './infrastructure/resend-mail.service';

@Global()
@Module({
  providers: [
    { provide: IMailService, useClass: ResendMailService },
    AuthMailService,
  ],
  exports: [IMailService, AuthMailService],
})
export class MailModule {}
