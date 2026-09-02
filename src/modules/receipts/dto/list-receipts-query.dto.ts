import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';

export class ListReceiptsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Filtra por ordem.' })
  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @ApiPropertyOptional({
    description: 'Restringe aos recebimentos que tiveram recusa de item.',
  })
  @IsOptional()
  @Transform(
    ({ value }: { value: string | boolean }) =>
      value === true || value === 'true',
  )
  @IsBoolean()
  divergentOnly?: boolean;

  @ApiPropertyOptional({ description: 'Busca por número do recebimento.' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  search?: string;
}
