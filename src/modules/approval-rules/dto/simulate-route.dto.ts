import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDate, IsOptional, IsUUID } from 'class-validator';
import { RoutingResult } from '../domain/routing/routing.types';

export class SimulateRouteDto {
  @ApiProperty({
    example: '3000000',
    description: 'Valor do pedido em centavos.',
  })
  @Transform(({ value }: { value: string | number }) => BigInt(value))
  amountCents: bigint;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  costCenterId: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Membro que seria o solicitante.',
  })
  @IsUUID()
  requesterId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    example: '2026-03-10',
    description:
      'Data usada para avaliar ausências (RN29). O padrão é agora. Informar torna a simulação reproduzível.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  at?: Date;
}

export class SimulatedStepDto {
  @ApiProperty({ example: 1 })
  stepOrder: number;

  @ApiProperty({ format: 'uuid' })
  expectedApproverId: string;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
    type: String,
    description:
      'Preenchido quando a etapa foi desviada para um substituto (RN29).',
  })
  onBehalfOfId: string | null;

  @ApiProperty()
  requiresDualApproval: boolean;
}

export class SimulatedRouteResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Faixa da matriz que foi aplicada.',
  })
  ruleId: string;

  @ApiProperty({ example: 3 })
  totalSteps: number;

  @ApiProperty({ type: [SimulatedStepDto] })
  steps: SimulatedStepDto[];

  static fromResult(result: RoutingResult): SimulatedRouteResponseDto {
    const dto = new SimulatedRouteResponseDto();

    dto.ruleId = result.ruleId;
    dto.totalSteps = result.steps.length;
    dto.steps = result.steps;

    return dto;
  }
}
