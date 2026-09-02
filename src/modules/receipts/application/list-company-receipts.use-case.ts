import { Injectable } from '@nestjs/common';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { ReceiptEntity } from '../domain/receipt.entity';
import { IReceiptRepository } from '../domain/receipts.repository.interface';
import { ListReceiptsQueryDto } from '../dto/list-receipts-query.dto';

@Injectable()
export class ListCompanyReceiptsUseCase {
  constructor(private readonly receiptRepository: IReceiptRepository) {}

  async execute(
    actor: RequestActor,
    query: ListReceiptsQueryDto,
  ): Promise<Page<ReceiptEntity>> {
    const restricted = actor.role !== CompanyMemberRole.FINANCE_ADMIN;

    return this.receiptRepository.list({
      companyId: actor.companyId,
      ...(restricted ? { requesterId: actor.memberId } : {}),
      purchaseOrderId: query.purchaseOrderId,
      divergentOnly: query.divergentOnly,
      search: query.search,
      skip: query.skip,
      take: query.take,
      page: query.page,
      perPage: query.perPage,
    });
  }
}
