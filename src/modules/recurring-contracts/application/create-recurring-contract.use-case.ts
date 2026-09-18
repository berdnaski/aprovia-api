import { Injectable } from '@nestjs/common';
import { AuditEventType, RequestStatus } from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { assertAcceptsPurchases } from 'src/modules/chart-accounts/domain/services/chart-account-rules';
import { IChartAccountRepository } from 'src/modules/chart-accounts/domain/chart-accounts.repository.interface';
import { FindCategoryByIdUseCase } from 'src/modules/categories/application/find-category-by-id.use-case';
import { FindCostCenterByIdUseCase } from 'src/modules/cost-centers/application/find-cost-center-by-id.use-case';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { IPurchaseRequestRepository } from 'src/modules/purchase-requests/domain/purchase-requests.repository.interface';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { RecurringContractEntity } from '../domain/recurring-contract.entity';
import {
  RequestAlreadyHasContractError,
  RequestNotApprovedForContractError,
  RequestWithoutSupplierError,
} from '../domain/recurring-contracts.errors';
import { IRecurringContractRepository } from '../domain/recurring-contracts.repository.interface';
import { CreateRecurringContractDto } from '../dto/create-recurring-contract.dto';

@Injectable()
export class CreateRecurringContractUseCase {
  constructor(
    private readonly purchaseRequestRepository: IPurchaseRequestRepository,
    private readonly recurringContractRepository: IRecurringContractRepository,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
    private readonly chartAccountRepository: IChartAccountRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    requestId: string,
    actor: RequestActor,
    data: CreateRecurringContractDto,
  ): Promise<RecurringContractEntity> {
    const request = await this.purchaseRequestRepository.findById(requestId);

    if (!request || request.companyId !== actor.companyId) {
      throw new NotFoundError('Pedido', requestId);
    }

    if (request.status !== RequestStatus.APPROVED) {
      throw new RequestNotApprovedForContractError(request.number);
    }

    if (!request.supplierId) {
      throw new RequestWithoutSupplierError();
    }

    const existing =
      await this.recurringContractRepository.findBySourceRequestId(requestId);

    if (existing) {
      throw new RequestAlreadyHasContractError(request.number);
    }

    const costCenterId = data.costCenterId ?? request.costCenterId;
    const categoryId = data.categoryId ?? request.categoryId;

    await this.findCostCenterByIdUseCase.execute(costCenterId, actor.companyId);

    if (categoryId) {
      await this.findCategoryByIdUseCase.execute(categoryId, actor.companyId);
    }

    if (data.chartAccountId) {
      const account = await this.chartAccountRepository.findById(
        data.chartAccountId,
      );

      if (!account || account.companyId !== actor.companyId) {
        throw new NotFoundError('Conta contábil', data.chartAccountId);
      }

      assertAcceptsPurchases(account);
    }

    const startDate = data.startDate ? new Date(data.startDate) : new Date();
    const amountCents = data.amountCents
      ? BigInt(data.amountCents)
      : request.totalAmountCents;

    return this.transactionManager.run(async (context) => {
      const contract = await this.recurringContractRepository.create(
        {
          companyId: actor.companyId,
          sourceRequestId: requestId,
          supplierId: request.supplierId as string,
          costCenterId,
          categoryId: categoryId ?? null,
          chartAccountId: data.chartAccountId ?? null,
          title: request.title,
          amountCents,
          frequency: data.frequency,
          startDate,
          nextOccurrenceDate: startDate,
          createdById: actor.memberId,
        },
        context,
      );

      await this.auditLogRepository.record(
        {
          companyId: actor.companyId,
          actorId: actor.userId,
          eventType: AuditEventType.RECURRING_CONTRACT_CREATED,
          entityType: AuditEntity.RECURRING_CONTRACT,
          entityId: contract.id,
          newData: {
            sourceRequestNumber: request.number,
            frequency: contract.frequency,
            amountCents: contract.amountCents.toString(),
          },
        },
        context,
      );

      return contract;
    });
  }
}
