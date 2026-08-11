import { ApiProperty } from '@nestjs/swagger';
import { BudgetEntity } from '../domain/budget.entity';

export class BudgetResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  costCenterId: string;

  @ApiProperty({ example: '2026-09-01' })
  periodStart: Date;

  @ApiProperty({ example: '2026-09-30' })
  periodEnd: Date;

  @ApiProperty({
    example: '5000000',
    description: 'Teto do período em centavos',
  })
  totalAmountCents: string;

  @ApiProperty({ nullable: true, type: String })
  changeReason: string | null;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  updatedById: string | null;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: BudgetEntity): BudgetResponseDto {
    const dto = new BudgetResponseDto();
    dto.id = entity.id;
    dto.costCenterId = entity.costCenterId;
    dto.periodStart = entity.periodStart;
    dto.periodEnd = entity.periodEnd;
    dto.totalAmountCents = entity.totalAmountCents.toString();
    dto.changeReason = entity.changeReason;
    dto.updatedById = entity.updatedById;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }

  static fromEntities(entities: BudgetEntity[]): BudgetResponseDto[] {
    return entities.map((entity) => BudgetResponseDto.fromEntity(entity));
  }
}
