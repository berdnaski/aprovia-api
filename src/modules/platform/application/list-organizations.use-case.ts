import { Injectable } from '@nestjs/common';
import { OnboardingStep } from 'generated/prisma/enums';
import { SubscriptionWithPlan } from 'src/modules/billing/domain/plan.entity';
import { ISubscriptionRepository } from 'src/modules/billing/domain/plans.repository.interface';
import { ISeatUsageRepository } from 'src/modules/billing/domain/seat-usage.repository.interface';
import { Page, PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { IOrganizationReader } from '../domain/organization.reader';

export interface OrganizationSummary {
  companyId: string;
  legalName: string;
  tradeName: string | null;
  cnpj: string;
  onboardingStep: OnboardingStep;
  disabledAt: Date | null;
  createdAt: Date;
  subscription: SubscriptionWithPlan | null;
  usedSeats: number;
}

@Injectable()
export class ListOrganizationsUseCase {
  constructor(
    private readonly organizationReader: IOrganizationReader,
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly seatUsageRepository: ISeatUsageRepository,
  ) {}

  async execute(
    query: PaginationQueryDto,
    search?: string,
  ): Promise<Page<OrganizationSummary>> {
    const page = await this.organizationReader.list({
      search,
      skip: query.skip,
      take: query.take,
    });

    const items = await Promise.all(
      page.items.map(async (company) => ({
        ...company,
        subscription: await this.subscriptionRepository.findActiveByCompany(
          company.companyId,
        ),
        usedSeats: await this.seatUsageRepository.countOccupiedSeats(
          company.companyId,
        ),
      })),
    );

    return { ...page, items };
  }
}
