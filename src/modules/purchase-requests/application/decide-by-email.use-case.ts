import { Injectable } from '@nestjs/common';
import { DecisionChannel, DecisionType } from 'generated/prisma/enums';
import { ITokensRepository } from 'src/modules/auth/domain/tokens.repository.interface';
import { InvalidStateError } from 'src/shared/domain/errors/domain.error';
import { DecideByEmailDto } from '../dto/decide-by-email.dto';
import { DecideRequestUseCase } from './decide-request.use-case';
import {
  EmailApprovalView,
  GetEmailApprovalUseCase,
} from './get-email-approval.use-case';

@Injectable()
export class DecideByEmailUseCase {
  constructor(
    private readonly getEmailApprovalUseCase: GetEmailApprovalUseCase,
    private readonly decideRequestUseCase: DecideRequestUseCase,
    private readonly tokensRepository: ITokensRepository,
  ) {}

  async execute(
    token: string,
    data: DecideByEmailDto,
  ): Promise<EmailApprovalView> {
    const { view, grant } = await this.getEmailApprovalUseCase.execute(token);

    if (!grant) {
      throw new InvalidStateError(
        view.reason ?? 'Este link de aprovação não está mais disponível',
        { number: view.number, status: view.status },
      );
    }

    const consumed = await this.tokensRepository.consume(grant.tokenId);

    if (!consumed) {
      throw new InvalidStateError(
        'Este link já foi usado. Cada e-mail de aprovação vale uma única decisão',
        { number: view.number },
      );
    }

    const decided = await this.decideRequestUseCase
      .execute(grant.requestId, grant.actor, {
        type: data.type,
        justification: data.justification,
        channel: DecisionChannel.EMAIL,
      })
      .catch(async (error: unknown) => {
        await this.tokensRepository.release(grant.tokenId);
        throw error;
      });

    return {
      ...view,
      status: decided.status,
      actionable: false,
      reason:
        data.type === DecisionType.APPROVED
          ? `Aprovação registrada para o pedido ${decided.number}.`
          : `Rejeição registrada para o pedido ${decided.number}.`,
    };
  }
}
