import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { CurrentCompany } from 'src/shared/decorators/current-company.decorator';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
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
  @ApiResponse({ status: 200, type: [BudgetEntryResponseDto] })
  async listEntries(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BudgetEntryResponseDto[]> {
    const entries = await this.listBudgetEntriesUseCase.execute(id, companyId);
    return BudgetEntryResponseDto.fromEntities(entries);
  }
}
