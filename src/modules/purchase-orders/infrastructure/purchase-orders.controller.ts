import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import {
  ALL_ROLES,
  CurrentActor,
} from 'src/modules/purchase-requests/infrastructure/request-actor';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { CancelPurchaseOrderUseCase } from '../application/cancel-purchase-order.use-case';
import { FindPurchaseOrderByIdUseCase } from '../application/find-purchase-order-by-id.use-case';
import { GetOrderBalanceUseCase } from '../application/get-order-balance.use-case';
import { IssuePurchaseOrderUseCase } from '../application/issue-purchase-order.use-case';
import { ListPurchaseOrdersUseCase } from '../application/list-purchase-orders.use-case';
import { SendPurchaseOrderUseCase } from '../application/send-purchase-order.use-case';
import { CancelPurchaseOrderDto } from '../dto/cancel-purchase-order.dto';
import { IssuePurchaseOrderDto } from '../dto/issue-purchase-order.dto';
import { ListPurchaseOrdersQueryDto } from '../dto/list-purchase-orders-query.dto';
import {
  ItemBalanceResponseDto,
  PurchaseOrderResponseDto,
} from '../dto/purchase-order-response.dto';

@ApiTags('Ordens de Compra')
@ApiCookieAuth()
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(
    private readonly listPurchaseOrdersUseCase: ListPurchaseOrdersUseCase,
    private readonly findPurchaseOrderByIdUseCase: FindPurchaseOrderByIdUseCase,
    private readonly sendPurchaseOrderUseCase: SendPurchaseOrderUseCase,
    private readonly cancelPurchaseOrderUseCase: CancelPurchaseOrderUseCase,
    private readonly getOrderBalanceUseCase: GetOrderBalanceUseCase,
  ) {}

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Listar ordens de compra (RF87)',
    description:
      'Filtra por situação, fornecedor e busca textual no número ou no título do pedido de origem.',
  })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  async list(
    @CurrentActor() actor: RequestActor,
    @Query() query: ListPurchaseOrdersQueryDto,
  ): Promise<PaginatedResponseDto<PurchaseOrderResponseDto>> {
    const page = await this.listPurchaseOrdersUseCase.execute(
      actor.companyId,
      query,
    );

    return PaginatedResponseDto.from(page, PurchaseOrderResponseDto.fromEntity);
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Detalhar uma ordem de compra com seus itens' })
  @ApiResponse({ status: 200, type: PurchaseOrderResponseDto })
  async findById(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseOrderResponseDto> {
    const order = await this.findPurchaseOrderByIdUseCase.execute(
      id,
      actor.companyId,
    );

    return PurchaseOrderResponseDto.fromEntity(order);
  }

  @Get(':id/balance')
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Saldo pendente por item',
    description:
      'Quanto de cada item ainda falta receber. É a base para o próximo recebimento.',
  })
  @ApiResponse({ status: 200, type: [ItemBalanceResponseDto] })
  async balance(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ItemBalanceResponseDto[]> {
    const balances = await this.getOrderBalanceUseCase.execute(
      id,
      actor.companyId,
    );

    return balances.map(ItemBalanceResponseDto.fromBalance);
  }

  @Post(':id/send')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Marcar como enviada ao fornecedor',
    description: 'Registra a data de envio e move a ordem para SENT.',
  })
  @ApiResponse({ status: 201, type: PurchaseOrderResponseDto })
  async send(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseOrderResponseDto> {
    const order = await this.sendPurchaseOrderUseCase.execute(id, actor);

    return PurchaseOrderResponseDto.fromEntity(order);
  }

  @Post(':id/cancel')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Cancelar a ordem de compra (RN54)',
    description:
      'Bloqueado quando já houve recebimento, mesmo parcial. Nesse caso registre a devolução com o fornecedor.',
  })
  @ApiResponse({ status: 201, type: PurchaseOrderResponseDto })
  @ApiResponse({ status: 409, description: 'Já houve recebimento' })
  async cancel(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelPurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    const order = await this.cancelPurchaseOrderUseCase.execute(id, actor, dto);

    return PurchaseOrderResponseDto.fromEntity(order);
  }
}

@ApiTags('Ordens de Compra')
@ApiCookieAuth()
@Controller('purchase-requests/:id/purchase-order')
export class RequestPurchaseOrderController {
  constructor(
    private readonly issuePurchaseOrderUseCase: IssuePurchaseOrderUseCase,
  ) {}

  @Post()
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Emitir a ordem de compra do pedido aprovado (RN52, RN53)',
    description:
      'Copia os itens do pedido no momento da emissão. Alteração posterior no pedido não altera a ordem já emitida.',
  })
  @ApiResponse({ status: 201, type: PurchaseOrderResponseDto })
  @ApiResponse({ status: 409, description: 'O pedido já gerou uma ordem' })
  @ApiResponse({ status: 422, description: 'O pedido ainda não foi aprovado' })
  async issue(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IssuePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    const order = await this.issuePurchaseOrderUseCase.execute(id, actor, dto);

    return PurchaseOrderResponseDto.fromEntity(order);
  }
}
