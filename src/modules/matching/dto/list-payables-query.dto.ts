import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PayableStatus } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';

export class ListPayablesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    isArray: true,
    enum: ['BLOCKED', 'RELEASED', 'PAID', 'CANCELED'],
    description: 'Aceita repetição: ?status=BLOCKED',
  })
  @IsOptional()
  @Transform(({ value }: { value: string | string[] }) =>
    Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsEnum(PayableStatus, { each: true })
  status?: PayableStatus[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;
}
