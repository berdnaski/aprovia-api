import { AuditEventType } from 'generated/prisma/enums';

export const AuditEntity = {
  PURCHASE_REQUEST: 'purchase_request',
  APPROVAL_RULE: 'approval_rule',
  BUDGET: 'budget',
  COMPANY_MEMBER: 'company_member',
  COST_CENTER: 'cost_center',
  SUPPLIER: 'supplier',
} as const;

export type AuditEntity = (typeof AuditEntity)[keyof typeof AuditEntity];

export type AuditValue = string | number | boolean | null;

export interface AuditLogEntity {
  id: string;
  companyId: string;
  actorId: string | null;
  eventType: AuditEventType;
  entityType: string;
  entityId: string;
  oldData: Readonly<Record<string, AuditValue>> | null;
  newData: Readonly<Record<string, AuditValue>> | null;
  ipAddress: string | null;
  occurredAt: Date;
}
