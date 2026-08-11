import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export class UpdateCostCenterDto {
  @ApiPropertyOptional({ example: 'Tecnologia', maxLength: 120 })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @ApiPropertyOptional({ example: 'CC-01', maxLength: 30, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Nulo desvincula do pai. Ciclos são rejeitados.',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}
