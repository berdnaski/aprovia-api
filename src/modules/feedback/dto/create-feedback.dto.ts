import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FeedbackKind } from 'generated/prisma/enums';

export class CreateFeedbackDto {
  @ApiProperty({ enum: FeedbackKind })
  @IsEnum(FeedbackKind)
  kind: FeedbackKind;

  @ApiProperty({ minLength: 10, maxLength: 2000 })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({
    maxLength: 300,
    description: 'Rota em que o usuário estava. Preenchida pelo front.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  route?: string;
}
