import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { NotificationEntity } from '../domain/notification.entity';
import {
  CreateNotificationData,
  INotificationRepository,
  ListNotificationsFilter,
} from '../domain/notifications.repository.interface';
import { NotificationMapper } from './mappers/notification.mapper';

@Injectable()
export class NotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createIfAbsent(
    data: CreateNotificationData,
  ): Promise<NotificationEntity> {
    const record = await this.prisma.notification.upsert({
      where: { dedupe_key: data.dedupeKey },
      create: {
        dedupe_key: data.dedupeKey,
        company_id: data.companyId,
        recipient_id: data.recipientId,
        event: data.event,
        title: data.title,
        message: data.message,
        link: data.link,
      },
      update: {},
    });

    return NotificationMapper.toDomain(record);
  }

  async claimEmail(id: string): Promise<boolean> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, sent_by_email: false },
      data: { sent_by_email: true },
    });

    return count === 1;
  }

  async releaseEmail(id: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id },
      data: { sent_by_email: false },
    });
  }

  async list(
    recipientId: string,
    filter: ListNotificationsFilter,
  ): Promise<Page<NotificationEntity>> {
    const where: Prisma.NotificationWhereInput = {
      recipient_id: recipientId,
      company_id: filter.companyId,
      read_at: filter.unreadOnly ? null : undefined,
    };

    const [records, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items: records.map(NotificationMapper.toDomain),
      total,
      page: Math.floor(filter.skip / filter.take) + 1,
      perPage: filter.take,
    };
  }

  countUnread(recipientId: string, companyId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        recipient_id: recipientId,
        company_id: companyId,
        read_at: null,
      },
    });
  }

  async markAsRead(id: string, recipientId: string): Promise<boolean> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, recipient_id: recipientId, read_at: null },
      data: { read_at: new Date() },
    });

    if (count === 1) {
      return true;
    }

    const alreadyRead = await this.prisma.notification.count({
      where: { id, recipient_id: recipientId },
    });

    return alreadyRead === 1;
  }

  async markAllAsRead(recipientId: string, companyId: string): Promise<number> {
    const { count } = await this.prisma.notification.updateMany({
      where: {
        recipient_id: recipientId,
        company_id: companyId,
        read_at: null,
      },
      data: { read_at: new Date() },
    });

    return count;
  }
}
