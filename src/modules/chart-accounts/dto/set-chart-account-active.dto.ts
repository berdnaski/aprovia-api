import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetChartAccountActiveDto {
  @ApiProperty({
    description:
      'false impede o uso da conta em novos rateios. Lançamentos antigos continuam apontando para ela.',
  })
  @IsBoolean()
  active: boolean;
}
