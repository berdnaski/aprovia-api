import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransferCostCenterManagementDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Gestor atual, cujos Centros de Custo serão transferidos.',
  })
  @IsUUID()
  fromMemberId: string;

  @ApiProperty({
    format: 'uuid',
    description:
      'Novo gestor. Precisa ser membro ativo com perfil de Aprovador ou Admin Financeiro (RN14).',
  })
  @IsUUID()
  toMemberId: string;
}
