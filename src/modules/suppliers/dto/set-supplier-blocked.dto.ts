import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetSupplierBlockedDto {
  @ApiProperty({
    description:
      'true impede a submissão de novos pedidos para este fornecedor. Pedidos já submetidos não são afetados.',
  })
  @IsBoolean()
  blocked: boolean;
}
