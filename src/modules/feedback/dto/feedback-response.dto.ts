import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackKind, FeedbackStatus } from 'generated/prisma/enums';
import { FeedbackEntity } from '../domain/feedback.entity';
import { FeedbackCounters } from '../domain/feedbacks.repository.interface';

export class FeedbackPersonDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;
}

export class FeedbackCompanyDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class FeedbackResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: FeedbackKind })
  kind: FeedbackKind;

  @ApiProperty({ enum: FeedbackStatus })
  status: FeedbackStatus;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional({ nullable: true })
  route: string | null;

  @ApiPropertyOptional({ nullable: true })
  userAgent: string | null;

  @ApiProperty()
  hasScreenshot: boolean;

  @ApiPropertyOptional({ nullable: true })
  internalNote: string | null;

  @ApiPropertyOptional({ nullable: true })
  reply: string | null;

  @ApiPropertyOptional({ nullable: true })
  repliedAt: string | null;

  @ApiPropertyOptional({ nullable: true })
  triagedAt: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional({ type: FeedbackPersonDto, nullable: true })
  author: FeedbackPersonDto | null;

  @ApiPropertyOptional({ type: FeedbackPersonDto, nullable: true })
  triagedBy: FeedbackPersonDto | null;

  @ApiPropertyOptional({ type: FeedbackCompanyDto, nullable: true })
  company: FeedbackCompanyDto | null;

  static from(this: void, entity: FeedbackEntity): FeedbackResponseDto {
    const dto = new FeedbackResponseDto();

    dto.id = entity.id;
    dto.kind = entity.kind;
    dto.status = entity.status;
    dto.message = entity.message;
    dto.route = entity.route;
    dto.userAgent = entity.userAgent;
    dto.hasScreenshot = entity.screenshotKey !== null;
    dto.internalNote = entity.internalNote;
    dto.reply = entity.reply;
    dto.repliedAt = entity.repliedAt?.toISOString() ?? null;
    dto.triagedAt = entity.triagedAt?.toISOString() ?? null;
    dto.createdAt = entity.createdAt.toISOString();
    dto.author = entity.author;
    dto.triagedBy = entity.triagedBy;
    dto.company = entity.company;

    return dto;
  }
}

export class FeedbackCountersDto {
  @ApiProperty()
  total: number;

  @ApiProperty({ type: Object })
  byStatus: Record<FeedbackStatus, number>;

  @ApiProperty({ type: Object })
  byKind: Record<FeedbackKind, number>;

  static from(this: void, counters: FeedbackCounters): FeedbackCountersDto {
    const dto = new FeedbackCountersDto();

    dto.total = counters.total;
    dto.byStatus = counters.byStatus;
    dto.byKind = counters.byKind;

    return dto;
  }
}

export class MyFeedbackResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: FeedbackKind })
  kind: FeedbackKind;

  @ApiProperty({ enum: FeedbackStatus })
  status: FeedbackStatus;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional({ nullable: true })
  route: string | null;

  @ApiProperty()
  hasScreenshot: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Resposta da plataforma. A nota interna nunca vem aqui.',
  })
  reply: string | null;

  @ApiPropertyOptional({ nullable: true })
  repliedAt: string | null;

  @ApiProperty()
  createdAt: string;

  static from(this: void, entity: FeedbackEntity): MyFeedbackResponseDto {
    const dto = new MyFeedbackResponseDto();

    dto.id = entity.id;
    dto.kind = entity.kind;
    dto.status = entity.status;
    dto.message = entity.message;
    dto.route = entity.route;
    dto.hasScreenshot = entity.screenshotKey !== null;
    dto.reply = entity.reply;
    dto.repliedAt = entity.repliedAt?.toISOString() ?? null;
    dto.createdAt = entity.createdAt.toISOString();

    return dto;
  }
}
