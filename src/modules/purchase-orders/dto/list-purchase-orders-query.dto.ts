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
import { PurchaseOrderStatus } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';

export class ListPurchaseOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    isArray: true,
    enum: [
      'DRAFT',
      'ISSUED',
      'SENT',
      'PARTIALLY_RECEIVED',
      'RECEIVED',
      'CLOSED',
      'CANCELED',
    ],
    description: 'Aceita repetição: ?status=ISSUED&status=SENT',
  })
  @IsOptional()
  @Transform(({ value }: { value: string | string[] }) =>
    Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsEnum(PurchaseOrderStatus, { each: true })
  status?: PurchaseOrderStatus[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Busca por número da OC ou título.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
