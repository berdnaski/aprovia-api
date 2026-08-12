import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { IPasswordHasher } from '../../domain/password-hasher.interface';

const SALT_ROUNDS = 12;

@Injectable()
export class BcryptPasswordHasher implements IPasswordHasher {
  hash(plainPassword: string): Promise<string> {
    return hash(plainPassword, SALT_ROUNDS);
  }

  compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return compare(plainPassword, passwordHash);
  }
}
