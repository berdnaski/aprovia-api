import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BudgetEntryType, CompanyMemberRole } from 'generated/prisma/enums';
import { CurrentCompany } from 'src/shared/decorators/current-company.decorator';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { Response } from 'express';
import { BudgetEntryEntity } from '../domain/budget-entry.entity';
import { FindBudgetByIdUseCase } from '../application/find-budget-by-id.use-case';
import { ListBudgetEntriesUseCase } from '../application/list-budget-entries.use-case';
import { UpdateBudgetUseCase } from '../application/update-budget.use-case';
import { BudgetEntryResponseDto } from '../dto/budget-entry-response.dto';
import { BudgetResponseDto } from '../dto/budget-response.dto';
import { UpdateBudgetDto } from '../dto/update-budget.dto';

@ApiTags('Orçamento')
@ApiCookieAuth('access_token')
@Controller('budgets')
export class BudgetsController {
  constructor(
    private readonly findBudgetByIdUseCase: FindBudgetByIdUseCase,
    private readonly updateBudgetUseCase: UpdateBudgetUseCase,
    private readonly listBudgetEntriesUseCase: ListBudgetEntriesUseCase,
  ) {}

  @Get(':id')
  @Roles(CompanyMemberRole.APPROVER, CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Buscar orçamento por ID' })
  @ApiResponse({ status: 200, type: BudgetResponseDto })
  @ApiResponse({ status: 404, description: 'Orçamento não encontrado' })
  async findById(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BudgetResponseDto> {
    const budget = await this.findBudgetByIdUseCase.execute(id, companyId);
    return BudgetResponseDto.fromEntity(budget);
  }

  @Patch(':id')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Alterar o valor do orçamento',
    description:
      'Registra autor e motivo da alteração (RF30). O disponível é recalculado na hora, sem afetar pedidos já aprovados, porque o saldo é derivado do extrato (RN21).',
  })
  @ApiResponse({ status: 200, type: BudgetResponseDto })
  async update(
    @CurrentCompany() companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
  ): Promise<BudgetResponseDto> {
    const budget = await this.updateBudgetUseCase.execute(
      id,
      companyId,
      userId,
      dto,
    );
    return BudgetResponseDto.fromEntity(budget);
  }

  @Get(':id/entries')
  @Roles(CompanyMemberRole.APPROVER, CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Extrato de movimentações do orçamento',
    description:
      'Tabela append-only: correções entram como lançamento REVERSAL, nunca por edição ou remoção.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['CONSUMPTION', 'REVERSAL'],
    description: 'Filtra consumos ou estornos.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Busca na descrição do lançamento.',
  })
  @ApiResponse({ status: 200, type: [BudgetEntryResponseDto] })
  async listEntries(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('type') type?: BudgetEntryType,
    @Query('search') search?: string,
  ): Promise<BudgetEntryResponseDto[]> {
    const entries = await this.listBudgetEntriesUseCase.execute(id, companyId, {
      type,
      search,
    });
    return BudgetEntryResponseDto.fromEntities(entries);
  }

  @Get(':id/entries/export')
  @Roles(CompanyMemberRole.APPROVER, CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Exportar o extrato do orçamento em CSV',
    description:
      'Mesmo conteúdo de /entries, entregue como arquivo para conciliação contábil. Valores em reais com vírgula decimal, no padrão aceito pelo Excel em português.',
  })
  @ApiResponse({ status: 200, description: 'Arquivo CSV' })
  async exportEntries(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const budget = await this.findBudgetByIdUseCase.execute(id, companyId);
    const entries = await this.listBudgetEntriesUseCase.execute(id, companyId);

    const period = budget.periodStart.toISOString().slice(0, 7);
    const csv = this.toCsv(entries);

    response.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="extrato-orcamento-${period}.csv"`,
    });

    return new StreamableFile(Buffer.from(`﻿${csv}`, 'utf-8'));
  }

  private toCsv(entries: BudgetEntryEntity[]): string {
    const header = [
      'Data',
      'Pedido',
      'Tipo',
      'Descrição',
      'Valor (R$)',
      'Registrado por',
    ];

    const rows = entries.map((entry) => [
      entry.occurredAt.toISOString().slice(0, 10),
      entry.purchaseRequestId,
      entry.type === 'REVERSAL' ? 'Estorno' : 'Consumo',
      entry.description ?? '',
      this.toBrl(entry.amountCents),
      entry.recordedById ?? 'sistema',
    ]);

    return [header, ...rows]
      .map((row) => row.map((cell) => this.escape(cell)).join(';'))
      .join('\r\n');
  }

  private toBrl(cents: bigint): string {
    const negative = cents < 0n;
    const absolute = negative ? -cents : cents;
    const units = absolute / 100n;
    const decimals = (absolute % 100n).toString().padStart(2, '0');

    return `${negative ? '-' : ''}${units.toString()},${decimals}`;
  }

  private escape(value: string): string {
    if (/[";\r\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }
}
