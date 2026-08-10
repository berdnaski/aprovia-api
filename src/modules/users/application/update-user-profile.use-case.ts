import { Injectable } from '@nestjs/common';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import { UserEntity } from '../domain/user.entity';
import { IUserRepository } from '../domain/users.repository.interface';

export interface UpdateUserProfileInput {
  name?: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

@Injectable()
export class UpdateUserProfileUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(
    id: string,
    input: UpdateUserProfileInput,
  ): Promise<UserEntity> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundError('Usuário', id);
    }

    return this.userRepository.updateProfile(id, {
      name: input.name?.trim(),
      phone: input.phone,
      avatarUrl: input.avatarUrl,
    });
  }
}
