export class UserEntity {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  passwordHash: string | null;
  emailVerified: boolean;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
  termsAcceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  disabledAt: Date | null;
}
