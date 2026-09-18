import { SupplierModel as PrismaSupplier } from 'generated/prisma/models';
import { SupplierEntity, SupplierPartner } from '../../domain/supplier.entity';

function partnersOf(value: unknown): SupplierPartner[] {
  return Array.isArray(value) ? (value as SupplierPartner[]) : [];
}

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
    entity.openedOn = raw.opened_on;
    entity.legalNature = raw.legal_nature;
    entity.companySize = raw.company_size;
    entity.shareCapitalCents = raw.share_capital_cents;
    entity.mainActivityCode = raw.main_activity_code;
    entity.mainActivityDescription = raw.main_activity_description;
    entity.simplesOpted = raw.simples_opted;
    entity.meiOpted = raw.mei_opted;
    entity.taxRegime = raw.tax_regime;
    entity.taxRegimeSource = raw.tax_regime_source;
    entity.stateRegistration = raw.state_registration;
    entity.municipalRegistration = raw.municipal_registration;
    entity.partners = partnersOf(raw.partners);
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;

    return entity;
  }
}
