import { ForbiddenError } from 'src/shared/domain/errors/domain.error';

const FEATURE_LABELS: Record<string, string> = {
  'ai-extraction': 'Extração assistida por IA',
  'email-approval': 'Aprovação por e-mail',
  'advanced-reports': 'Relatórios avançados',
};

export class FeatureNotInPlanError extends ForbiddenError {
  constructor(feature: string) {
    super(
      `O recurso "${FEATURE_LABELS[feature] ?? feature}" não faz parte do plano atual da empresa. Faça upgrade do plano para liberá-lo.`,
      { feature },
    );
  }
}

export class NoActiveSubscriptionError extends ForbiddenError {
  constructor() {
    super(
      'A assinatura da empresa não está ativa. Consultar o histórico e exportar dados continua liberado, mas criar e aprovar pedidos exige renovar o plano.',
    );
  }
}

export class MemberLimitReachedError extends ForbiddenError {
  constructor(used: number, max: number) {
    super(
      `A empresa já usa ${used} das ${max} vagas de membro do plano atual. Inative alguém que não usa mais o sistema ou faça upgrade para convidar mais pessoas.`,
      { used, max },
    );
  }
}

export class StorageQuotaExceededError extends ForbiddenError {
  constructor(usedBytes: bigint, maxBytes: bigint) {
    super(
      `O espaço para anexos do plano acabou: ${Math.round(Number(usedBytes) / 1048576)} MB de ${Math.round(Number(maxBytes) / 1048576)} MB em uso. Apague anexos antigos ou faça upgrade do plano.`,
      {
        usedBytes: usedBytes.toString(),
        maxBytes: maxBytes.toString(),
      },
    );
  }
}
