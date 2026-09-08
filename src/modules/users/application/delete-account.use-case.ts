import { Injectable, Logger } from '@nestjs/common';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { ICompanyMemberRepository } from 'src/modules/companies/domain/company-members.repository.interface';
import { LastAdminError } from 'src/modules/companies/domain/companies.errors';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import { StorageCleanupService } from 'src/shared/infrastructure/storage/storage-cleanup.service';
import { IUserRepository } from '../domain/users.repository.interface';

@Injectable()
export class DeleteAccountUseCase {
  private readonly logger = new Logger(DeleteAccountUseCase.name);

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly companyMemberRepository: ICompanyMemberRepository,
    private readonly storageCleanupService: StorageCleanupService,
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

    const storageKeys = await this.userRepository.collectStorageKeys(id);

    await this.userRepository.anonymize(id);

    const { orphaned } = await this.storageCleanupService.removeMany(
      storageKeys,
    );

    if (orphaned > 0) {
      this.logger.error(
        `Anonimização do usuário ${id}: ${orphaned} de ${storageKeys.length} objetos não foram removidos do storage e exigem remoção manual.`,
      );
    }
  }
}
