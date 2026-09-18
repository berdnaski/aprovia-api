import { ApiProperty } from '@nestjs/swagger';
import { RecurringOccurrenceStatus } from 'generated/prisma/enums';
import { RecurringContractOccurrenceEntity } from '../domain/recurring-contract-occurrence.entity';

export class RecurringOccurrenceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  periodStart: Date;

  @ApiProperty()
  periodEnd: Date;

  @ApiProperty()
  dueDate: Date;

  @ApiProperty({ example: '850000' })
  expectedAmountCents: string;

  @ApiProperty({ enum: RecurringOccurrenceStatus })
  status: RecurringOccurrenceStatus;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  invoiceId: string | null;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  payableId: string | null;

  @ApiProperty({ nullable: true, type: String })
  overrideNote: string | null;

  @ApiProperty({ nullable: true, type: Date })
  matchedAt: Date | null;

  static fromEntity(
    entity: RecurringContractOccurrenceEntity,
  ): RecurringOccurrenceResponseDto {
    const dto = new RecurringOccurrenceResponseDto();

    dto.id = entity.id;
    dto.periodStart = entity.periodStart;
    dto.periodEnd = entity.periodEnd;
    dto.dueDate = entity.dueDate;
    dto.expectedAmountCents = entity.expectedAmountCents.toString();
    dto.status = entity.status;
    dto.invoiceId = entity.invoiceId;
    dto.payableId = entity.payableId;
    dto.overrideNote = entity.overrideNote;
    dto.matchedAt = entity.matchedAt;

    return dto;
  }

  static fromEntities(
    entities: RecurringContractOccurrenceEntity[],
  ): RecurringOccurrenceResponseDto[] {
    return entities.map((entity) =>
      RecurringOccurrenceResponseDto.fromEntity(entity),
    );
  }
}
