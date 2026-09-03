import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { WaitlistEntryEntity } from '../domain/waitlist.entity';
import {
  CreateWaitlistData,
  IWaitlistRepository,
  ListWaitlistFilter,
} from '../domain/waitlist.repository.interface';

interface RawEntry {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  source: string | null;
  invited_at: Date | null;
  created_at: Date;
}

function toDomain(raw: RawEntry): WaitlistEntryEntity {
  const entity = new WaitlistEntryEntity();

  entity.id = raw.id;
  entity.email = raw.email;
  entity.name = raw.name;
  entity.company = raw.company;
  entity.source = raw.source;
  entity.invitedAt = raw.invited_at;
  entity.createdAt = raw.created_at;

  return entity;
}

@Injectable()
export class WaitlistRepository implements IWaitlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateWaitlistData): Promise<WaitlistEntryEntity> {
    const raw = await this.prisma.waitlistEntry.create({
      data: {
        email: data.email,
        name: data.name,
        company: data.company,
        source: data.source,
      },
    });

    return toDomain(raw);
  }

  async findByEmail(email: string): Promise<WaitlistEntryEntity | null> {
    const raw = await this.prisma.waitlistEntry.findUnique({
      where: { email },
    });

    return raw ? toDomain(raw) : null;
  }

  async list(filter: ListWaitlistFilter): Promise<Page<WaitlistEntryEntity>> {
    const where: Prisma.WaitlistEntryWhereInput = filter.search
      ? {
          OR: [
            { email: { contains: filter.search, mode: 'insensitive' } },
            { company: { contains: filter.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.waitlistEntry.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.waitlistEntry.count({ where }),
    ]);

    return {
      items: rows.map(toDomain),
      total,
      page: filter.page,
      perPage: filter.perPage,
    };
  }

  async count(): Promise<number> {
    return this.prisma.waitlistEntry.count();
  }
}
