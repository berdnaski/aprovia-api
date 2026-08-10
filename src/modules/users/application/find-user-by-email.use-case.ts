import { Injectable } from '@nestjs/common';
import { UserEntity } from '../domain/user.entity';
import { IUserRepository } from '../domain/users.repository.interface';

@Injectable()
export class FindUserByEmailUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  execute(email: string): Promise<UserEntity | null> {
    return this.userRepository.findByEmail(email);
  }
}
