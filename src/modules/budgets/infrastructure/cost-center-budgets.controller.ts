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
import { CompanyMemberRole } from 'generated/prisma/enums';
import { CurrentCompany } from 'src/shared/decorators/current-company.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { CreateBudgetUseCase } from '../application/create-budget.use-case';
import { GetBudgetConsumptionUseCase } from '../application/get-budget-consumption.use-case';
import { ListCostCenterBudgetsUseCase } from '../application/list-cost-center-budgets.use-case';
import { BudgetConsumptionResponseDto } from '../dto/budget-consumption-response.dto';
import { BudgetResponseDto } from '../dto/budget-response.dto';
import { CreateBudgetDto } from '../dto/create-budget.dto';

@ApiTags('Orçamento')
@ApiCookieAuth('access_token')
@Controller('cost-centers/:costCenterId/budgets')
export class CostCenterBudgetsController {
  constructor(
    private readonly createBudgetUseCase: CreateBudgetUseCase,
    private readonly listCostCenterBudgetsUseCase: ListCostCenterBudgetsUseCase,
    private readonly getBudgetConsumptionUseCase: GetBudgetConsumptionUseCase,
  ) {}

  @Post()
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Definir orçamento de um período',
    description:
      'Uma linha por Centro de Custo por período. O saldo não acumula: cada mês é um registro novo (RN16).',
  })
  @ApiResponse({ status: 201, type: BudgetResponseDto })
  @ApiResponse({
    status: 409,
    description: 'Já existe orçamento neste período',
  })
  async create(
    @CurrentCompany() companyId: string,
    @Param('costCenterId', ParseUUIDPipe) costCenterId: string,
    @Body() dto: CreateBudgetDto,
  ): Promise<BudgetResponseDto> {
    const budget = await this.createBudgetUseCase.execute(
      costCenterId,
      companyId,
      dto,
    );
    return BudgetResponseDto.fromEntity(budget);
  }

  @Get()
  @Roles(CompanyMemberRole.APPROVER, CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Listar orçamentos do Centro de Custo' })
  @ApiResponse({ status: 200, type: [BudgetResponseDto] })
  async list(
    @CurrentCompany() companyId: string,
    @Param('costCenterId', ParseUUIDPipe) costCenterId: string,
  ): Promise<BudgetResponseDto[]> {
    const budgets = await this.listCostCenterBudgetsUseCase.execute(
      costCenterId,
      companyId,
    );
    return BudgetResponseDto.fromEntities(budgets);
  }

  @Get('current')
  @Roles(CompanyMemberRole.APPROVER, CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Painel de consumo do período vigente',
    description:
      'Orçamento, Comprometido, Disponível e percentual de uso (RF32). O comprometido é a soma do extrato, nunca um campo armazenado.',
  })
  @ApiResponse({ status: 200, type: BudgetConsumptionResponseDto })
  @ApiResponse({ status: 400, description: 'Sem orçamento no período vigente' })
  async current(
    @CurrentCompany() companyId: string,
    @Param('costCenterId', ParseUUIDPipe) costCenterId: string,
  ): Promise<BudgetConsumptionResponseDto> {
    const balance = await this.getBudgetConsumptionUseCase.execute(
      costCenterId,
      companyId,
    );
    return BudgetConsumptionResponseDto.fromBalance(balance);
  }
}
