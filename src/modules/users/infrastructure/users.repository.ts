import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { UserEntity } from '../domain/user.entity';
import {
  CreateUserData,
  IUserRepository,
} from '../domain/users.repository.interface';
import { UserMapper } from './mappers/user.mapper';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserData): Promise<UserEntity> {
    const record = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password_hash: data.passwordHash,
        phone: data.phone,
        terms_accepted_at: data.termsAcceptedAt,
      },
    });

    return UserMapper.toDomain(record);
  }

  async list(): Promise<UserEntity[]> {
    const records = await this.prisma.user.findMany();
    return records.map(UserMapper.toDomain);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findUnique({
      where: { email },
    });

    return record ? UserMapper.toDomain(record) : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findUnique({
      where: { id },
    });

    return record ? UserMapper.toDomain(record) : null;
  }

  async markEmailAsVerified(id: string): Promise<UserEntity> {
    const record = await this.prisma.user.update({
      where: { id },
      data: { email_verified: true },
    });

    return UserMapper.toDomain(record);
  }

  async changePassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { password_hash: passwordHash },
    });
  }

  async acceptTerms(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { terms_accepted_at: new Date() },
    });
  }

  async updateProfile(
    id: string,
    data: { name?: string; phone?: string | null; avatarUrl?: string | null },
  ): Promise<UserEntity> {
    const record = await this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        avatar_url: data.avatarUrl,
      },
    });

    return UserMapper.toDomain(record);
  }

  async disable(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { disabled_at: new Date() },
    });
  }
}
