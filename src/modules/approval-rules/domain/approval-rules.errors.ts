import { ValidationError } from 'src/shared/domain/errors/domain.error';

export class InvalidAmountRangeError extends ValidationError {
  constructor(minAmountCents: bigint, maxAmountCents: bigint) {
    super('O valor final da faixa deve ser maior que o inicial', {
      minAmountCents: minAmountCents.toString(),
      maxAmountCents: maxAmountCents.toString(),
    });
  }
}

export class ApprovalMatrixEmptyError extends ValidationError {
  constructor() {
    super('A matriz global precisa ter ao menos uma faixa');
  }
}

export class ApprovalMatrixStartError extends ValidationError {
  constructor(firstMinAmountCents: bigint) {
    super('A primeira faixa da matriz precisa começar em zero', {
      firstMinAmountCents: firstMinAmountCents.toString(),
    });
  }
}

export class ApprovalMatrixGapError extends ValidationError {
  constructor(previousMaxAmountCents: bigint, nextMinAmountCents: bigint) {
    super(
      `Há um buraco na matriz entre ${previousMaxAmountCents.toString()} e ${nextMinAmountCents.toString()} centavos`,
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
      `As faixas se sobrepõem entre ${nextMinAmountCents.toString()} e ${previousMaxAmountCents.toString()} centavos`,
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
      'Apenas a última faixa da matriz pode ser sem teto, e ela é obrigatória',
    );
  }
}

export class NoApprovalRuleError extends ValidationError {
  constructor(amountCents: bigint) {
    super(
      `Nenhuma faixa da matriz de alçadas cobre o valor de ${amountCents.toString()} centavos`,
      { amountCents: amountCents.toString() },
    );
  }
}
