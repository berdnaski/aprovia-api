import { ApiProperty } from '@nestjs/swagger';
import {
  CostCenterBudget,
  RequestBudget,
  RequestBudgetVerdict,
} from '../application/get-request-budget.use-case';

const VERDICTS = ['FITS', 'WITHIN_TOLERANCE', 'REQUIRES_OVERRIDE', 'NO_BUDGET'];

function centsOrNull(value: bigint | null): string | null {
  return value === null ? null : value.toString();
}

export class CostCenterBudgetResponseDto {
  @ApiProperty({ format: 'uuid' })
  costCenterId: string;

  @ApiProperty({ example: 'Marketing' })
  costCenterName: string;

  @ApiProperty({ enum: VERDICTS })
  verdict: RequestBudgetVerdict;

  @ApiProperty({ example: '1136000' })
  amountCents: string;

  @ApiProperty({ nullable: true, type: String })
  totalCents: string | null;

  @ApiProperty({ nullable: true, type: String })
  committedCents: string | null;

  @ApiProperty({ nullable: true, type: String })
  availableCents: string | null;

  @ApiProperty({ nullable: true, type: String })
  overrunCents: string | null;

  @ApiProperty({ nullable: true, type: String })
  toleranceCents: string | null;

  static fromLine(line: CostCenterBudget): CostCenterBudgetResponseDto {
    const dto = new CostCenterBudgetResponseDto();

    dto.costCenterId = line.costCenterId;
    dto.costCenterName = line.costCenterName;
    dto.verdict = line.verdict;
    dto.amountCents = line.amountCents.toString();
    dto.totalCents = centsOrNull(line.totalCents);
    dto.committedCents = centsOrNull(line.committedCents);
    dto.availableCents = centsOrNull(line.availableCents);
    dto.overrunCents = centsOrNull(line.overrunCents);
    dto.toleranceCents = centsOrNull(line.toleranceCents);

    return dto;
  }
}

export class RequestBudgetResponseDto {
  @ApiProperty({
    enum: VERDICTS,
    description:
      'A situação mais grave entre os centros de custo do rateio. REQUIRES_OVERRIDE só aceita aprovação com ressalva.',
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

  @ApiProperty({ type: [CostCenterBudgetResponseDto] })
  lines: CostCenterBudgetResponseDto[];

  static fromBudget(budget: RequestBudget): RequestBudgetResponseDto {
    const dto = new RequestBudgetResponseDto();

    dto.verdict = budget.verdict;
    dto.amountCents = budget.amountCents.toString();
    dto.totalCents = centsOrNull(budget.totalCents);
    dto.committedCents = centsOrNull(budget.committedCents);
    dto.availableCents = centsOrNull(budget.availableCents);
    dto.overrunCents = centsOrNull(budget.overrunCents);
    dto.toleranceCents = centsOrNull(budget.toleranceCents);
    dto.lines = budget.lines.map((line) =>
      CostCenterBudgetResponseDto.fromLine(line),
    );

    return dto;
  }
}
