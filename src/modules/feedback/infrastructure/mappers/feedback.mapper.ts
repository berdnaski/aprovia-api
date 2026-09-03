import {
  FeedbackEntity,
  FeedbackAuthor,
  FeedbackCompany,
} from '../../domain/feedback.entity';

interface RawPerson {
  id: string;
  name: string;
  email: string;
}

interface RawCompany {
  id: string;
  legal_name: string;
  trade_name: string | null;
}

export interface RawFeedback {
  id: string;
  company_id: string;
  kind: FeedbackEntity['kind'];
  status: FeedbackEntity['status'];
  message: string;
  route: string | null;
  user_agent: string | null;
  screenshot_storage_key: string | null;
  screenshot_mime: string | null;
  screenshot_size_bytes: number | null;
  internal_note: string | null;
  reply: string | null;
  replied_at: Date | null;
  triaged_at: Date | null;
  created_at: Date;
  updated_at: Date;
  author?: RawPerson | null;
  triaged_by?: RawPerson | null;
  company?: RawCompany | null;
}

function person(raw: RawPerson | null | undefined): FeedbackAuthor | null {
  if (!raw) {
    return null;
  }

  return { id: raw.id, name: raw.name, email: raw.email };
}

function company(raw: RawCompany | null | undefined): FeedbackCompany | null {
  if (!raw) {
    return null;
  }

  return { id: raw.id, name: raw.trade_name ?? raw.legal_name };
}

export class FeedbackMapper {
  static toDomain(this: void, raw: RawFeedback): FeedbackEntity {
    const entity = new FeedbackEntity();

    entity.id = raw.id;
    entity.companyId = raw.company_id;
    entity.kind = raw.kind;
    entity.status = raw.status;
    entity.message = raw.message;
    entity.route = raw.route;
    entity.userAgent = raw.user_agent;
    entity.screenshotKey = raw.screenshot_storage_key;
    entity.screenshotMime = raw.screenshot_mime;
    entity.screenshotSizeBytes = raw.screenshot_size_bytes;
    entity.internalNote = raw.internal_note;
    entity.reply = raw.reply;
    entity.repliedAt = raw.replied_at;
    entity.triagedAt = raw.triaged_at;
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;
    entity.author = person(raw.author);
    entity.triagedBy = person(raw.triaged_by);
    entity.company = company(raw.company);

    return entity;
  }
}
