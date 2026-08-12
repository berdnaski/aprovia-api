import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { RequestStatus } from 'generated/prisma/enums';
import { ExportFormat } from '../domain/spreadsheet';

export class ExportRequestsQueryDto {
  @ApiPropertyOptional({ enum: ['csv', 'xlsx'], default: 'csv' })
  @IsOptional()
  @IsIn([ExportFormat.CSV, ExportFormat.XLSX])
  format: ExportFormat = ExportFormat.CSV;

  @ApiPropertyOptional({
    isArray: true,
    enum: [
      'DRAFT',
      'PENDING',
      'CHANGES_REQUESTED',
      'APPROVED',
      'COMPLETED',
      'REJECTED',
      'CANCELED',
    ],
  })
  @IsOptional()
  @Transform(({ value }: { value: string | string[] }) =>
    Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsEnum(RequestStatus, { each: true })
  status?: RequestStatus[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  costCenterId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
