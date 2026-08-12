import { Injectable } from '@nestjs/common';
import { EntitlementsService } from 'src/modules/billing/application/entitlements.service';
import { FindMemberByIdUseCase } from 'src/modules/companies/application/find-member-by-id.use-case';
import { FindCostCenterByIdUseCase } from 'src/modules/cost-centers/application/find-cost-center-by-id.use-case';
import { ConflictError } from 'src/shared/domain/errors/domain.error';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { InviteEntity } from '../domain/invite.entity';
import { DuplicatePendingInviteError } from '../domain/invites.errors';
import { IInviteRepository } from '../domain/invites.repository.interface';
import { CreateInviteDto } from '../dto/create-invite.dto';
import { IMembershipReader } from '../domain/membership.reader';
import { SendInviteUseCase } from './send-invite.use-case';

@Injectable()
export class CreateInviteUseCase {
  constructor(
    private readonly inviteRepository: IInviteRepository,
    private readonly membershipReader: IMembershipReader,
    private readonly entitlementsService: EntitlementsService,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
    private readonly findMemberByIdUseCase: FindMemberByIdUseCase,
    private readonly sendInviteUseCase: SendInviteUseCase,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    companyId: string,
    invitedById: string,
    data: CreateInviteDto,
  ): Promise<InviteEntity> {
    const email = data.email.trim().toLowerCase();

    if (await this.membershipReader.isMember(companyId, email)) {
      throw new ConflictError(`${email} já é membro desta organização`);
    }

    if (data.defaultCostCenterId) {
      await this.findCostCenterByIdUseCase.execute(
        data.defaultCostCenterId,
        companyId,
      );
    }

    if (data.managerId) {
      await this.findMemberByIdUseCase.execute(data.managerId, companyId);
    }

    const invite = await this.transactionManager
      .run(async (context) => {
        await this.entitlementsService.assertSeatAvailable(companyId, context);

        return this.inviteRepository.create(
          {
            companyId,
            email,
            role: data.role,
            defaultCostCenterId: data.defaultCostCenterId ?? null,
            managerId: data.managerId ?? null,
            invitedById,
          },
          context,
        );
      })
      .catch((error: unknown) => {
        if (isUniqueViolation(error)) {
          throw new DuplicatePendingInviteError(email);
        }
        throw error;
      });

    await this.sendInviteUseCase.execute(invite);

    return invite;
  }
}
