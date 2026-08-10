import { Injectable } from '@nestjs/common';
import { ICompanyRepository } from '../domain/companies.repository.interface';
import { ICompanyMemberRepository } from '../domain/company-members.repository.interface';
import { MembershipEntity } from '../domain/membership.entity';

@Injectable()
export class FindActiveMembershipUseCase {
  constructor(
    private readonly companyMemberRepository: ICompanyMemberRepository,
    private readonly companyRepository: ICompanyRepository,
  ) {}

  async execute(userId: string): Promise<MembershipEntity | null> {
    const member = await this.companyMemberRepository.findActiveByUser(userId);

    if (!member) {
      return null;
    }

    const company = await this.companyRepository.findById(member.companyId);

    if (!company || company.disabledAt) {
      return null;
    }

    const membership = new MembershipEntity();
    membership.memberId = member.id;
    membership.companyId = company.id;
    membership.companyName = company.tradeName ?? company.legalName;
    membership.role = member.role;

    return membership;
  }
}
