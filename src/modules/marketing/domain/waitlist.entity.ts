export class WaitlistEntryEntity {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  invitedAt: Date | null;
  createdAt: Date;
}
