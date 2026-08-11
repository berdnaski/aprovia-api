import { ApiProperty } from '@nestjs/swagger';
import { CostCenterMemberEntity } from '../domain/cost-center-member.entity';

export class CostCenterMemberResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  costCenterId: string;

  @ApiProperty({ format: 'uuid' })
  memberId: string;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(
    entity: CostCenterMemberEntity,
  ): CostCenterMemberResponseDto {
    const dto = new CostCenterMemberResponseDto();
    dto.id = entity.id;
    dto.costCenterId = entity.costCenterId;
    dto.memberId = entity.memberId;
    dto.createdAt = entity.createdAt;
    return dto;
  }

  static fromEntities(
    entities: CostCenterMemberEntity[],
  ): CostCenterMemberResponseDto[] {
    return entities.map((entity) =>
      CostCenterMemberResponseDto.fromEntity(entity),
    );
  }
}
