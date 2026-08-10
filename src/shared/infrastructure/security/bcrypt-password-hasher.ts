import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { IPasswordHasher } from '../../domain/password-hasher.interface';

/** RNF05 — senha nunca em texto plano nem criptografia reversível. */
const SALT_ROUNDS = 12;

@Injectable()
export class BcryptPasswordHasher implements IPasswordHasher {
  hash(plainPassword: string): Promise<string> {
    return hash(plainPassword, SALT_ROUNDS);
  }

  /** bcrypt compara em tempo constante — não trocar por `===`. */
  compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return compare(plainPassword, passwordHash);
  }
}
