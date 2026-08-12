import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetCategoryActiveDto {
  @ApiProperty({
    description:
      'false impede a seleção em novos pedidos. Pedidos existentes continuam referenciando a categoria normalmente.',
  })
  @IsBoolean()
  active: boolean;
}
