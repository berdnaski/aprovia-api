import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class SetMemberManagerDto {
  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Líder direto do membro. Nulo remove o vínculo.',
  })
  @IsOptional()
  @IsUUID()
  managerId?: string | null;
}
