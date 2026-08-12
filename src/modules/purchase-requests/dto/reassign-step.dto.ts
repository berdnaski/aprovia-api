import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ReassignStepDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'Novo aprovador. Precisa ter alçada igual ou maior que a do aprovador original (RN33).',
  })
  @IsUUID()
  toMemberId: string;
}
