import { ApiProperty } from '@nestjs/swagger';
import { PlanTier, SubscriptionStatus } from 'generated/prisma/enums';
import { PlanEntity } from '../domain/plan.entity';
import { SubscriptionUsage } from '../application/get-subscription-usage.use-case';

export class PlanResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Profissional' })
  name: string;

  @ApiProperty({ enum: ['BASIC', 'PROFESSIONAL', 'ENTERPRISE'] })
  tier: PlanTier;

  @ApiProperty({ type: String, example: '29900' })
  priceCents: string;

  @ApiProperty({
    nullable: true,
    type: Number,
    description: 'Nulo é ilimitado.',
  })
  maxMembers: number | null;

  @ApiProperty({ nullable: true, type: Number })
  maxRequestsMonth: number | null;

  @ApiProperty({ nullable: true, type: String })
  maxStorageBytes: string | null;

  @ApiProperty({ type: [String], example: ['ai-extraction'] })
  features: string[];

  static fromEntity(this: void, entity: PlanEntity): PlanResponseDto {
    const dto = new PlanResponseDto();

    dto.id = entity.id;
    dto.name = entity.name;
    dto.tier = entity.tier;
    dto.priceCents = entity.priceCents.toString();
    dto.maxMembers = entity.maxMembers;
    dto.maxRequestsMonth = entity.maxRequestsMonth;
    dto.maxStorageBytes = entity.maxStorageBytes?.toString() ?? null;
    dto.features = [...entity.features];

    return dto;
  }
}

export class SubscriptionResponseDto {
  @ApiProperty({ nullable: true, type: PlanResponseDto })
  plan: PlanResponseDto | null;

  @ApiProperty({
    nullable: true,
    enum: ['ACTIVE', 'TRIALING', 'CANCELED', 'EXPIRED'],
  })
  status: SubscriptionStatus | null;

  @ApiProperty({
    nullable: true,
    type: Date,
    description: 'Data de renovação ou fim do teste (RF86).',
  })
  renewsAt: Date | null;

  @ApiProperty({
    type: [String],
    description: 'Já considera as exceções vigentes do SuperAdmin (RN51).',
  })
  features: string[];

  @ApiProperty({
    example: 7,
    description: 'Membros ativos e convites pendentes.',
  })
  usedSeats: number;

  @ApiProperty({ nullable: true, type: Number })
  maxMembers: number | null;

  @ApiProperty({ example: 42, description: 'Pedidos enviados no mês corrente.' })
  usedRequestsMonth: number;

  @ApiProperty({ type: Number, nullable: true })
  maxRequestsMonth: number | null;

  @ApiProperty()
  hasActiveSubscription: boolean;

  static fromUsage(
    this: void,
    usage: SubscriptionUsage,
  ): SubscriptionResponseDto {
    const dto = new SubscriptionResponseDto();

    dto.plan = usage.current
      ? PlanResponseDto.fromEntity(usage.current.plan)
      : null;
    dto.status = usage.current?.subscription.status ?? null;
    dto.renewsAt = usage.current?.subscription.periodEnd ?? null;
    dto.features = [...usage.entitlements.features];
    dto.usedSeats = usage.usedSeats;
    dto.maxMembers = usage.entitlements.maxMembers;
    dto.usedRequestsMonth = usage.usedRequestsMonth;
    dto.maxRequestsMonth = usage.entitlements.maxRequestsMonth;
    dto.hasActiveSubscription = usage.entitlements.hasActiveSubscription;

    return dto;
  }
}
