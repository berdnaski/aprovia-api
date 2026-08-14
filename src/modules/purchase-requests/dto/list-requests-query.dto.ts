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
import { RequestStatus } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { RequestView } from '../application/list-requests.use-case';

export class ListRequestsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ['MINE', 'PENDING_FOR_ME', 'ALL'],
    default: 'MINE',
    description:
      'MINE: pedidos que você criou. PENDING_FOR_ME: pedidos aguardando a sua decisão. ALL: tudo que você tem permissão de ver.',
  })
  @IsOptional()
  @IsEnum(RequestView)
  view?: RequestView;

  @ApiPropertyOptional({
    isArray: true,
    enum: [
      'DRAFT',
      'PENDING',
      'CHANGES_REQUESTED',
      'APPROVED',
      'REJECTED',
      'CANCELED',
      'COMPLETED',
    ],
    description: 'Aceita repetição: ?status=PENDING&status=APPROVED',
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

  @ApiPropertyOptional({ description: 'Busca por número ou título.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
