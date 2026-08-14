import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import {
  ALL_ROLES,
  CurrentActor,
  OPERATIONAL_ROLES,
} from 'src/modules/purchase-requests/infrastructure/request-actor';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { FindReceiptByIdUseCase } from '../application/find-receipt-by-id.use-case';
import { ListReceiptsUseCase } from '../application/list-receipts.use-case';
import { RegisterReceiptUseCase } from '../application/register-receipt.use-case';
import { ReceiptResponseDto } from '../dto/receipt-response.dto';
import { RegisterReceiptDto } from '../dto/register-receipt.dto';

@ApiTags('Recebimentos')
@ApiCookieAuth()
@Controller('purchase-orders/:id/receipts')
export class OrderReceiptsController {
  constructor(
    private readonly registerReceiptUseCase: RegisterReceiptUseCase,
    private readonly listReceiptsUseCase: ListReceiptsUseCase,
  ) {}

  @Post()
  @Roles(...OPERATIONAL_ROLES)
  @ApiOperation({
    summary: 'Registrar a chegada da mercadoria (RN55)',
    description:
      'Só quem fez o pedido original ou o Admin Financeiro pode registrar. Aceita entrega parcial. A soma dos recebimentos nunca ultrapassa a quantidade da ordem, garantido por lock no item. Quantidade recusada exige motivo.',
  })
  @ApiResponse({ status: 201, type: ReceiptResponseDto })
  @ApiResponse({ status: 403, description: 'Pedido não é seu' })
  @ApiResponse({ status: 409, description: 'Quantidade acima do saldo' })
  async register(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegisterReceiptDto,
  ): Promise<ReceiptResponseDto> {
    const receipt = await this.registerReceiptUseCase.execute(id, actor, dto);

    return ReceiptResponseDto.fromEntity(receipt);
  }

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Listar as entregas de uma ordem de compra' })
  @ApiResponse({ status: 200, type: [ReceiptResponseDto] })
  async list(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReceiptResponseDto[]> {
    const receipts = await this.listReceiptsUseCase.execute(
      id,
      actor.companyId,
    );

    return receipts.map(ReceiptResponseDto.fromEntity);
  }
}

@ApiTags('Recebimentos')
@ApiCookieAuth()
@Controller('receipts')
export class ReceiptsController {
  constructor(
    private readonly findReceiptByIdUseCase: FindReceiptByIdUseCase,
  ) {}

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Detalhar um recebimento com seus itens' })
  @ApiResponse({ status: 200, type: ReceiptResponseDto })
  async findById(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReceiptResponseDto> {
    const receipt = await this.findReceiptByIdUseCase.execute(
      id,
      actor.companyId,
    );

    return ReceiptResponseDto.fromEntity(receipt);
  }
}
