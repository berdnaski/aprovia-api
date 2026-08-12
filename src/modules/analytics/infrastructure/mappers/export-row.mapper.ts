import { RequestStatus } from 'generated/prisma/enums';
import { ExportRequestRow } from '../../domain/export-rows.repository.interface';

interface RawExportRow {
  number: string;
  status: RequestStatus;
  title: string;
  total_amount_cents: bigint;
  created_at: Date;
  submitted_at: Date | null;
  finalized_at: Date | null;
  cost_center: { name: string };
  category: { name: string } | null;
  supplier: { legal_name: string; cnpj: string } | null;
  requester: { user: { name: string } };
}

export class ExportRowMapper {
  static toDomain(this: void, raw: RawExportRow): ExportRequestRow {
    return {
      number: raw.number,
      status: raw.status,
      title: raw.title,
      costCenterName: raw.cost_center.name,
      categoryName: raw.category?.name ?? null,
      supplierName: raw.supplier?.legal_name ?? null,
      supplierCnpj: raw.supplier?.cnpj ?? null,
      requesterName: raw.requester.user.name,
      totalAmountCents: raw.total_amount_cents,
      createdAt: raw.created_at,
      submittedAt: raw.submitted_at,
      finalizedAt: raw.finalized_at,
    };
  }
}
