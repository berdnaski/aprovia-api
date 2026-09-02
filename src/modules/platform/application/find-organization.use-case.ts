import { Injectable } from '@nestjs/common';
import { ISubscriptionRepository } from 'src/modules/billing/domain/plans.repository.interface';
import { ISeatUsageRepository } from 'src/modules/billing/domain/seat-usage.repository.interface';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import { IOrganizationReader } from '../domain/organization.reader';
import { OrganizationSummary } from './list-organizations.use-case';

@Injectable()
export class FindOrganizationUseCase {
  constructor(
    private readonly organizationReader: IOrganizationReader,
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly seatUsageRepository: ISeatUsageRepository,
  ) {}

  async execute(companyId: string): Promise<OrganizationSummary> {
    const company = await this.organizationReader.findById(companyId);

    if (!company) {
      throw new NotFoundError('Organização');
    }

    const [subscription, usedSeats] = await Promise.all([
      this.subscriptionRepository.findActiveByCompany(companyId),
      this.seatUsageRepository.countOccupiedSeats(companyId),
    ]);

    return { ...company, subscription, usedSeats };
  }
}
