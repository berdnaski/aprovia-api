import { Injectable } from '@nestjs/common';
import {
  AuditEventType,
  CompanyMemberRole,
  RequestStatus,
} from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { FindCategoryByIdUseCase } from 'src/modules/categories/application/find-category-by-id.use-case';
import { IChartAccountRepository } from 'src/modules/chart-accounts/domain/chart-accounts.repository.interface';
import { assertAcceptsPurchases } from 'src/modules/chart-accounts/domain/services/chart-account-rules';
import { FindCostCenterByIdUseCase } from 'src/modules/cost-centers/application/find-cost-center-by-id.use-case';
import {
  NotFoundError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';
import {
  ITransactionManager,
  TransactionContext,
} from 'src/shared/domain/transaction.manager';
import { PurchaseRequestEntity } from '../domain/purchase-request.entity';
import {
  AllocationForbiddenError,
  AllocationLockedError,
} from '../domain/purchase-requests.errors';
import { IRequestAllocationRepository } from '../domain/request-allocations.repository.interface';
import {
  AllocatedAmount,
  AllocationShare,
  allocate,
  assertValidAllocation,
  FULL_SHARE_BPS,
  sameSplit,
} from '../domain/services/allocation-split';
import { ReplaceAllocationsDto } from '../dto/replace-allocations.dto';
import {
  FindRequestByIdUseCase,
  RequestActor,
} from './find-request-by-id.use-case';

export interface RequestAllocations {
  custom: boolean;
  lines: AllocatedAmount[];
}

const RECLASSIFIABLE: RequestStatus[] = [
  RequestStatus.PENDING,
  RequestStatus.APPROVED,
  RequestStatus.COMPLETED,
];

function describe(lines: AllocationShare[]): string {
  return lines
    .map(
      (line) =>
        `${line.costCenterId}:${line.shareBps}:${line.chartAccountId ?? '-'}`,
    )
    .join(';');
}

@Injectable()
export class ManageRequestAllocationsUseCase {
  constructor(
    private readonly requestAllocationRepository: IRequestAllocationRepository,
    private readonly findRequestByIdUseCase: FindRequestByIdUseCase,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
    private readonly chartAccountRepository: IChartAccountRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async list(
    requestId: string,
    actor: RequestActor,
  ): Promise<RequestAllocations> {
    const request = await this.findRequestByIdUseCase.execute(requestId, actor);
    return this.effectiveFor(request);
  }

  async effectiveFor(
    request: PurchaseRequestEntity,
    context?: TransactionContext,
  ): Promise<RequestAllocations> {
    const { custom, shares } = await this.sharesFor(request, context);

    return {
      custom,
      lines: allocate(request.totalAmountCents, shares),
    };
  }

  async sharesFor(
    request: PurchaseRequestEntity,
    context?: TransactionContext,
  ): Promise<{ custom: boolean; shares: AllocationShare[] }> {
    const stored = await this.requestAllocationRepository.listByRequest(
      request.id,
      context,
    );

    if (stored.length > 0) {
      return {
        custom: true,
        shares: stored.map((line) => ({
          costCenterId: line.costCenterId,
          chartAccountId: line.chartAccountId,
          shareBps: line.shareBps,
        })),
      };
    }

    if (!request.costCenterId) {
      return { custom: false, shares: [] };
    }

    const category = request.categoryId
      ? await this.findCategoryByIdUseCase.execute(
          request.categoryId,
          request.companyId,
          context,
        )
      : null;

    return {
      custom: false,
      shares: [
        {
          costCenterId: request.costCenterId,
          chartAccountId: category?.defaultAccountId ?? null,
          shareBps: FULL_SHARE_BPS,
        },
      ],
    };
  }

  async replace(
    requestId: string,
    actor: RequestActor,
    data: ReplaceAllocationsDto,
  ): Promise<RequestAllocations> {
    const request = await this.findRequestByIdUseCase.execute(requestId, actor);
    const lines: AllocationShare[] = data.lines.map((line) => ({
      costCenterId: line.costCenterId,
      chartAccountId: line.chartAccountId ?? null,
      shareBps: line.shareBps,
    }));

    const editsDraft =
      request.isDraft || request.status === RequestStatus.CHANGES_REQUESTED;
    const isOwner = request.requesterId === actor.memberId;
    const isAdmin = actor.role === CompanyMemberRole.FINANCE_ADMIN;
    const current = await this.effectiveFor(request);

    if (!(editsDraft && isOwner)) {
      if (
        !isAdmin ||
        !(editsDraft || RECLASSIFIABLE.includes(request.status))
      ) {
        throw new AllocationForbiddenError();
      }

      if (!editsDraft && !sameSplit(current.lines, lines)) {
        throw new AllocationLockedError(request.number);
      }
    }

    if (!request.costCenterId) {
      throw new ValidationError(
        'Escolha o Centro de Custo do pedido antes de dividir o valor entre áreas.',
      );
    }

    assertValidAllocation(lines, request.costCenterId);
    await this.assertReferences(lines, request.companyId);

    return this.transactionManager.run(async (context) => {
      const stored = await this.requestAllocationRepository.replace(
        requestId,
        lines,
        context,
      );

      await this.auditLogRepository.record(
        {
          companyId: actor.companyId,
          actorId: actor.userId,
          eventType: AuditEventType.ALLOCATIONS_CHANGED,
          entityType: AuditEntity.PURCHASE_REQUEST,
          entityId: requestId,
          oldData: { number: request.number, lines: describe(current.lines) },
          newData: { number: request.number, lines: describe(lines) },
        },
        context,
      );

      return {
        custom: true,
        lines: allocate(
          request.totalAmountCents,
          stored.map((line) => ({
            costCenterId: line.costCenterId,
            chartAccountId: line.chartAccountId,
            shareBps: line.shareBps,
          })),
        ),
      };
    });
  }

  private async assertReferences(
    lines: AllocationShare[],
    companyId: string,
  ): Promise<void> {
    const costCenterIds = [...new Set(lines.map((line) => line.costCenterId))];

    for (const costCenterId of costCenterIds) {
      const costCenter = await this.findCostCenterByIdUseCase.execute(
        costCenterId,
        companyId,
      );

      if (costCenter.disabledAt) {
        throw new ValidationError(
          `O centro de custo ${costCenter.name} está inativo e não recebe rateio.`,
        );
      }
    }

    const accountIds = [
      ...new Set(
        lines
          .map((line) => line.chartAccountId)
          .filter((id): id is string => id !== null),
      ),
    ];
    const accounts = await this.chartAccountRepository.findByIds(
      companyId,
      accountIds,
    );

    for (const accountId of accountIds) {
      const account = accounts.find((item) => item.id === accountId);

      if (!account) {
        throw new NotFoundError('Conta contábil', accountId);
      }

      assertAcceptsPurchases(account);
    }
  }
}
