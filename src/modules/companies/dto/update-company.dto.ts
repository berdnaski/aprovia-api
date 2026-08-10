import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCompanyDto {
  @ApiPropertyOptional({ example: 'Acme Indústria LTDA', maxLength: 180 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  @Transform(({ value }: { value: string }) => value?.trim())
  legalName?: string;

  @ApiPropertyOptional({ example: 'Acme', maxLength: 180 })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  @Transform(({ value }: { value: string }) => value?.trim())
  tradeName?: string | null;

  @ApiPropertyOptional({ example: 'Indústria', maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  industry?: string | null;

  @ApiPropertyOptional({ example: '51-200', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  companySize?: string | null;
}
