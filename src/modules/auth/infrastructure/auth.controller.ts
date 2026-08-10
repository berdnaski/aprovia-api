import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { IsPublic } from 'src/shared/decorators/is-public.decorator';
import { AuthenticatedUser } from 'src/shared/domain/authenticated-user';
import { ChangePasswordUseCase } from '../application/change-password.use-case';
import { ConfirmPasswordChangeUseCase } from '../application/confirm-password-change.use-case';
import { ForgotPasswordUseCase } from '../application/forgot-password.use-case';
import { LoginUseCase } from '../application/login.use-case';
import { LogoutUseCase } from '../application/logout.use-case';
import { RefreshTokenUseCase } from '../application/refresh-token.use-case';
import { RegisterUseCase } from '../application/register.use-case';
import { ResendVerificationUseCase } from '../application/resend-verification.use-case';
import { ResetPasswordUseCase } from '../application/reset-password.use-case';
import { VerifyEmailUseCase } from '../application/verify-email.use-case';
import {
  AuthMembershipDto,
  AuthResponseDto,
  AuthUserDto,
} from '../dto/auth-response.dto';
import {
  ChangePasswordDto,
  ConfirmPasswordChangeDto,
} from '../dto/change-password.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import {
  AuthCookiesInterceptor,
  REFRESH_TOKEN_COOKIE,
} from './interceptors/auth-cookies.interceptor';
import { ClearCookiesInterceptor } from './interceptors/clear-cookies.interceptor';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly confirmPasswordChangeUseCase: ConfirmPasswordChangeUseCase,
    private readonly resendVerificationUseCase: ResendVerificationUseCase,
  ) {}

  @Post('register')
  @IsPublic()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Criar conta',
    description:
      'Cria o usuário e envia e-mail de verificação. O login só é liberado após a confirmação.',
  })
  @ApiResponse({ status: 201, type: AuthUserDto })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
  async register(@Body() dto: RegisterDto): Promise<AuthUserDto> {
    const user = await this.registerUseCase.execute(dto);
    return AuthUserDto.fromEntity(user);
  }

  @Get('verify-email')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirmar e-mail',
    description: 'Consome o token de uso único enviado no cadastro.',
  })
  @ApiResponse({ status: 200, description: 'E-mail confirmado' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  async verifyEmail(@Query() query: VerifyEmailDto): Promise<void> {
    await this.verifyEmailUseCase.execute(query.token);
  }

  @Post('resend-verification')
  @IsPublic()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 3, ttl: 300_000 } })
  @ApiOperation({
    summary: 'Reenviar e-mail de verificação',
    description:
      'Invalida o token anterior e envia um novo. Responde 204 mesmo quando o e-mail não existe ou já foi confirmado, para não permitir enumeração de usuários.',
  })
  @ApiResponse({ status: 204, description: 'Solicitação registrada' })
  async resendVerification(
    @Body() dto: ResendVerificationDto,
  ): Promise<void> {
    await this.resendVerificationUseCase.execute(dto.email);
  }

  @Post('login')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(AuthCookiesInterceptor)
  @ApiOperation({
    summary: 'Entrar',
    description:
      'Emite access e refresh token em cookies HttpOnly. Os tokens não aparecem no corpo da resposta.',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Credenciais inválidas' })
  @ApiResponse({
    status: 403,
    description: 'Conta desativada ou e-mail não confirmado',
  })
  async login(@Body() dto: LoginDto) {
    const { user, membership, tokens } = await this.loginUseCase.execute(dto);

    const response = new AuthResponseDto();
    response.user = AuthUserDto.fromEntity(user);
    response.membership = membership
      ? AuthMembershipDto.fromEntity(membership)
      : null;

    return { ...response, tokens };
  }

  @Post('refresh')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AuthCookiesInterceptor)
  @ApiCookieAuth('refresh_token')
  @ApiOperation({
    summary: 'Renovar sessão',
    description:
      'Rotaciona o refresh token: o anterior é invalidado no mesmo momento. Reutilizá-lo retorna 400.',
  })
  @ApiResponse({ status: 200, description: 'Novos cookies emitidos' })
  @ApiResponse({ status: 400, description: 'Token inválido ou já consumido' })
  async refresh(@Req() request: Request) {
    const refreshToken = (request.cookies as Record<string, string>)?.[
      REFRESH_TOKEN_COOKIE
    ];

    const tokens = await this.refreshTokenUseCase.execute(refreshToken);
    return { tokens };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseInterceptors(ClearCookiesInterceptor)
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: 'Sair',
    description:
      'Invalida o refresh token no servidor e limpa os cookies do navegador.',
  })
  @ApiResponse({ status: 204, description: 'Sessão encerrada' })
  async logout(@Req() request: Request): Promise<void> {
    const refreshToken = (request.cookies as Record<string, string>)?.[
      REFRESH_TOKEN_COOKIE
    ];

    await this.logoutUseCase.execute(refreshToken);
  }

  @Post('forgot-password')
  @IsPublic()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Solicitar redefinição de senha',
    description:
      'Responde 204 mesmo quando o e-mail não existe, para não permitir enumeração de usuários.',
  })
  @ApiResponse({ status: 204, description: 'Solicitação registrada' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.forgotPasswordUseCase.execute(dto.email);
  }

  @Post('reset-password')
  @IsPublic()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Redefinir senha',
    description:
      'Define a nova senha e encerra todas as sessões ativas do usuário.',
  })
  @ApiResponse({ status: 204, description: 'Senha redefinida' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.resetPasswordUseCase.execute(dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: 'Solicitar alteração de senha',
    description:
      'Valida a senha atual e envia e-mail de confirmação. A senha só muda após confirmar.',
  })
  @ApiResponse({ status: 204, description: 'E-mail de confirmação enviado' })
  @ApiResponse({ status: 400, description: 'Senha atual incorreta' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.changePasswordUseCase.execute(user.userId, dto);
  }

  @Post('confirm-password-change')
  @IsPublic()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Confirmar alteração de senha',
    description:
      'Aplica a nova senha e encerra todas as sessões ativas do usuário.',
  })
  @ApiResponse({ status: 204, description: 'Senha alterada' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  async confirmPasswordChange(
    @Body() dto: ConfirmPasswordChangeDto,
  ): Promise<void> {
    await this.confirmPasswordChangeUseCase.execute(dto.token);
  }

  @Get('me')
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: 'Sessão atual',
    description: 'Retorna o usuário autenticado e o contexto da sessão.',
  })
  @ApiResponse({ status: 200, description: 'Dados da sessão' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
