import { RequestStatus } from 'generated/prisma/enums';
import { RequestVisibility } from 'src/modules/purchase-requests/domain/services/request-visibility.service';

export interface ExportRequestRow {
  number: string;
  status: RequestStatus;
  title: string;
  costCenterName: string;
  categoryName: string | null;
  supplierName: string | null;
  supplierCnpj: string | null;
  requesterName: string;
  totalAmountCents: bigint;
  createdAt: Date;
  submittedAt: Date | null;
  finalizedAt: Date | null;
}

export interface ExportRequestsFilter {
  visibility: RequestVisibility;
  status?: RequestStatus[];
  costCenterId?: string;
  supplierId?: string;
  categoryId?: string;
  from?: Date;
  to?: Date;
  limit: number;
}

export abstract class IExportRowsRepository {
  abstract countRequests(filter: ExportRequestsFilter): Promise<number>;

  abstract listRequests(
    filter: ExportRequestsFilter,
  ): Promise<ExportRequestRow[]>;
}
