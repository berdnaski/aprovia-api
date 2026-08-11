import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateCostCenterDto {
  @ApiProperty({ example: 'Tecnologia', maxLength: 120 })
  @IsString()
  @Length(2, 120)
  name: string;

  @ApiPropertyOptional({ example: 'CC-01', maxLength: 30, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string | null;

  @ApiProperty({
    format: 'uuid',
    description:
      'Gestor responsável. Precisa ser membro ativo com perfil de Aprovador ou Admin Financeiro (RN14).',
  })
  @IsUUID()
  managerId: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Centro de Custo pai na hierarquia (RF27).',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}
