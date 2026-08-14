import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { formatCents } from 'src/shared/domain/money';

export class InvalidAmountRangeError extends ValidationError {
  constructor(minAmountCents: bigint, maxAmountCents: bigint) {
    super(
      `A faixa de ${formatCents(minAmountCents)} até ${formatCents(maxAmountCents)} está invertida: o valor final precisa ser maior que o inicial.`,
      {
        minAmountCents: minAmountCents.toString(),
        maxAmountCents: maxAmountCents.toString(),
      },
    );
  }
}

export class ApprovalMatrixEmptyError extends ValidationError {
  constructor() {
    super(
      'Informe ao menos uma faixa de valor para a matriz de alçadas. Sem faixas, nenhum pedido consegue ser roteado.',
    );
  }
}

export class ApprovalMatrixStartError extends ValidationError {
  constructor(firstMinAmountCents: bigint) {
    super(
      `A primeira faixa precisa começar em R$ 0,00, mas começa em ${formatCents(firstMinAmountCents)}. Pedidos abaixo desse valor ficariam sem aprovador.`,
      { firstMinAmountCents: firstMinAmountCents.toString() },
    );
  }
}

export class ApprovalMatrixGapError extends ValidationError {
  constructor(previousMaxAmountCents: bigint, nextMinAmountCents: bigint) {
    super(
      `Falta cobrir os valores entre ${formatCents(previousMaxAmountCents + 1n)} e ${formatCents(nextMinAmountCents - 1n)}. Pedidos nessa faixa ficariam sem aprovador.`,
      {
        previousMaxAmountCents: previousMaxAmountCents.toString(),
        nextMinAmountCents: nextMinAmountCents.toString(),
        expectedMinAmountCents: (previousMaxAmountCents + 1n).toString(),
      },
    );
  }
}

export class ApprovalMatrixOverlapError extends ValidationError {
  constructor(previousMaxAmountCents: bigint, nextMinAmountCents: bigint) {
    super(
      `Duas faixas cobrem os valores entre ${formatCents(nextMinAmountCents)} e ${formatCents(previousMaxAmountCents)}. Cada valor precisa pertencer a uma única faixa.`,
      {
        previousMaxAmountCents: previousMaxAmountCents.toString(),
        nextMinAmountCents: nextMinAmountCents.toString(),
      },
    );
  }
}

export class ApprovalMatrixOpenRangeError extends ValidationError {
  constructor() {
    super(
      'A última faixa precisa ficar sem teto, e apenas ela. Sem isso, pedidos de valor muito alto ficariam sem aprovador.',
    );
  }
}

export class NoApprovalRuleError extends ValidationError {
  constructor(amountCents: bigint) {
    super(
      `A matriz de alçadas não cobre pedidos de ${formatCents(amountCents)}. Peça ao Admin Financeiro para completar as faixas de valor.`,
      { amountCents: amountCents.toString() },
    );
  }
}
