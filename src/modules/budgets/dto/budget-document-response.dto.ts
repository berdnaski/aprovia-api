import { ApiProperty } from '@nestjs/swagger';
import { BudgetDocumentEntity } from '../domain/budget-document.entity';

export class BudgetDocumentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty({ example: '2485120' })
  sizeBytes: string;

  @ApiProperty()
  sha256: string;

  @ApiProperty({ nullable: true, type: String })
  description: string | null;

  @ApiProperty({ format: 'uuid' })
  uploadedById: string;

  @ApiProperty()
  uploadedAt: Date;

  static fromEntity(entity: BudgetDocumentEntity): BudgetDocumentResponseDto {
    const dto = new BudgetDocumentResponseDto();

    dto.id = entity.id;
    dto.fileName = entity.fileName;
    dto.mimeType = entity.mimeType;
    dto.sizeBytes = entity.sizeBytes.toString();
    dto.sha256 = entity.sha256;
    dto.description = entity.description;
    dto.uploadedById = entity.uploadedById;
    dto.uploadedAt = entity.uploadedAt;

    return dto;
  }

  static fromEntities(
    entities: BudgetDocumentEntity[],
  ): BudgetDocumentResponseDto[] {
    return entities.map((entity) =>
      BudgetDocumentResponseDto.fromEntity(entity),
    );
  }
}
