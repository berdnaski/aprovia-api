import { TokenType } from 'generated/prisma/enums';

export class TokenEntity {
  id: string;
  userId: string | null;
  type: TokenType;
  value: string;
  referenceId: string | null;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}
