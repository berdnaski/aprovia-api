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
  Post,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { RequestActor } from '../application/find-request-by-id.use-case';
import { ManageRequestItemsUseCase } from '../application/manage-request-items.use-case';
import { RequestItemResponseDto } from '../dto/purchase-request-response.dto';
import { RequestItemDto } from '../dto/request-item.dto';
import { ALL_ROLES, CurrentActor } from './request-actor';

@ApiTags('Pedidos de Compra')
@ApiCookieAuth('access_token')
@Controller('purchase-requests/:id/items')
export class RequestItemsController {
  constructor(
    private readonly manageRequestItemsUseCase: ManageRequestItemsUseCase,
  ) {}

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Listar itens do pedido' })
  @ApiResponse({ status: 200, type: [RequestItemResponseDto] })
  async list(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RequestItemResponseDto[]> {
    const items = await this.manageRequestItemsUseCase.list(id, actor);
    return RequestItemResponseDto.fromEntities(items);
  }

  @Post()
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Adicionar item',
    description: 'O total do pedido é recalculado como a soma dos itens.',
  })
  @ApiResponse({ status: 201, type: RequestItemResponseDto })
  async add(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestItemDto,
  ): Promise<RequestItemResponseDto> {
    const item = await this.manageRequestItemsUseCase.add(id, actor, dto);
    return RequestItemResponseDto.fromEntity(item);
  }

  @Patch(':itemId')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Editar item' })
  @ApiResponse({ status: 200, type: RequestItemResponseDto })
  async update(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: RequestItemDto,
  ): Promise<RequestItemResponseDto> {
    const item = await this.manageRequestItemsUseCase.update(
      id,
      itemId,
      actor,
      dto,
    );
    return RequestItemResponseDto.fromEntity(item);
  }

  @Delete(':itemId')
  @Roles(...ALL_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover item' })
  @ApiResponse({ status: 204, description: 'Item removido' })
  async remove(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    await this.manageRequestItemsUseCase.remove(id, itemId, actor);
  }
}
