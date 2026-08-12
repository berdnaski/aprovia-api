import { SupplierModel as PrismaSupplier } from 'generated/prisma/models';
import { SupplierEntity } from '../../domain/supplier.entity';

export class SupplierMapper {
  static toDomain(this: void, raw: PrismaSupplier): SupplierEntity {
    const entity = new SupplierEntity();

    entity.id = raw.id;
    entity.companyId = raw.company_id;
    entity.cnpj = raw.cnpj;
    entity.legalName = raw.legal_name;
    entity.tradeName = raw.trade_name;
    entity.registrationStatus = raw.registration_status;
    entity.validationStatus = raw.validation_status;
    entity.street = raw.street;
    entity.city = raw.city;
    entity.state = raw.state;
    entity.zipCode = raw.zip_code;
    entity.email = raw.email;
    entity.phone = raw.phone;
    entity.validatedAt = raw.validated_at;
    entity.blocked = raw.blocked;
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;

    return entity;
  }
}
