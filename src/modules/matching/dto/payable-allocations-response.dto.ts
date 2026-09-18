import { ApiProperty } from '@nestjs/swagger';
import { PayableAllocationEntity } from '../domain/payable-allocation.entity';

export class PayableAllocationResponseDto {
  @ApiProperty({ format: 'uuid' })
  costCenterId: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  chartAccountId: string | null;

  @ApiProperty({ example: '1704000' })
  amountCents: string;

  static fromEntity(
    entity: PayableAllocationEntity,
  ): PayableAllocationResponseDto {
    const dto = new PayableAllocationResponseDto();

    dto.costCenterId = entity.costCenterId;
    dto.chartAccountId = entity.chartAccountId;
    dto.amountCents = entity.amountCents.toString();

    return dto;
  }

  static fromEntities(
    entities: PayableAllocationEntity[],
  ): PayableAllocationResponseDto[] {
    return entities.map((entity) =>
      PayableAllocationResponseDto.fromEntity(entity),
    );
  }
}
