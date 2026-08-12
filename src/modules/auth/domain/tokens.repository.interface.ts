import { TokenType } from 'generated/prisma/enums';
import { TokenEntity } from './token.entity';

export abstract class ITokensRepository {
  abstract create(data: {
    userId: string | null;
    type: TokenType;
    value: string;
    referenceId?: string | null;
    expiresAt: Date;
  }): Promise<TokenEntity>;

  abstract findValidByValue(
    value: string,
    type: TokenType,
  ): Promise<TokenEntity | null>;

  abstract findByValue(
    value: string,
    type: TokenType,
  ): Promise<TokenEntity | null>;

  abstract consume(id: string): Promise<boolean>;

  abstract release(id: string): Promise<void>;

  abstract deleteByUserAndType(userId: string, type: TokenType): Promise<void>;

  abstract consumeByReferences(
    referenceIds: string[],
    type: TokenType,
  ): Promise<number>;

  abstract deleteExpired(): Promise<number>;
}
