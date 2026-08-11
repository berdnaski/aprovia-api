import { Injectable } from '@nestjs/common';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { ICompanyMemberRepository } from 'src/modules/companies/domain/company-members.repository.interface';
import { LastAdminError } from 'src/modules/companies/domain/companies.errors';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import { IUserRepository } from '../domain/users.repository.interface';

@Injectable()
export class DeleteAccountUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly companyMemberRepository: ICompanyMemberRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundError('Usuário', id);
    }

    const membership = await this.companyMemberRepository.findActiveByUser(id);

    if (membership?.role === CompanyMemberRole.FINANCE_ADMIN) {
      const activeAdmins = await this.companyMemberRepository.countActiveAdmins(
        membership.companyId,
      );

      if (activeAdmins <= 1) {
        throw new LastAdminError();
      }
    }

    await this.userRepository.anonymize(id);
  }
}
