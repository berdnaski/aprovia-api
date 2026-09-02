import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ClearCookiesInterceptor } from 'src/modules/auth/infrastructure/interceptors/clear-cookies.interceptor';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/shared/domain/authenticated-user';
import { DeleteAccountUseCase } from '../application/delete-account.use-case';
import { FindUserByIdUseCase } from '../application/find-user-by-id.use-case';
import { ListUsersUseCase } from '../application/list-users.use-case';
import { ManageAvatarUseCase } from '../application/manage-avatar.use-case';
import { UpdateUserProfileUseCase } from '../application/update-user-profile.use-case';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';

const MAX_AVATAR_BYTES = Number(process.env.AVATAR_MAX_SIZE_BYTES ?? 2097152);

@ApiTags('Usuários')
@ApiCookieAuth('access_token')
@Controller('users')
export class UsersController {
  constructor(
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly updateUserProfileUseCase: UpdateUserProfileUseCase,
    private readonly deleteAccountUseCase: DeleteAccountUseCase,
    private readonly manageAvatarUseCase: ManageAvatarUseCase,
  ) {}

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', { limits: { fileSize: MAX_AVATAR_BYTES, files: 1 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { avatar: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: 'Enviar foto de perfil',
    description:
      'Aceita PNG, JPG ou WEBP, validados pela assinatura do arquivo e não pela extensão. A foto anterior é apagada do storage.',
  })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() avatar: { buffer: Buffer } | undefined,
  ): Promise<UserResponseDto> {
    const updated = await this.manageAvatarUseCase.upload(user.userId, avatar);
    return UserResponseDto.fromEntity(updated);
  }

  @Delete('me/avatar')
  @ApiOperation({ summary: 'Remover a foto de perfil' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async removeAvatar(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const updated = await this.manageAvatarUseCase.remove(user.userId);
    return UserResponseDto.fromEntity(updated);
  }

  @Get(':id/avatar')
  @Header('Cache-Control', 'private, max-age=300')
  @ApiOperation({
    summary: 'Servir a foto de perfil',
    description:
      'Devolve a imagem em si. O bucket é privado, então o arquivo passa por aqui em vez de ser exposto por URL direta.',
  })
  @ApiResponse({ status: 200, description: 'A imagem' })
  @ApiResponse({ status: 404, description: 'O usuário não tem foto' })
  async avatar(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ): Promise<void> {
    const { body, mimeType } = await this.manageAvatarUseCase.read(id);

    response.setHeader('Content-Type', mimeType);
    response.send(body);
  }

  @Get('me')
  @ApiOperation({ summary: 'Perfil do usuário autenticado' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    const found = await this.findUserByIdUseCase.execute(user.userId);
    return UserResponseDto.fromEntity(found);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualizar perfil' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const updated = await this.updateUserProfileUseCase.execute(
      user.userId,
      dto,
    );
    return UserResponseDto.fromEntity(updated);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseInterceptors(ClearCookiesInterceptor)
  @ApiOperation({
    summary: 'Excluir conta',
    description:
      'Anonimiza os dados pessoais e encerra a sessão. Os registros financeiros e a trilha de auditoria permanecem pseudonimizados, conforme a obrigação legal de guarda fiscal.',
  })
  @ApiResponse({ status: 204, description: 'Conta anonimizada' })
  @ApiResponse({
    status: 409,
    description: 'Último Admin Financeiro da empresa',
  })
  async deleteMe(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.deleteAccountUseCase.execute(user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar usuários' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  async list(): Promise<UserResponseDto[]> {
    const users = await this.listUsersUseCase.execute();
    return UserResponseDto.fromEntities(users);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    const user = await this.findUserByIdUseCase.execute(id);
    return UserResponseDto.fromEntity(user);
  }
}
