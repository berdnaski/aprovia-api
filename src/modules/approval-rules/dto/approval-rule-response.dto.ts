import { ApiProperty } from '@nestjs/swagger';
import { ApproverType } from 'generated/prisma/enums';
import { ApprovalRuleEntity } from '../domain/approval-rule.entity';

export class ApprovalRuleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  costCenterId: string | null;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  categoryId: string | null;

  @ApiProperty({ example: '0', description: 'Início da faixa em centavos' })
  minAmountCents: string;

  @ApiProperty({
    example: '500000',
    nullable: true,
    type: String,
    description: 'Fim da faixa em centavos. Nulo indica faixa sem teto.',
  })
  maxAmountCents: string | null;

  @ApiProperty({ enum: ['DIRECT_MANAGER', 'COST_CENTER_MANAGER'] })
  approverType: ApproverType;

  @ApiProperty()
  requiresDualApproval: boolean;

  @ApiProperty()
  isActive: boolean;

  static fromEntity(entity: ApprovalRuleEntity): ApprovalRuleResponseDto {
    const dto = new ApprovalRuleResponseDto();
    dto.id = entity.id;
    dto.costCenterId = entity.costCenterId;
    dto.categoryId = entity.categoryId;
    dto.minAmountCents = entity.minAmountCents.toString();
    dto.maxAmountCents = entity.maxAmountCents?.toString() ?? null;
    dto.approverType = entity.approverType;
    dto.requiresDualApproval = entity.requiresDualApproval;
    dto.isActive = entity.isActive;
    return dto;
  }

  static fromEntities(
    entities: ApprovalRuleEntity[],
  ): ApprovalRuleResponseDto[] {
    return entities.map((entity) => ApprovalRuleResponseDto.fromEntity(entity));
  }
}
