export class RoutingError extends Error {
  constructor(
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NoMatchingRuleError extends RoutingError {
  constructor(amountCents: bigint) {
    super(
      `Nenhuma faixa da matriz de alçadas cobre ${amountCents.toString()} centavos. A matriz está incompleta`,
      { amountCents: amountCents.toString() },
    );
  }
}

export class RoutingCycleError extends RoutingError {
  constructor(memberId: string) {
    super(
      `Ciclo na hierarquia de aprovação ao passar por ${memberId}: a cadeia se repete`,
      { memberId },
    );
  }
}

export class NoEligibleApproverError extends RoutingError {
  constructor() {
    super(
      'A cadeia hierárquica se esgotou e não há Admin Financeiro para decidir em última instância (RN27)',
    );
  }
}
