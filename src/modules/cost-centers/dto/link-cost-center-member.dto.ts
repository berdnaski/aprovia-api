import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class LinkCostCenterMemberDto {
  @ApiProperty({ format: 'uuid', description: 'Membro a vincular (RF28).' })
  @IsUUID()
  memberId: string;
}
