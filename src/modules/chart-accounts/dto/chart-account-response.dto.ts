import { ApiProperty } from '@nestjs/swagger';
import { ChartAccountKind } from 'generated/prisma/enums';
import { ChartAccountEntity } from '../domain/chart-account.entity';

export class ChartAccountResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  parentId: string | null;

  @ApiProperty({ example: '4.1.01' })
  code: string;

  @ApiProperty({ example: 'Softwares e assinaturas' })
  name: string;

  @ApiProperty({ enum: ChartAccountKind })
  kind: ChartAccountKind;

  @ApiProperty()
  postable: boolean;

  @ApiProperty({ nullable: true, type: String })
  externalCode: string | null;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(entity: ChartAccountEntity): ChartAccountResponseDto {
    const dto = new ChartAccountResponseDto();
    dto.id = entity.id;
    dto.parentId = entity.parentId;
    dto.code = entity.code;
    dto.name = entity.name;
    dto.kind = entity.kind;
    dto.postable = entity.postable;
    dto.externalCode = entity.externalCode;
    dto.active = entity.active;
    dto.createdAt = entity.createdAt;
    return dto;
  }

  static fromEntities(
    entities: ChartAccountEntity[],
  ): ChartAccountResponseDto[] {
    return entities.map((entity) => ChartAccountResponseDto.fromEntity(entity));
  }
}

export class ChartImportResponseDto {
  @ApiProperty()
  created: number;

  @ApiProperty()
  updated: number;
}

export class ModelChartResponseDto {
  @ApiProperty()
  created: number;

  @ApiProperty()
  categoriesLinked: number;
}
