import { TokenType } from 'generated/prisma/enums';

const HOUR = 3600;
const DAY = 24 * HOUR;

export const TOKEN_TTL: Record<TokenType, number> = {
  EMAIL_VERIFICATION: 24 * HOUR,
  PASSWORD_RESET: 1 * HOUR,
  PASSWORD_CHANGE: 1 * HOUR,
  INVITE: 72 * HOUR,
  APPROVAL_ACTION: 7 * DAY,
  REFRESH_TOKEN: 7 * DAY,
};
