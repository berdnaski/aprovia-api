import { Injectable } from '@nestjs/common';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import { UserEntity } from '../domain/user.entity';
import { IUserRepository } from '../domain/users.repository.interface';

@Injectable()
export class FindUserByIdUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundError('Usuário', id);
    }

    return user;
  }
}
