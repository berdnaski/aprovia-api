import { TokenModel as PrismaToken } from 'generated/prisma/models';
import { TokenEntity } from '../../domain/token.entity';

export class TokenMapper {
  static toDomain(raw: PrismaToken): TokenEntity {
    const entity = new TokenEntity();
    entity.id = raw.id;
    entity.userId = raw.user_id;
    entity.type = raw.type;
    entity.value = raw.value;
    entity.referenceId = raw.reference_id;
    entity.expiresAt = raw.expires_at;
    entity.consumedAt = raw.consumed_at;
    entity.createdAt = raw.created_at;
    return entity;
  }

  static toPersistence(entity: TokenEntity) {
    return {
      id: entity.id,
      user_id: entity.userId,
      type: entity.type,
      value: entity.value,
      reference_id: entity.referenceId,
      expires_at: entity.expiresAt,
      consumed_at: entity.consumedAt,
    };
  }
}
