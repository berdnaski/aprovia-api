import { Injectable } from '@nestjs/common';
import { ConflictError } from 'src/shared/domain/errors/domain.error';
import { IPasswordHasher } from 'src/shared/domain/password-hasher.interface';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { UserEntity } from '../domain/user.entity';
import { IUserRepository } from '../domain/users.repository.interface';

export interface CreateUserInput {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  termsAccepted?: boolean;
}

const EMAIL_IN_USE = 'O e-mail informado já está em uso';

@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
  ) { }

  async execute(data: CreateUserInput): Promise<UserEntity> {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictError(EMAIL_IN_USE);
    }

    const passwordHash = data.password
      ? await this.passwordHasher.hash(data.password)
      : null;

    try {
      return await this.userRepository.create({
        name: data.name,
        email: data.email,
        passwordHash,
        phone: data.phone,
        termsAcceptedAt: data.termsAccepted ? new Date() : null,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(EMAIL_IN_USE);
      }
      throw error;
    }
  }
}
