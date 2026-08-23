import { ApiProperty } from '@nestjs/swagger';
import { CostCenterSummary } from '../infrastructure/cost-center-summary.repository';
import { CostCenterEntity } from '../domain/cost-center.entity';

export class CostCenterBudgetSummaryDto {
  @ApiProperty({ format: 'uuid' })
  budgetId: string;

  @ApiProperty({ example: '2026-08-01' })
  periodStart: Date;

  @ApiProperty({ example: '2026-08-31' })
  periodEnd: Date;

  @ApiProperty({ example: '18000000' })
  totalAmountCents: string;

  @ApiProperty({ example: '9420000' })
  committedCents: string;

  @ApiProperty({
    example: '2680000',
    description: 'Pedidos pendentes de decisão. Não deduzem saldo (RN17).',
  })
  underReviewCents: string;

  @ApiProperty({ example: '8580000' })
  availableCents: string;

  @ApiProperty({ example: 52 })
  usagePercent: number;
}

export class CostCenterSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Tecnologia' })
  name: string;

  @ApiProperty({ example: 'CC-01', nullable: true, type: String })
  code: string | null;

  @ApiProperty({ format: 'uuid' })
  managerId: string;

  @ApiProperty({ nullable: true, type: String })
  managerName: string | null;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  parentId: string | null;

  @ApiProperty({ example: 9 })
  memberCount: number;

  @ApiProperty({ example: 3 })
  openRequests: number;

  @ApiProperty({
    type: CostCenterBudgetSummaryDto,
    nullable: true,
    description: 'Orçamento do período vigente. Nulo quando não há teto.',
  })
  budget: CostCenterBudgetSummaryDto | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true, type: Date })
  disabledAt: Date | null;

  static fromEntity(
    entity: CostCenterEntity,
    summary?: CostCenterSummary,
  ): CostCenterSummaryResponseDto {
    const dto = new CostCenterSummaryResponseDto();

    dto.id = entity.id;
    dto.name = entity.name;
    dto.code = entity.code;
    dto.managerId = entity.managerId;
    dto.managerName = summary?.managerName ?? null;
    dto.parentId = entity.parentId;
    dto.memberCount = summary?.memberCount ?? 0;
    dto.openRequests = summary?.openRequests ?? 0;
    dto.createdAt = entity.createdAt;
    dto.disabledAt = entity.disabledAt;
    dto.budget = null;

    if (summary?.budgetId && summary.totalAmountCents !== null) {
      const total = summary.totalAmountCents;
      const committed = summary.committedCents;
      const available = total - committed;

      const budget = new CostCenterBudgetSummaryDto();
      budget.budgetId = summary.budgetId;
      budget.periodStart = summary.periodStart as Date;
      budget.periodEnd = summary.periodEnd as Date;
      budget.totalAmountCents = total.toString();
      budget.committedCents = committed.toString();
      budget.underReviewCents = summary.underReviewCents.toString();
      budget.availableCents = available.toString();
      budget.usagePercent =
        total > 0n ? Number((committed * 100n) / total) : 0;

      dto.budget = budget;
    }

    return dto;
  }
}
