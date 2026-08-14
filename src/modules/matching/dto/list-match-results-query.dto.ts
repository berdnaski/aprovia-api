import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { MatchStatus } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';

export class ListMatchResultsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    isArray: true,
    enum: ['MATCHED', 'DIVERGENT', 'OVERRIDDEN', 'REJECTED'],
    description: 'Aceita repetição: ?status=DIVERGENT',
  })
  @IsOptional()
  @Transform(({ value }: { value: string | string[] }) =>
    Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsEnum(MatchStatus, { each: true })
  status?: MatchStatus[];
}
