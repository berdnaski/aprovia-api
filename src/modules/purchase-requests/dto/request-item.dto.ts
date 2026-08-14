import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {IsString, Length, Matches, MaxLength, IsNotEmpty } from 'class-validator';

export class RequestItemDto {
  @ApiProperty({ example: 'Notebook Dell i7 16GB', maxLength: 300 })
  @IsString()
  @Length(2, 300)
  description: string;

  @ApiProperty({
    example: '10.000',
    description: 'Até 3 casas decimais, como string para não perder precisão.',
  })
  @Matches(/^\d{1,9}(\.\d{1,3})?$/, {
    message: 'A quantidade deve ter no máximo 3 casas decimais',
  })
  quantity: string;

  @ApiProperty({ example: 'un', maxLength: 20 })
  @IsString()
  @MaxLength(20)
  unit: string;

  @ApiProperty({
    example: '850000',
    description: 'Preço unitário em centavos.',
  })
  @IsNotEmpty()
  @Transform(({ value }: { value: string | number }) => BigInt(value))
  unitPriceCents: bigint;
}
