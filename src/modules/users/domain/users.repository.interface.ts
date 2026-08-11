import { UserEntity } from './user.entity';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash?: string | null;
  phone?: string | null;
  termsAcceptedAt?: Date | null;
}

export abstract class IUserRepository {
  abstract create(data: CreateUserData): Promise<UserEntity>;
  abstract list(): Promise<UserEntity[]>;
  abstract findByEmail(email: string): Promise<UserEntity | null>;
  abstract findById(id: string): Promise<UserEntity | null>;

  abstract markEmailAsVerified(id: string): Promise<UserEntity>;
  abstract changePassword(id: string, passwordHash: string): Promise<void>;
  abstract acceptTerms(id: string): Promise<void>;

  abstract updateProfile(
    id: string,
    data: { name?: string; phone?: string | null; avatarUrl?: string | null },
  ): Promise<UserEntity>;

  abstract anonymize(id: string): Promise<void>;
}
