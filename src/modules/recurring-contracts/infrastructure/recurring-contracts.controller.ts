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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { CurrentActor } from 'src/modules/purchase-requests/infrastructure/request-actor';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { CancelRecurringContractUseCase } from '../application/cancel-recurring-contract.use-case';
import { CreateRecurringContractUseCase } from '../application/create-recurring-contract.use-case';
import { FindRecurringContractByIdUseCase } from '../application/find-recurring-contract-by-id.use-case';
import { LinkInvoiceToRecurringContractUseCase } from '../application/link-invoice-to-recurring-contract.use-case';
import { ListOccurrencesUseCase } from '../application/list-occurrences.use-case';
import { ListRecurringContractsUseCase } from '../application/list-recurring-contracts.use-case';
import { CancelRecurringContractDto } from '../dto/cancel-recurring-contract.dto';
import { CreateRecurringContractDto } from '../dto/create-recurring-contract.dto';
import { LinkRecurringContractDto } from '../dto/link-recurring-contract.dto';
import { RecurringContractResponseDto } from '../dto/recurring-contract-response.dto';
import { RecurringOccurrenceResponseDto } from '../dto/recurring-occurrence-response.dto';

@ApiTags('Assinaturas recorrentes')
@ApiCookieAuth('access_token')
@Controller('recurring-contracts')
export class RecurringContractsController {
  constructor(
    private readonly listRecurringContractsUseCase: ListRecurringContractsUseCase,
    private readonly findRecurringContractByIdUseCase: FindRecurringContractByIdUseCase,
    private readonly listOccurrencesUseCase: ListOccurrencesUseCase,
    private readonly cancelRecurringContractUseCase: CancelRecurringContractUseCase,
  ) {}

  @Get()
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Listar assinaturas recorrentes' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'sourceRequestId', required: false, type: String })
  @ApiResponse({ status: 200, type: [RecurringContractResponseDto] })
  async list(
    @CurrentActor() actor: RequestActor,
    @Query('active') active?: string,
    @Query('sourceRequestId') sourceRequestId?: string,
  ): Promise<RecurringContractResponseDto[]> {
    const contracts = await this.listRecurringContractsUseCase.execute(
      actor.companyId,
      {
        active: active === undefined ? undefined : active === 'true',
        sourceRequestId,
      },
    );
    return RecurringContractResponseDto.fromEntities(contracts);
  }

  @Get(':id')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Detalhar assinatura recorrente' })
  @ApiResponse({ status: 200, type: RecurringContractResponseDto })
  async findById(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RecurringContractResponseDto> {
    const contract = await this.findRecurringContractByIdUseCase.execute(
      id,
      actor.companyId,
    );
    return RecurringContractResponseDto.fromEntity(contract);
  }

  @Get(':id/occurrences')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Histórico de cobranças da assinatura',
    description:
      'Uma linha por ciclo (mês/trimestre/ano). PENDING aguarda a nota daquele ciclo, MATCHED já foi conferida e gerou conta a pagar.',
  })
  @ApiResponse({ status: 200, type: [RecurringOccurrenceResponseDto] })
  async occurrences(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RecurringOccurrenceResponseDto[]> {
    const occurrences = await this.listOccurrencesUseCase.execute(
      id,
      actor.companyId,
    );
    return RecurringOccurrenceResponseDto.fromEntities(occurrences);
  }

  @Post(':id/cancel')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Cancelar assinatura recorrente',
    description:
      'Para de gerar cobrança nos próximos ciclos. Ciclos já gerados continuam como estão.',
  })
  @ApiResponse({ status: 201, type: RecurringContractResponseDto })
  async cancel(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelRecurringContractDto,
  ): Promise<RecurringContractResponseDto> {
    const contract = await this.cancelRecurringContractUseCase.execute(
      id,
      actor.companyId,
      actor.userId,
      dto.reason,
    );
    return RecurringContractResponseDto.fromEntity(contract);
  }
}

@ApiTags('Pedidos de Compra')
@ApiCookieAuth('access_token')
@Controller('purchase-requests/:id/recurring-contract')
export class RequestRecurringContractController {
  constructor(
    private readonly createRecurringContractUseCase: CreateRecurringContractUseCase,
  ) {}

  @Post()
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Transformar um pedido aprovado em assinatura recorrente',
    description:
      'A partir de um pedido já aprovado com fornecedor definido. O ciclo passa a gerar consumo de orçamento sozinho, sem precisar de uma nova aprovação a cada cobrança.',
  })
  @ApiResponse({ status: 201, type: RecurringContractResponseDto })
  async create(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRecurringContractDto,
  ): Promise<RecurringContractResponseDto> {
    const contract = await this.createRecurringContractUseCase.execute(
      id,
      actor,
      dto,
    );
    return RecurringContractResponseDto.fromEntity(contract);
  }
}

@ApiTags('Notas Fiscais')
@ApiCookieAuth('access_token')
@Controller('invoices/:id/link-recurring-contract')
export class InvoiceRecurringContractController {
  constructor(
    private readonly linkInvoiceToRecurringContractUseCase: LinkInvoiceToRecurringContractUseCase,
  ) {}

  @Post()
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Ligar nota fiscal ao ciclo pendente de uma assinatura recorrente',
    description:
      'Casa a nota com a cobrança mais antiga ainda aguardando, dentro da tolerância de preço da empresa. Fora da tolerância, exige justificativa.',
  })
  @ApiResponse({ status: 201, type: Object })
  async link(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkRecurringContractDto,
  ): Promise<{ id: string; status: string }> {
    const invoice = await this.linkInvoiceToRecurringContractUseCase.execute(
      id,
      dto.contractId,
      actor,
      dto.overrideNote,
    );
    return { id: invoice.id, status: invoice.status };
  }
}
