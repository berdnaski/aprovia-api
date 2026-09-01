import { ApiProperty } from '@nestjs/swagger';
import { OnboardingStep } from 'generated/prisma/enums';
import { CompanyEntity } from '../domain/company.entity';

export class CompanyResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Acme Indústria LTDA' })
  legalName: string;

  @ApiProperty({ nullable: true, type: String })
  tradeName: string | null;

  @ApiProperty({ example: '12345678000199' })
  cnpj: string;

  @ApiProperty({ nullable: true, type: String })
  industry: string | null;

  @ApiProperty({ nullable: true, type: String })
  companySize: string | null;

  @ApiProperty({ enum: ['ACCOUNT', 'COMPANY', 'TEAM', 'REVIEW', 'DONE'] })
  onboardingStep: OnboardingStep;

  @ApiProperty({ nullable: true, type: Date })
  onboardingCompletedAt: Date | null;

  @ApiProperty({ example: 5 })
  overrunTolerancePercent: number;

  @ApiProperty({ example: 24 })
  reminderHours: number;

  @ApiProperty({ example: 72 })
  escalationHours: number;

  @ApiProperty({ nullable: true, type: String })
  dualApprovalThresholdCents: string | null;

  @ApiProperty({
    example: 2,
    description: 'Tolerância de preço na conferência (RN46), em percentual.',
  })
  priceTolerancePercent: number;

  @ApiProperty({ example: 0, description: 'Tolerância de quantidade (RN46).' })
  quantityTolerancePercent: number;

  @ApiProperty({ description: 'Exige recebimento antes de aceitar a nota.' })
  requiresReceiptBeforeInvoice: boolean;

  @ApiProperty({ description: 'Libera o pagamento quando a conferência bate.' })
  autoReleaseOnMatch: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Acima deste valor em centavos a conferência de 3 vias é obrigatória.',
  })
  matchRequiredAboveCents: string | null;

  @ApiProperty({
    example: 'PO',
    description: 'Prefixo da numeração das ordens de compra.',
  })
  poNumberPrefix: string;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(entity: CompanyEntity): CompanyResponseDto {
    const dto = new CompanyResponseDto();
    dto.id = entity.id;
    dto.legalName = entity.legalName;
    dto.tradeName = entity.tradeName;
    dto.cnpj = entity.cnpj;
    dto.industry = entity.industry;
    dto.companySize = entity.companySize;
    dto.onboardingStep = entity.onboardingStep;
    dto.onboardingCompletedAt = entity.onboardingCompletedAt;
    dto.overrunTolerancePercent = entity.overrunTolerancePercent;
    dto.reminderHours = entity.reminderHours;
    dto.escalationHours = entity.escalationHours;
    dto.dualApprovalThresholdCents =
      entity.dualApprovalThresholdCents?.toString() ?? null;
    dto.priceTolerancePercent = entity.priceTolerancePercent;
    dto.quantityTolerancePercent = entity.quantityTolerancePercent;
    dto.requiresReceiptBeforeInvoice = entity.requiresReceiptBeforeInvoice;
    dto.autoReleaseOnMatch = entity.autoReleaseOnMatch;
    dto.matchRequiredAboveCents =
      entity.matchRequiredAboveCents === null
        ? null
        : entity.matchRequiredAboveCents.toString();
    dto.poNumberPrefix = entity.poNumberPrefix;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
