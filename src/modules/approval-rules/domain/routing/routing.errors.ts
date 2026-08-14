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

export class RoutingCycleError extends RoutingError {
  constructor(memberId: string) {
    super(
      'A hierarquia de aprovação está circular: alguém aparece duas vezes na cadeia de líderes. Peça ao Admin Financeiro para revisar quem reporta a quem.',
      { memberId, rule: 'RN24' },
    );
  }
}

export class NoEligibleApproverError extends RoutingError {
  constructor(amountCents?: bigint) {
    const amount = amountCents ? ` de ${formatCents(amountCents)}` : '';

    super(
      `Nenhum aprovador da empresa tem alçada para autorizar este pedido${amount}. Peça ao Admin Financeiro para aumentar os limites de aprovação ou definir seu líder direto.`,
      {
        ...(amountCents && { amountCents: amountCents.toString() }),
        rule: 'RN27',
      },
    );
  }
}
