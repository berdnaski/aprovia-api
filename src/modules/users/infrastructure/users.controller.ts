import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ClearCookiesInterceptor } from 'src/modules/auth/infrastructure/interceptors/clear-cookies.interceptor';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/shared/domain/authenticated-user';
import { DeleteAccountUseCase } from '../application/delete-account.use-case';
import { FindUserByIdUseCase } from '../application/find-user-by-id.use-case';
import { ListUsersUseCase } from '../application/list-users.use-case';
import { UpdateUserProfileUseCase } from '../application/update-user-profile.use-case';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';

@ApiTags('Usuários')
@ApiCookieAuth('access_token')
@Controller('users')
export class UsersController {
  constructor(
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly updateUserProfileUseCase: UpdateUserProfileUseCase,
    private readonly deleteAccountUseCase: DeleteAccountUseCase,
  ) {}

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
