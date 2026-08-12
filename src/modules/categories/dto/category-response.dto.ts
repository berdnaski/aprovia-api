import { ApiProperty } from '@nestjs/swagger';
import { CategoryEntity } from '../domain/category.entity';

export class CategoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Software' })
  name: string;

  @ApiProperty({ nullable: true, type: String })
  description: string | null;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(entity: CategoryEntity): CategoryResponseDto {
    const dto = new CategoryResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.active = entity.active;
    dto.createdAt = entity.createdAt;
    return dto;
  }

  static fromEntities(entities: CategoryEntity[]): CategoryResponseDto[] {
    return entities.map((entity) => CategoryResponseDto.fromEntity(entity));
  }
}
