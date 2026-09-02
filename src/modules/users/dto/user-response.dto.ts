import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../domain/user.entity';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Erick Berdnaski' })
  name: string;

  @ApiProperty({ example: 'erick@empresa.com.br' })
  email: string;

  @ApiProperty({ nullable: true, type: String })
  phone: string | null;

  @ApiProperty({ nullable: true, type: String })
  avatarUrl: string | null;

  @ApiProperty()
  emailVerified: boolean;

  @ApiProperty()
  isSuperAdmin: boolean;

  @ApiProperty({ nullable: true, type: Date })
  termsAcceptedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(entity: UserEntity): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.email = entity.email;
    dto.phone = entity.phone;
    dto.avatarUrl =
      entity.avatarStorageKey === null ? null : `/api/users/${entity.id}/avatar`;
    dto.emailVerified = entity.emailVerified;
    dto.isSuperAdmin = entity.isSuperAdmin;
    dto.termsAcceptedAt = entity.termsAcceptedAt;
    dto.createdAt = entity.createdAt;
    return dto;
  }

  static fromEntities(entities: UserEntity[]): UserResponseDto[] {
    return entities.map((entity) => UserResponseDto.fromEntity(entity));
  }
}
