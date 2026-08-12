import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentCompany } from 'src/shared/decorators/current-company.decorator';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { CountUnreadNotificationsUseCase } from '../application/count-unread-notifications.use-case';
import { GetNotificationPreferencesUseCase } from '../application/get-notification-preferences.use-case';
import { ListNotificationsUseCase } from '../application/list-notifications.use-case';
import { MarkNotificationsReadUseCase } from '../application/mark-notifications-read.use-case';
import { UpdateNotificationPreferencesUseCase } from '../application/update-notification-preferences.use-case';
import { ListNotificationsQueryDto } from '../dto/list-notifications-query.dto';
import { NotificationPreferenceResponseDto } from '../dto/notification-preference-response.dto';
import { NotificationResponseDto } from '../dto/notification-response.dto';
import { UnreadCountResponseDto } from '../dto/unread-count-response.dto';
import { UpdateNotificationPreferencesDto } from '../dto/update-notification-preferences.dto';

@ApiTags('Notificações')
@ApiCookieAuth('access_token')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly countUnreadNotificationsUseCase: CountUnreadNotificationsUseCase,
    private readonly markNotificationsReadUseCase: MarkNotificationsReadUseCase,
    private readonly getNotificationPreferencesUseCase: GetNotificationPreferencesUseCase,
    private readonly updateNotificationPreferencesUseCase: UpdateNotificationPreferencesUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Central de notificações (RF71)',
    description:
      'Notificações da pessoa dentro da empresa ativa, da mais recente para a mais antiga.',
  })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  async list(
    @CurrentUser('userId') userId: string,
    @CurrentCompany() companyId: string,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<PaginatedResponseDto<NotificationResponseDto>> {
    const page = await this.listNotificationsUseCase.execute(
      userId,
      companyId,
      query,
    );

    return PaginatedResponseDto.from(page, NotificationResponseDto.fromEntity);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Contador de não lidas (RF71)' })
  @ApiResponse({ status: 200, type: UnreadCountResponseDto })
  async unreadCount(
    @CurrentUser('userId') userId: string,
    @CurrentCompany() companyId: string,
  ): Promise<UnreadCountResponseDto> {
    const unread = await this.countUnreadNotificationsUseCase.execute(
      userId,
      companyId,
    );

    return UnreadCountResponseDto.from(unread);
  }

  @Get('preferences')
  @ApiOperation({
    summary: 'Preferências de e-mail por evento (RF73)',
    description:
      'Todos os eventos chegam por e-mail até que o usuário desligue algum.',
  })
  @ApiResponse({ status: 200, type: [NotificationPreferenceResponseDto] })
  async preferences(
    @CurrentUser('userId') userId: string,
  ): Promise<NotificationPreferenceResponseDto[]> {
    const preferences =
      await this.getNotificationPreferencesUseCase.execute(userId);

    return NotificationPreferenceResponseDto.fromEntities(preferences);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Atualizar preferências de e-mail (RF73)' })
  @ApiResponse({ status: 200, type: [NotificationPreferenceResponseDto] })
  async updatePreferences(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferenceResponseDto[]> {
    const preferences = await this.updateNotificationPreferencesUseCase.execute(
      userId,
      dto,
    );

    return NotificationPreferenceResponseDto.fromEntities(preferences);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas como lidas' })
  @ApiResponse({ status: 200, type: UnreadCountResponseDto })
  async readAll(
    @CurrentUser('userId') userId: string,
    @CurrentCompany() companyId: string,
  ): Promise<UnreadCountResponseDto> {
    await this.markNotificationsReadUseCase.executeAll(userId, companyId);

    return UnreadCountResponseDto.from(0);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  @ApiResponse({ status: 204, description: 'Notificação lida' })
  @ApiResponse({
    status: 404,
    description: 'Notificação de outro destinatário',
  })
  async read(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.markNotificationsReadUseCase.execute(id, userId);
  }
}
