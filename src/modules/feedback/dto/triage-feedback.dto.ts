import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { FeedbackStatus } from 'generated/prisma/enums';

export class TriageFeedbackDto {
  @ApiProperty({ enum: FeedbackStatus })
  @IsEnum(FeedbackStatus)
  status: FeedbackStatus;

  @ApiPropertyOptional({
    maxLength: 2000,
    description: 'Só a plataforma enxerga.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNote?: string;

  @ApiPropertyOptional({
    maxLength: 2000,
    description: 'Resposta que o autor do feedback passa a ver no produto.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reply?: string;
}
