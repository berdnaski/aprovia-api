import { OnboardingStep } from 'generated/prisma/enums';

export class CompanyEntity {
  id: string;
  legalName: string;
  tradeName: string | null;
  cnpj: string;
  industry: string | null;
  companySize: string | null;
  onboardingStep: OnboardingStep;
  onboardingCompletedAt: Date | null;
  overrunTolerancePercent: number;
  reminderHours: number;
  escalationHours: number;
  dualApprovalThresholdCents: bigint | null;
  priceTolerancePercent: number;
  quantityTolerancePercent: number;
  requiresReceiptBeforeInvoice: boolean;
  autoReleaseOnMatch: boolean;
  matchRequiredAboveCents: bigint | null;
  poNumberPrefix: string;
  createdAt: Date;
  updatedAt: Date;
  disabledAt: Date | null;
}
