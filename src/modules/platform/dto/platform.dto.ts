import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsDefined,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  OnboardingStep,
  PlanTier,
  SubscriptionStatus,
} from 'generated/prisma/enums';
import { PlanResponseDto } from 'src/modules/billing/dto/subscription-response.dto';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { OrganizationSummary } from '../application/list-organizations.use-case';

export class ListOrganizationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Razão social, nome fantasia ou CNPJ.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class AssignPlanDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  planId: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'TRIALING'] })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiPropertyOptional({ example: '2027-01-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  periodEnd?: Date;

  @ApiPropertyOptional({
    description: 'Preço negociado, quando difere do de tabela.',
  })
  @IsOptional()
  @Type(() => BigInt)
  contractedPriceCents?: bigint;
}

export class GrantFeatureOverrideDto {
  @ApiProperty({ type: [String], example: ['ai-extraction'] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  features: string[];

  @ApiPropertyOptional({
    description: 'Vencida a data, o plano volta a valer sozinho (RN51).',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;
}

export class OrganizationResponseDto {
  @ApiProperty({ format: 'uuid' })
  companyId: string;

  @ApiProperty()
  legalName: string;

  @ApiProperty({ nullable: true, type: String })
  tradeName: string | null;

  @ApiProperty()
  cnpj: string;

  @ApiProperty({ enum: ['ACCOUNT', 'COMPANY', 'TEAM', 'REVIEW', 'DONE'] })
  onboardingStep: OnboardingStep;

  @ApiProperty({ nullable: true, type: Date })
  disabledAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true, type: PlanResponseDto })
  plan: PlanResponseDto | null;

  @ApiProperty({
    nullable: true,
    enum: ['ACTIVE', 'TRIALING', 'CANCELED', 'EXPIRED'],
  })
  subscriptionStatus: SubscriptionStatus | null;

  @ApiProperty()
  usedSeats: number;

  static fromSummary(
    this: void,
    summary: OrganizationSummary,
  ): OrganizationResponseDto {
    const dto = new OrganizationResponseDto();

    dto.companyId = summary.companyId;
    dto.legalName = summary.legalName;
    dto.tradeName = summary.tradeName;
    dto.cnpj = summary.cnpj;
    dto.onboardingStep = summary.onboardingStep;
    dto.disabledAt = summary.disabledAt;
    dto.createdAt = summary.createdAt;
    dto.plan = summary.subscription
      ? PlanResponseDto.fromEntity(summary.subscription.plan)
      : null;
    dto.subscriptionStatus = summary.subscription?.subscription.status ?? null;
    dto.usedSeats = summary.usedSeats;

    return dto;
  }
}

export class PlatformSubscriptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  planId: string;

  @ApiProperty({ enum: ['ACTIVE', 'TRIALING', 'CANCELED', 'EXPIRED'] })
  status: SubscriptionStatus;

  @ApiProperty()
  periodStart: Date;

  @ApiProperty({ nullable: true, type: Date })
  periodEnd: Date | null;

  @ApiProperty({ type: [String] })
  featureOverrides: string[];

  @ApiProperty({ nullable: true, type: Date })
  overridesExpireAt: Date | null;
}

export class SeatLimitQueryDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxMembers?: number;
}

export class WritePlanDto {
  @ApiProperty({ example: 'Profissional', maxLength: 60 })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @ApiProperty({ enum: ['BASIC', 'PROFESSIONAL', 'ENTERPRISE'] })
  @IsEnum(PlanTier)
  tier: PlanTier;

  @ApiProperty({ type: String, example: '29900' })
  @IsDefined({ message: 'Informe o preço do plano.' })
  @Transform(({ value }: { value: string }) => BigInt(value))
  priceCents: bigint;

  @ApiPropertyOptional({ type: Number, nullable: true, description: 'Nulo é ilimitado.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxMembers?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRequestsMonth?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(({ value }: { value: string | null }) =>
    value === null || value === '' ? null : BigInt(value),
  )
  maxStorageBytes?: bigint | null;

  @ApiProperty({ type: [String], example: ['ai-extraction'] })
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdatePlanDto extends PartialType(
  OmitType(WritePlanDto, ['tier'] as const),
) {}

export class PlanUsageResponseDto extends PlanResponseDto {
  @ApiProperty({ example: 4, description: 'Organizações assinando este plano.' })
  subscriptions: number;

  @ApiProperty()
  active: boolean;
}

export class FeatureCatalogResponseDto {
  @ApiProperty({ example: 'ai-extraction' })
  key: string;

  @ApiProperty({ example: 'Extração assistida por IA' })
  label: string;
}

