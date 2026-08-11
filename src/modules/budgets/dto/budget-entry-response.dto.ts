import { ApiProperty } from '@nestjs/swagger';
import { BudgetEntryType } from 'generated/prisma/enums';
import { BudgetEntryEntity } from '../domain/budget-entry.entity';

export class BudgetEntryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  budgetId: string;

  @ApiProperty({ format: 'uuid' })
  purchaseRequestId: string;

  @ApiProperty({ enum: ['CONSUMPTION', 'REVERSAL'] })
  type: BudgetEntryType;

  @ApiProperty({
    example: '-250000',
    description: 'Positivo consome, negativo devolve.',
  })
  amountCents: string;

  @ApiProperty({ nullable: true, type: String })
  description: string | null;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
    type: String,
    description: 'Nulo indica ação automática do sistema.',
  })
  recordedById: string | null;

  @ApiProperty()
  occurredAt: Date;

  static fromEntity(entity: BudgetEntryEntity): BudgetEntryResponseDto {
    const dto = new BudgetEntryResponseDto();
    dto.id = entity.id;
    dto.budgetId = entity.budgetId;
    dto.purchaseRequestId = entity.purchaseRequestId;
    dto.type = entity.type;
    dto.amountCents = entity.amountCents.toString();
    dto.description = entity.description;
    dto.recordedById = entity.recordedById;
    dto.occurredAt = entity.occurredAt;
    return dto;
  }

  static fromEntities(entities: BudgetEntryEntity[]): BudgetEntryResponseDto[] {
    return entities.map((entity) => BudgetEntryResponseDto.fromEntity(entity));
  }
}
