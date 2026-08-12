import { Injectable } from '@nestjs/common';
import { CompanyMemberRole, RequestStatus } from 'generated/prisma/enums';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { PurchaseRequestEntity } from '../domain/purchase-request.entity';
import { IPurchaseRequestRepository } from '../domain/purchase-requests.repository.interface';
import {
  resolveVisibility,
  VisibilityScope,
} from '../domain/services/request-visibility.service';
import { ListRequestsQueryDto } from '../dto/list-requests-query.dto';
import { RequestActor } from './find-request-by-id.use-case';

export const RequestView = {
  MINE: 'MINE',
  PENDING_FOR_ME: 'PENDING_FOR_ME',
  MY_COST_CENTERS: 'MY_COST_CENTERS',
  ALL: 'ALL',
} as const;

export type RequestView = (typeof RequestView)[keyof typeof RequestView];

@Injectable()
export class ListRequestsUseCase {
  constructor(
    private readonly purchaseRequestRepository: IPurchaseRequestRepository,
  ) {}

  execute(
    actor: RequestActor,
    view: RequestView,
    query: ListRequestsQueryDto,
  ): Promise<Page<PurchaseRequestEntity>> {
    const visibility = resolveVisibility(
      actor.memberId,
      actor.companyId,
      actor.role,
    );

    if (view === RequestView.MINE) {
      return this.purchaseRequestRepository.list({
        visibility: { ...visibility, scope: VisibilityScope.OWN },
        status: query.status,
        costCenterId: query.costCenterId,
        supplierId: query.supplierId,
        categoryId: query.categoryId,
        search: query.search,
        skip: query.skip,
        take: query.take,
      });
    }

    if (view === RequestView.PENDING_FOR_ME) {
      return this.purchaseRequestRepository.list({
        visibility,
        status: [RequestStatus.PENDING],
        costCenterId: query.costCenterId,
        supplierId: query.supplierId,
        categoryId: query.categoryId,
        search: query.search,
        skip: query.skip,
        take: query.take,
      });
    }

    if (
      view === RequestView.ALL &&
      actor.role !== CompanyMemberRole.FINANCE_ADMIN
    ) {
      return this.purchaseRequestRepository.list({
        visibility,
        status: query.status,
        costCenterId: query.costCenterId,
        supplierId: query.supplierId,
        categoryId: query.categoryId,
        search: query.search,
        skip: query.skip,
        take: query.take,
      });
    }

    return this.purchaseRequestRepository.list({
      visibility,
      status: query.status,
      costCenterId: query.costCenterId,
      supplierId: query.supplierId,
      categoryId: query.categoryId,
      search: query.search,
      skip: query.skip,
      take: query.take,
    });
  }
}
