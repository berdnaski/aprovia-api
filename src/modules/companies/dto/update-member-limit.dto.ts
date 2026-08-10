import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

export class UpdateMemberLimitDto {
  @ApiProperty({
    example: '1000000',
    description:
      'Alçada em centavos. Zero significa que o membro não aprova nenhum valor.',
  })
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => BigInt(value))
  approvalLimitCents: bigint;
}
