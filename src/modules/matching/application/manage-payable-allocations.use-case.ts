import { Injectable } from '@nestjs/common';
import { AuditEventType, CompanyMemberRole } from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { IChartAccountRepository } from 'src/modules/chart-accounts/domain/chart-accounts.repository.interface';
import { assertAcceptsPurchases } from 'src/modules/chart-accounts/domain/services/chart-account-rules';
import { FindCostCenterByIdUseCase } from 'src/modules/cost-centers/application/find-cost-center-by-id.use-case';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import {
  allocate,
  AllocatedAmount,
  AllocationShare,
} from 'src/modules/purchase-requests/domain/services/allocation-split';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { PayableAllocationEntity } from '../domain/payable-allocation.entity';
import { IPayableAllocationRepository } from '../domain/payable-allocations.repository.interface';
import { assertValidPayableAllocation } from '../domain/services/payable-allocation-rules';
import { IPayableRepository } from '../domain/payables.repository.interface';
import { ReplacePayableAllocationsDto } from '../dto/replace-payable-allocations.dto';

@Injectable()
export class ManagePayableAllocationsUseCase {
  constructor(
    private readonly payableRepository: IPayableRepository,
    private readonly payableAllocationRepository: IPayableAllocationRepository,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
    private readonly chartAccountRepository: IChartAccountRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async list(
    payableId: string,
    actor: RequestActor,
  ): Promise<PayableAllocationEntity[]> {
    await this.findPayable(payableId, actor.companyId);

    return this.payableAllocationRepository.listByPayable(payableId);
  }

  async replace(
    payableId: string,
    actor: RequestActor,
    dto: ReplacePayableAllocationsDto,
  ): Promise<PayableAllocationEntity[]> {
    if (actor.role !== CompanyMemberRole.FINANCE_ADMIN) {
      throw new ForbiddenError(
        'Só o Admin Financeiro edita o rateio de uma conta a pagar.',
      );
    }

    const payable = await this.findPayable(payableId, actor.companyId);
    const shares: AllocationShare[] = dto.lines.map((line) => ({
      costCenterId: line.costCenterId,
      chartAccountId: line.chartAccountId ?? null,
      shareBps: line.shareBps,
    }));

    assertValidPayableAllocation(shares);
    await this.assertReferences(shares, actor.companyId);

    const lines: AllocatedAmount[] = allocate(payable.amountCents, shares);

    return this.transactionManager.run(async (context) => {
      const stored = await this.payableAllocationRepository.replace(
        payableId,
        lines,
        context,
      );

      await this.auditLogRepository.record(
        {
          companyId: actor.companyId,
          actorId: actor.userId,
          eventType: AuditEventType.ALLOCATIONS_CHANGED,
          entityType: AuditEntity.PAYABLE,
          entityId: payableId,
          newData: {
            lines: lines
              .map(
                (line) =>
                  `${line.costCenterId}:${line.amountCents.toString()}:${line.chartAccountId ?? '-'}`,
              )
              .join(';'),
          },
        },
        context,
      );

      return stored;
    });
  }

  private async findPayable(payableId: string, companyId: string) {
    const payable = await this.payableRepository.findById(payableId, companyId);

    if (!payable) {
      throw new NotFoundError('Conta a pagar', payableId);
    }

    return payable;
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
