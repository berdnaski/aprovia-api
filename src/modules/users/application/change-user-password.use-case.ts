import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../domain/users.repository.interface';

@Injectable()
export class ChangeUserPasswordUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  execute(id: string, passwordHash: string): Promise<void> {
    return this.userRepository.changePassword(id, passwordHash);
  }
}
