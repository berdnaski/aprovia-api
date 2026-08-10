import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class SetMemberSubstituteDto {
  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Substituto durante a ausência. Nulo cancela a substituição.',
  })
  @IsOptional()
  @IsUUID()
  substituteId?: string | null;

  @ApiPropertyOptional({ example: '2026-09-01', nullable: true })
  @ValidateIf((dto: SetMemberSubstituteDto) => Boolean(dto.substituteId))
  @Type(() => Date)
  @IsDate()
  absentFrom?: Date | null;

  @ApiPropertyOptional({ example: '2026-09-15', nullable: true })
  @ValidateIf((dto: SetMemberSubstituteDto) => Boolean(dto.substituteId))
  @Type(() => Date)
  @IsDate()
  absentUntil?: Date | null;
}
