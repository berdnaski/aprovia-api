import { Injectable } from '@nestjs/common';
import { TokenType } from 'generated/prisma/enums';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { TokenEntity } from '../domain/token.entity';
import { ITokensRepository } from '../domain/tokens.repository.interface';
import { TokenMapper } from './mappers/token.mapper';

@Injectable()
export class TokensRepository implements ITokensRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string | null;
    type: TokenType;
    value: string;
    referenceId?: string | null;
    expiresAt: Date;
  }): Promise<TokenEntity> {
    const record = await this.prisma.token.create({
      data: {
        user_id: data.userId,
        type: data.type,
        value: data.value,
        reference_id: data.referenceId ?? null,
        expires_at: data.expiresAt,
      },
    });

    return TokenMapper.toDomain(record);
  }

  async findValidByValue(
    value: string,
    type: TokenType,
  ): Promise<TokenEntity | null> {
    const record = await this.prisma.token.findFirst({
      where: {
        value,
        type,
        consumed_at: null,
        expires_at: { gt: new Date() },
      },
    });

    return record ? TokenMapper.toDomain(record) : null;
  }

  async consume(id: string): Promise<void> {
    await this.prisma.token.update({
      where: { id },
      data: { consumed_at: new Date() },
    });
  }

  async deleteByUserAndType(userId: string, type: TokenType): Promise<void> {
    await this.prisma.token.deleteMany({
      where: { user_id: userId, type },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.token.deleteMany({
      where: { expires_at: { lt: new Date() } },
    });

    return result.count;
  }
}
