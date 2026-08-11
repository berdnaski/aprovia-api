import { ApiProperty } from '@nestjs/swagger';
import { CostCenterEntity } from '../domain/cost-center.entity';

export class CostCenterResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Tecnologia' })
  name: string;

  @ApiProperty({ example: 'CC-01', nullable: true, type: String })
  code: string | null;

  @ApiProperty({ format: 'uuid' })
  managerId: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  parentId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true, type: Date })
  disabledAt: Date | null;

  static fromEntity(entity: CostCenterEntity): CostCenterResponseDto {
    const dto = new CostCenterResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.code = entity.code;
    dto.managerId = entity.managerId;
    dto.parentId = entity.parentId;
    dto.createdAt = entity.createdAt;
    dto.disabledAt = entity.disabledAt;
    return dto;
  }

  static fromEntities(entities: CostCenterEntity[]): CostCenterResponseDto[] {
    return entities.map((entity) => CostCenterResponseDto.fromEntity(entity));
  }
}
