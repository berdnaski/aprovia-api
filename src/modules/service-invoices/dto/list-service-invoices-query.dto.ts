import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ServiceInvoiceStatus } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';

export class ListServiceInvoicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    isArray: true,
    enum: ['RECEIVED', 'APPROVED', 'REJECTED'],
  })
  @IsOptional()
  @Transform(({ value }: { value: string | string[] }) =>
    Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsEnum(ServiceInvoiceStatus, { each: true })
  status?: ServiceInvoiceStatus[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Busca por número da nota.' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  search?: string;
}
