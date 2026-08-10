import { Injectable } from '@nestjs/common';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import { IUserRepository } from '../domain/users.repository.interface';

@Injectable()
export class DeleteAccountUseCase {
  constructor(private readonly userRepository: IUserRepository) {}
  async execute(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundError('Usuário', id);
    }

    await this.userRepository.disable(id);
  }
}
