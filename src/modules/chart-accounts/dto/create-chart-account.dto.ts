import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChartAccountKind } from 'generated/prisma/enums';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateChartAccountDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiProperty({ example: '4.1.01', maxLength: 40 })
  @IsString()
  @Length(1, 40)
  code: string;

  @ApiProperty({ example: 'Softwares e assinaturas', maxLength: 160 })
  @IsString()
  @Length(2, 160)
  name: string;

  @ApiPropertyOptional({
    enum: ChartAccountKind,
    description:
      'Obrigatória para contas de primeiro nível. Abaixo de outra conta, herda a natureza dela.',
  })
  @IsOptional()
  @IsEnum(ChartAccountKind)
  kind?: ChartAccountKind;

  @ApiProperty({
    description:
      'true para conta que recebe lançamentos, false para conta de agrupamento.',
  })
  @IsBoolean()
  postable: boolean;

  @ApiPropertyOptional({ example: '31101', maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  externalCode?: string | null;
}
