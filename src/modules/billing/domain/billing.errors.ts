import { ForbiddenError } from 'src/shared/domain/errors/domain.error';

const FEATURE_LABELS: Record<string, string> = {
  'ai-extraction': 'Extração assistida por IA',
  'email-approval': 'Aprovação por e-mail',
  'advanced-reports': 'Relatórios avançados',
};

export class FeatureNotInPlanError extends ForbiddenError {
  constructor(feature: string) {
    super(
      `${FEATURE_LABELS[feature] ?? feature} não está incluída no plano contratado`,
      { feature },
    );
  }
}

export class NoActiveSubscriptionError extends ForbiddenError {
  constructor() {
    super(
      'A organização está sem assinatura ativa. A consulta ao histórico e a exportação seguem liberadas; criar e aprovar pedidos exige renovar o plano',
    );
  }
}

export class MemberLimitReachedError extends ForbiddenError {
  constructor(used: number, max: number) {
    super(
      `O plano contratado permite ${max} membro(s) e a organização já usa ${used}. Inative alguém ou faça upgrade para convidar mais pessoas`,
      { used, max },
    );
  }
}

export class StorageQuotaExceededError extends ForbiddenError {
  constructor(usedBytes: bigint, maxBytes: bigint) {
    super(
      `O armazenamento do plano foi esgotado: ${Math.round(Number(usedBytes) / 1048576)} MB de ${Math.round(Number(maxBytes) / 1048576)} MB em uso`,
      {
        usedBytes: usedBytes.toString(),
        maxBytes: maxBytes.toString(),
      },
    );
  }
}
