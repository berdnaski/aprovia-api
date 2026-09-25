import {
  DomainError,
  DomainErrorKind,
} from 'src/shared/domain/errors/domain.error';
import { formatCents } from 'src/shared/domain/money';

export class RoutingError extends DomainError {
  readonly kind: DomainErrorKind = 'INVALID_STATE';
}

export class NoMatchingRuleError extends RoutingError {
  constructor(amountCents: bigint) {
    super(
      `A matriz de alçadas não cobre pedidos de ${formatCents(amountCents)}. Peça ao Admin Financeiro para completar as faixas de valor.`,
      { amountCents: amountCents.toString(), rule: 'RN24' },
    );
  }
}

export class NoEligibleApproverError extends RoutingError {
  constructor(amountCents?: bigint) {
    const amount = amountCents ? ` de ${formatCents(amountCents)}` : '';

    super(
      `Ninguém da empresa pode aprovar este pedido${amount}. Quem pede não aprova o próprio pedido, então é preciso ter outro Aprovador ou Admin Financeiro cadastrado.`,
      {
        ...(amountCents && { amountCents: amountCents.toString() }),
        rule: 'RN27',
      },
    );
  }
}

export class NoSecondApproverError extends RoutingError {
  constructor(amountCents: bigint) {
    super(
      `Esta faixa exige duas assinaturas, mas só existe uma pessoa que pode aprovar ${formatCents(amountCents)}. Cadastre outro Aprovador com alçada suficiente, ou deixe a faixa com uma assinatura.`,
      { amountCents: amountCents.toString(), rule: 'RN26' },
    );
  }
}
