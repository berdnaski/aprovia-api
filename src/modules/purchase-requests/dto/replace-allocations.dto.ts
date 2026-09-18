import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class AllocationLineDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  costCenterId: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  chartAccountId?: string | null;

  @ApiProperty({
    example: 6000,
    description: 'Percentual em pontos-base: 10000 é 100%.',
  })
  @IsInt()
  @Min(1)
  @Max(10000)
  shareBps: number;
}

export class ReplaceAllocationsDto {
  @ApiProperty({ type: [AllocationLineDto] })
  @ValidateNested({ each: true })
  @Type(() => AllocationLineDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  lines: AllocationLineDto[];
}
