import { ApiProperty } from '@nestjs/swagger';
import {
  RequestBudget,
  RequestBudgetVerdict,
} from '../application/get-request-budget.use-case';

function centsOrNull(value: bigint | null): string | null {
  return value === null ? null : value.toString();
}

export class RequestBudgetResponseDto {
  @ApiProperty({
    enum: ['FITS', 'WITHIN_TOLERANCE', 'REQUIRES_OVERRIDE', 'NO_BUDGET'],
    description:
      'Como o pedido fica no orçamento do mês do centro de custo. REQUIRES_OVERRIDE só aceita aprovação com ressalva.',
  })
  verdict: RequestBudgetVerdict;

  @ApiProperty({ example: '2840000' })
  amountCents: string;

  @ApiProperty({ nullable: true, type: String, example: '18000000' })
  totalCents: string | null;

  @ApiProperty({ nullable: true, type: String, example: '16508040' })
  committedCents: string | null;

  @ApiProperty({ nullable: true, type: String, example: '1491960' })
  availableCents: string | null;

  @ApiProperty({ nullable: true, type: String, example: '1348040' })
  overrunCents: string | null;

  @ApiProperty({ nullable: true, type: String, example: '900000' })
  toleranceCents: string | null;

  static fromBudget(budget: RequestBudget): RequestBudgetResponseDto {
    const dto = new RequestBudgetResponseDto();

    dto.verdict = budget.verdict;
    dto.amountCents = budget.amountCents.toString();
    dto.totalCents = centsOrNull(budget.totalCents);
    dto.committedCents = centsOrNull(budget.committedCents);
    dto.availableCents = centsOrNull(budget.availableCents);
    dto.overrunCents = centsOrNull(budget.overrunCents);
    dto.toleranceCents = centsOrNull(budget.toleranceCents);

    return dto;
  }
}
