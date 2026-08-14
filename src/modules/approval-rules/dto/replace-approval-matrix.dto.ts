import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
  ValidateNested, IsNotEmpty } from 'class-validator';
import { ApproverType } from 'generated/prisma/enums';

const toBigInt = ({
  value,
}: {
  value: string | number | null;
}): bigint | null => (value === null || value === '' ? null : BigInt(value));

export class ApprovalRuleRangeDto {
  @ApiProperty({
    example: '0',
    description: 'Início da faixa em centavos. A primeira faixa começa em 0.',
  })
  @IsNotEmpty()
  @Transform(toBigInt)
  minAmountCents: bigint;

  @ApiPropertyOptional({
    example: '500000',
    nullable: true,
    description: 'Fim da faixa em centavos. Nulo apenas na última faixa.',
  })
  @IsOptional()
  @Transform(toBigInt)
  maxAmountCents?: bigint | null;

  @ApiProperty({ enum: ['DIRECT_MANAGER', 'COST_CENTER_MANAGER'] })
  @IsEnum(ApproverType)
  approverType: ApproverType;

  @ApiPropertyOptional({
    default: false,
    description: 'Dupla assinatura (RN26).',
  })
  @IsOptional()
  @IsBoolean()
  requiresDualApproval?: boolean;
}

export class ReplaceApprovalMatrixDto {
  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Nulo aplica a matriz global da empresa (RF35).',
  })
  @IsOptional()
  @IsUUID()
  costCenterId?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Nulo aplica a qualquer categoria (RF35).',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiProperty({
    type: [ApprovalRuleRangeDto],
    description:
      'Faixas contíguas cobrindo de 0 ao infinito. Lista vazia remove uma matriz específica.',
  })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ApprovalRuleRangeDto)
  ranges: ApprovalRuleRangeDto[];
}
