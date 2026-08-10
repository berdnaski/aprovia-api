import { Injectable } from '@nestjs/common';
import { UserEntity } from '../domain/user.entity';
import { IUserRepository } from '../domain/users.repository.interface';

@Injectable()
export class MarkEmailAsVerifiedUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  execute(id: string): Promise<UserEntity> {
    return this.userRepository.markEmailAsVerified(id);
  }
}
