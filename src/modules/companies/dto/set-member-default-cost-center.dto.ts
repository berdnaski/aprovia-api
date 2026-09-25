import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class SetMemberDefaultCostCenterDto {
  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description:
      'Centro de Custo para o qual esta pessoa é preferida como aprovadora, quando tem alçada. Nulo remove a preferência.',
  })
  @IsOptional()
  @IsUUID()
  costCenterId?: string | null;
}
