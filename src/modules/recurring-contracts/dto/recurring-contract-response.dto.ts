import { ApiProperty } from '@nestjs/swagger';
import { RecurringFrequency } from 'generated/prisma/enums';
import { RecurringContractEntity } from '../domain/recurring-contract.entity';

export class RecurringContractResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  sourceRequestId: string;

  @ApiProperty({ format: 'uuid' })
  supplierId: string;

  @ApiProperty({ format: 'uuid' })
  costCenterId: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  categoryId: string | null;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  chartAccountId: string | null;

  @ApiProperty()
  title: string;

  @ApiProperty({ example: '850000' })
  amountCents: string;

  @ApiProperty({ enum: RecurringFrequency })
  frequency: RecurringFrequency;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  nextOccurrenceDate: Date;

  @ApiProperty()
  active: boolean;

  @ApiProperty({ nullable: true, type: Date })
  canceledAt: Date | null;

  @ApiProperty({ nullable: true, type: String })
  cancelReason: string | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(
    entity: RecurringContractEntity,
  ): RecurringContractResponseDto {
    const dto = new RecurringContractResponseDto();

    dto.id = entity.id;
    dto.sourceRequestId = entity.sourceRequestId;
    dto.supplierId = entity.supplierId;
    dto.costCenterId = entity.costCenterId;
    dto.categoryId = entity.categoryId;
    dto.chartAccountId = entity.chartAccountId;
    dto.title = entity.title;
    dto.amountCents = entity.amountCents.toString();
    dto.frequency = entity.frequency;
    dto.startDate = entity.startDate;
    dto.nextOccurrenceDate = entity.nextOccurrenceDate;
    dto.active = entity.active;
    dto.canceledAt = entity.canceledAt;
    dto.cancelReason = entity.cancelReason;
    dto.createdAt = entity.createdAt;

    return dto;
  }

  static fromEntities(
    entities: RecurringContractEntity[],
  ): RecurringContractResponseDto[] {
    return entities.map((entity) =>
      RecurringContractResponseDto.fromEntity(entity),
    );
  }
}
