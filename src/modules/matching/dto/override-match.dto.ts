import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class OverrideMatchDto {
  @ApiProperty({
    minLength: 10,
    maxLength: 500,
    description: 'Por que a divergência foi aceita (RN64).',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  note: string;
}
