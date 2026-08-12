import { ApiProperty } from '@nestjs/swagger';
import { Page } from './pagination-query.dto';

export class PaginationMetaDto {
  @ApiProperty({ example: 137 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  perPage: number;

  @ApiProperty({ example: 7 })
  totalPages: number;
}

export class PaginatedResponseDto<T> {
  items: T[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;

  static from<TEntity, TDto>(
    page: Page<TEntity>,
    map: (entity: TEntity) => TDto,
  ): PaginatedResponseDto<TDto> {
    const dto = new PaginatedResponseDto<TDto>();

    dto.items = page.items.map(map);
    dto.meta = {
      total: page.total,
      page: page.page,
      perPage: page.perPage,
      totalPages: Math.max(1, Math.ceil(page.total / page.perPage)),
    };

    return dto;
  }
}
