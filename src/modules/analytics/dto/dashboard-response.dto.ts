import { ApiProperty } from '@nestjs/swagger';
import { RequestStatus } from 'generated/prisma/enums';
import { DashboardMetrics } from '../domain/metrics';

class StatusTotalDto {
  @ApiProperty({ enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] })
  status: RequestStatus;

  @ApiProperty()
  total: number;

  @ApiProperty({ type: String })
  amountCents: string;
}

class CostCenterConsumptionDto {
  @ApiProperty({ format: 'uuid' })
  costCenterId: string;

  @ApiProperty()
  costCenterName: string;

  @ApiProperty({ type: String })
  budgetCents: string;

  @ApiProperty({ type: String })
  committedCents: string;

  @ApiProperty({ type: String })
  availableCents: string;

  @ApiProperty({ example: 82.5 })
  usagePercent: number;
}

class ApproverPerformanceDto {
  @ApiProperty({ format: 'uuid' })
  memberId: string;

  @ApiProperty()
  approverName: string;

  @ApiProperty()
  decisions: number;

  @ApiProperty({ example: 18.4 })
  averageHours: number;
}

class CostCenterCycleTimeDto {
  @ApiProperty({ format: 'uuid' })
  costCenterId: string;

  @ApiProperty()
  costCenterName: string;

  @ApiProperty()
  finalized: number;

  @ApiProperty({ example: 42.1 })
  averageHours: number;
}

class BottleneckDto {
  @ApiProperty({ format: 'uuid' })
  memberId: string;

  @ApiProperty()
  approverName: string;

  @ApiProperty()
  waiting: number;

  @ApiProperty({ nullable: true, type: Date })
  oldestSince: Date | null;

  @ApiProperty({ type: String })
  amountCents: string;
}

class RepeatedRequestDto {
  @ApiProperty()
  requesterName: string;

  @ApiProperty()
  supplierName: string;

  @ApiProperty({ type: String })
  amountCents: string;

  @ApiProperty()
  occurrences: number;

  @ApiProperty()
  lastAt: Date;
}

export class DashboardResponseDto {
  @ApiProperty()
  from: Date;

  @ApiProperty()
  to: Date;

  @ApiProperty({ type: [StatusTotalDto] })
  totals: StatusTotalDto[];

  @ApiProperty({ type: [CostCenterConsumptionDto] })
  consumption: CostCenterConsumptionDto[];

  @ApiProperty({ type: [ApproverPerformanceDto] })
  approvers: ApproverPerformanceDto[];

  @ApiProperty({ type: [CostCenterCycleTimeDto] })
  costCenters: CostCenterCycleTimeDto[];

  @ApiProperty({ type: [BottleneckDto] })
  bottlenecks: BottleneckDto[];

  @ApiProperty({ type: [RepeatedRequestDto] })
  repeated: RepeatedRequestDto[];

  static fromDomain(
    this: void,
    metrics: DashboardMetrics,
  ): DashboardResponseDto {
    const dto = new DashboardResponseDto();

    dto.from = metrics.from;
    dto.to = metrics.to;
    dto.totals = metrics.totals.map((total) => ({
      status: total.status,
      total: total.total,
      amountCents: total.amountCents.toString(),
    }));
    dto.consumption = metrics.consumption.map((item) => ({
      costCenterId: item.costCenterId,
      costCenterName: item.costCenterName,
      budgetCents: item.budgetCents.toString(),
      committedCents: item.committedCents.toString(),
      availableCents: item.availableCents.toString(),
      usagePercent: item.usagePercent,
    }));
    dto.approvers = metrics.approvers;
    dto.costCenters = metrics.costCenters;
    dto.bottlenecks = metrics.bottlenecks.map((item) => ({
      memberId: item.memberId,
      approverName: item.approverName,
      waiting: item.waiting,
      oldestSince: item.oldestSince,
      amountCents: item.amountCents.toString(),
    }));
    dto.repeated = metrics.repeated.map((item) => ({
      requesterName: item.requesterName,
      supplierName: item.supplierName,
      amountCents: item.amountCents.toString(),
      occurrences: item.occurrences,
      lastAt: item.lastAt,
    }));

    return dto;
  }
}
