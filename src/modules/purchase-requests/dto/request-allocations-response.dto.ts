import { ApiProperty } from '@nestjs/swagger';
import { RequestAllocations } from '../application/manage-request-allocations.use-case';

export class AllocationLineResponseDto {
  @ApiProperty({ format: 'uuid' })
  costCenterId: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  chartAccountId: string | null;

  @ApiProperty({ example: 6000 })
  shareBps: number;

  @ApiProperty({ example: '1704000' })
  amountCents: string;
}

export class RequestAllocationsResponseDto {
  @ApiProperty({
    description:
      'false quando ninguém definiu rateio: a linha única vem do centro de custo e da conta padrão da categoria.',
  })
  custom: boolean;

  @ApiProperty({ type: [AllocationLineResponseDto] })
  lines: AllocationLineResponseDto[];

  static fromAllocations(
    allocations: RequestAllocations,
  ): RequestAllocationsResponseDto {
    const dto = new RequestAllocationsResponseDto();

    dto.custom = allocations.custom;
    dto.lines = allocations.lines.map((line) => ({
      costCenterId: line.costCenterId,
      chartAccountId: line.chartAccountId,
      shareBps: line.shareBps,
      amountCents: line.amountCents.toString(),
    }));

    return dto;
  }
}
