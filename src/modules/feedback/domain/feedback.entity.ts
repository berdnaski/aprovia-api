import { FeedbackKind, FeedbackStatus } from 'generated/prisma/enums';

export class FeedbackAuthor {
  id: string;
  name: string;
  email: string;
}

export class FeedbackCompany {
  id: string;
  name: string;
}

export class FeedbackEntity {
  id: string;
  companyId: string;
  kind: FeedbackKind;
  status: FeedbackStatus;
  message: string;
  route: string | null;
  userAgent: string | null;
  screenshotKey: string | null;
  screenshotMime: string | null;
  screenshotSizeBytes: number | null;
  internalNote: string | null;
  reply: string | null;
  repliedAt: Date | null;
  triagedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: FeedbackAuthor | null;
  triagedBy: FeedbackAuthor | null;
  company: FeedbackCompany | null;
}
