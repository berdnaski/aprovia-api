import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { FeedbackKind, FeedbackStatus } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';

function toArray<T>(value: unknown): T[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value as T[];
  }

  return typeof value === 'string' ? (value.split(',') as T[]) : undefined;
}

export class ListFeedbacksQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ enum: FeedbackStatus, isArray: true })
  @IsOptional()
  @Transform(({ value }) => toArray<FeedbackStatus>(value))
  @IsArray()
  @IsEnum(FeedbackStatus, { each: true })
  status?: FeedbackStatus[];

  @ApiPropertyOptional({ enum: FeedbackKind, isArray: true })
  @IsOptional()
  @Transform(({ value }) => toArray<FeedbackKind>(value))
  @IsArray()
  @IsEnum(FeedbackKind, { each: true })
  kind?: FeedbackKind[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
