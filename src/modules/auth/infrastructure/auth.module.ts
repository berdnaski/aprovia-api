import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CompaniesModule } from 'src/modules/companies/infrastructure/companies.module';
import { UsersModule } from 'src/modules/users/infrastructure/users.module';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { ChangePasswordUseCase } from '../application/change-password.use-case';
import { ConfirmPasswordChangeUseCase } from '../application/confirm-password-change.use-case';
import { ForgotPasswordUseCase } from '../application/forgot-password.use-case';
import { IssueSessionService } from '../application/services/issue-session.service';
import { IssueTokenService } from '../application/services/issue-token.service';
import { JwtTokenService } from '../application/services/jwt-token.service';
import { LoginUseCase } from '../application/login.use-case';
import { LogoutUseCase } from '../application/logout.use-case';
import { RefreshTokenUseCase } from '../application/refresh-token.use-case';
import { RegisterUseCase } from '../application/register.use-case';
import { ResendVerificationUseCase } from '../application/resend-verification.use-case';
import { ResetPasswordUseCase } from '../application/reset-password.use-case';
import { VerifyEmailUseCase } from '../application/verify-email.use-case';
import { ITokensRepository } from '../domain/tokens.repository.interface';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokensRepository } from './tokens.repository';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    forwardRef(() => CompaniesModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
  ],
  controllers: [AuthController],
  providers: [
    { provide: ITokensRepository, useClass: TokensRepository },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    JwtStrategy,
    JwtTokenService,
    IssueSessionService,
    IssueTokenService,
    RegisterUseCase,
    VerifyEmailUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    ChangePasswordUseCase,
    ConfirmPasswordChangeUseCase,
    ResendVerificationUseCase,
  ],
  exports: [
    JwtTokenService,
    IssueSessionService,
    IssueTokenService,
    ITokensRepository,
  ],
})
export class AuthModule {}
