import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/infrastructure/auth.module';
import { UsersModule } from './modules/users/infrastructure/users.module';
import { DatabaseModule } from './shared/infrastructure/database/database.module';
import { SecurityModule } from './shared/infrastructure/security/security.module';
import { MailModule } from './shared/mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    SecurityModule,
    MailModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
