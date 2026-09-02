import { UserModel as PrismaUser } from 'generated/prisma/models';
import { UserEntity } from '../../domain/user.entity';

export class UserMapper {
  static toDomain(this: void, raw: PrismaUser): UserEntity {
    const entity = new UserEntity();
    entity.id = raw.id;
    entity.name = raw.name;
    entity.email = raw.email;
    entity.phone = raw.phone;
    entity.passwordHash = raw.password_hash;
    entity.emailVerified = raw.email_verified;
    entity.avatarStorageKey = raw.avatar_storage_key;
    entity.isSuperAdmin = raw.is_super_admin;
    entity.termsAcceptedAt = raw.terms_accepted_at;
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;
    entity.disabledAt = raw.disabled_at;
    return entity;
  }

  static toPersistence(entity: UserEntity) {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      phone: entity.phone,
      password_hash: entity.passwordHash,
      email_verified: entity.emailVerified,
      avatar_storage_key: entity.avatarStorageKey,
      is_super_admin: entity.isSuperAdmin,
      terms_accepted_at: entity.termsAcceptedAt,
    };
  }
}
