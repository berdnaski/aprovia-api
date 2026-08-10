import { Injectable } from '@nestjs/common';
import { IPasswordHasher } from 'src/shared/domain/password-hasher.interface';

@Injectable()
export class ValidatePasswordUseCase {
  constructor(private readonly passwordHasher: IPasswordHasher) {}

  execute(plainPassword: string, passwordHash: string): Promise<boolean> {
    return this.passwordHasher.compare(plainPassword, passwordHash);
  }
}
