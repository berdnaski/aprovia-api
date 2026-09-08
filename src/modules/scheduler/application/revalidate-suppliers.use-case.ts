import { Injectable, Logger } from '@nestjs/common';
import { RegistrationStatus } from 'generated/prisma/enums';
import { RevalidateSupplierUseCase } from 'src/modules/suppliers/application/revalidate-supplier.use-case';
import { ISupplierRepository } from 'src/modules/suppliers/domain/suppliers.repository.interface';

const REVALIDATION_TTL_DAYS = 30;
const BATCH_SIZE = 40;
const PAUSE_BETWEEN_LOOKUPS_MS = 250;

export interface RevalidationSummary {
  checked: number;
  becameUnfit: number;
  failed: number;
}

@Injectable()
export class RevalidateSuppliersUseCase {
  private readonly logger = new Logger(RevalidateSuppliersUseCase.name);

  constructor(
    private readonly supplierRepository: ISupplierRepository,
    private readonly revalidateSupplierUseCase: RevalidateSupplierUseCase,
  ) {}

  async execute(now: Date = new Date()): Promise<RevalidationSummary> {
    const cutoff = new Date(
      now.getTime() - REVALIDATION_TTL_DAYS * 24 * 3600 * 1000,
    );

    const stale = await this.supplierRepository.listStaleValidations(
      cutoff,
      BATCH_SIZE,
    );

    const summary: RevalidationSummary = {
      checked: 0,
      becameUnfit: 0,
      failed: 0,
    };

    for (const supplier of stale) {
      const wasFit = supplier.registrationStatus === RegistrationStatus.ACTIVE;

      try {
        const refreshed = await this.revalidateSupplierUseCase.refresh(supplier);
        summary.checked += 1;

        if (
          wasFit &&
          refreshed.registrationStatus !== RegistrationStatus.ACTIVE
        ) {
          summary.becameUnfit += 1;
          this.logger.warn(
            `Fornecedor ${supplier.legalName} (CNPJ ${supplier.cnpj}) deixou de estar apto na Receita: ${refreshed.registrationStatus}.`,
          );
        }
      } catch (error) {
        summary.failed += 1;
        this.logger.error(
          `Falha ao revalidar o CNPJ ${supplier.cnpj}: ${(error as Error).message}`,
        );
      }

      await this.pause();
    }

    if (summary.checked > 0 || summary.failed > 0) {
      this.logger.log(
        `Revalidação de fornecedores: ${summary.checked} verificados, ${summary.becameUnfit} deixaram de estar aptos, ${summary.failed} falharam.`,
      );
    }

    return summary;
  }

  private pause(): Promise<void> {
    return new Promise((resolve) =>
      setTimeout(resolve, PAUSE_BETWEEN_LOOKUPS_MS),
    );
  }
}
