import { ApiProperty } from '@nestjs/swagger';
import { BudgetBalance } from '../domain/services/budget-balance.service';

export class BudgetConsumptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  budgetId: string;

  @ApiProperty({ format: 'uuid' })
  costCenterId: string;

  @ApiProperty({ example: '2026-09-01' })
  periodStart: Date;

  @ApiProperty({ example: '2026-09-30' })
  periodEnd: Date;

  @ApiProperty({ example: '5000000', description: 'Orçamento do período' })
  totalAmountCents: string;

  @ApiProperty({
    example: '1250000',
    description: 'Soma das entradas do extrato (RF32)',
  })
  committedCents: string;

  @ApiProperty({
    example: '400000',
    description:
      'Pedidos pendentes de aprovação. Não deduzem saldo, mas são exibidos separadamente (RN17).',
  })
  underReviewCents: string;

  @ApiProperty({
    example: '3750000',
    description: 'Orçamento menos comprometido',
  })
  availableCents: string;

  @ApiProperty({ example: 25, description: 'Percentual de uso do período' })
  usagePercent: number;

  static fromBalance(balance: BudgetBalance): BudgetConsumptionResponseDto {
    const dto = new BudgetConsumptionResponseDto();
    dto.budgetId = balance.budgetId;
    dto.costCenterId = balance.costCenterId;
    dto.periodStart = balance.periodStart;
    dto.periodEnd = balance.periodEnd;
    dto.totalAmountCents = balance.totalAmountCents.toString();
    dto.committedCents = balance.committedCents.toString();
    dto.underReviewCents = balance.underReviewCents.toString();
    dto.availableCents = balance.availableCents.toString();
    dto.usagePercent = balance.usagePercent;
    return dto;
  }
}
