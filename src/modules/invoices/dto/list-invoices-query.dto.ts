import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { InvoiceStatus } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';

export class ListInvoicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    isArray: true,
    enum: ['RECEIVED', 'MATCHED', 'DIVERGENT', 'APPROVED', 'REJECTED'],
  })
  @IsOptional()
  @Transform(({ value }: { value: string | string[] }) =>
    Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsEnum(InvoiceStatus, { each: true })
  status?: InvoiceStatus[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({
    description: 'Restringe às notas ainda sem ordem de compra vinculada.',
  })
  @IsOptional()
  @Transform(
    ({ value }: { value: string | boolean }) =>
      value === true || value === 'true',
  )
  @IsBoolean()
  unlinkedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Busca por número da nota.' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  search?: string;
}
