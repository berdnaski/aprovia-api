import { DecisionType, NotificationEvent } from 'generated/prisma/enums';

const TIMEZONE = 'America/Sao_Paulo';

export interface NotificationMailActions {
  primary: { label: string; path: string };
  secondary: { label: string; path: string };
}

export interface NotificationContent {
  title: string;
  message: string;
  link: string | null;
  actionLabel: string | null;
  mailActions?: NotificationMailActions;
}

export interface NotificationParams {
  INVITE_RECEIVED: {
    companyName: string;
    inviterName: string;
    roleLabel: string;
    token: string;
  };
  REQUEST_PENDING: {
    requestId: string;
    number: string;
    requestTitle: string;
    amountCents: string;
    requesterName: string;
    approvalToken: string | null;
  };
  DECISION_MADE: {
    requestId: string;
    number: string;
    requestTitle: string;
    decision: DecisionType;
    deciderName: string;
    justification: string | null;
  };
  REQUEST_RETURNED: {
    requestId: string;
    number: string;
    requestTitle: string;
    deciderName: string;
    justification: string | null;
  };
  SLA_REMINDER: {
    requestId: string;
    number: string;
    requestTitle: string;
    amountCents: string;
    dueAt: string;
  };
  ESCALATED: {
    requestId: string;
    number: string;
    requestTitle: string;
    originalApproverName: string;
    escalatedToName: string;
  };
  BUDGET_ALERT: {
    costCenterId: string;
    costCenterName: string;
    thresholdPercent: number;
    period: string;
    totalCents: string;
    committedCents: string;
  };
  MONTHLY_REPORT: {
    costCenterId: string;
    costCenterName: string;
    period: string;
    approvedCount: number;
    totalCents: string;
  };
}

export type NotificationSpec = {
  [E in NotificationEvent]: { event: E; params: NotificationParams[E] };
}[NotificationEvent];

export function formatBrl(cents: string): string {
  const value = BigInt(cents);
  const negative = value < 0n;
  const absolute = negative ? -value : value;

  const units = (absolute / 100n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimals = (absolute % 100n).toString().padStart(2, '0');

  return `${negative ? '-' : ''}R$ ${units},${decimals}`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatPeriod(period: string): string {
  const [year, month] = period.split('-');
  return `${month}/${year}`;
}

export function renderNotification(
  spec: NotificationSpec,
): NotificationContent {
  switch (spec.event) {
    case NotificationEvent.INVITE_RECEIVED: {
      const { companyName, inviterName, roleLabel, token } = spec.params;

      return {
        title: `${inviterName} convidou você para ${companyName}`,
        message: `Você foi convidado para participar de ${companyName} como ${roleLabel}. O convite expira em 72 horas.`,
        link: `/invites/${token}`,
        actionLabel: 'Aceitar convite',
      };
    }

    case NotificationEvent.REQUEST_PENDING: {
      const {
        requestId,
        number,
        requestTitle,
        amountCents,
        requesterName,
        approvalToken,
      } = spec.params;

      return {
        title: `Pedido ${number} aguarda sua aprovação`,
        message: `${requesterName} enviou "${requestTitle}", no valor de ${formatBrl(amountCents)}. Sua decisão é a próxima etapa do fluxo.`,
        link: `/requests/${requestId}`,
        actionLabel: 'Analisar pedido',
        mailActions: approvalToken
          ? {
              primary: {
                label: 'Aprovar',
                path: `/aprovacoes/${approvalToken}?decisao=aprovar`,
              },
              secondary: {
                label: 'Rejeitar',
                path: `/aprovacoes/${approvalToken}?decisao=rejeitar`,
              },
            }
          : undefined,
      };
    }

    case NotificationEvent.DECISION_MADE: {
      const {
        requestId,
        number,
        requestTitle,
        decision,
        deciderName,
        justification,
      } = spec.params;

      const rejected = decision === DecisionType.REJECTED;
      const withOverride = decision === DecisionType.APPROVED_WITH_OVERRIDE;

      const outcome = rejected
        ? `${deciderName} rejeitou "${requestTitle}".`
        : withOverride
          ? `${deciderName} aprovou "${requestTitle}" com ressalva de orçamento.`
          : `${deciderName} aprovou "${requestTitle}".`;

      return {
        title: rejected
          ? `Pedido ${number} rejeitado`
          : `Pedido ${number} aprovado`,
        message: justification
          ? `${outcome} Justificativa: ${justification}`
          : outcome,
        link: `/requests/${requestId}`,
        actionLabel: 'Ver pedido',
      };
    }

    case NotificationEvent.REQUEST_RETURNED: {
      const { requestId, number, requestTitle, deciderName, justification } =
        spec.params;

      return {
        title: `Pedido ${number} devolvido para ajuste`,
        message: `${deciderName} solicitou alterações em "${requestTitle}". Motivo: ${justification ?? 'não informado'}. Ajuste o pedido e submeta novamente.`,
        link: `/requests/${requestId}`,
        actionLabel: 'Ajustar pedido',
      };
    }

    case NotificationEvent.SLA_REMINDER: {
      const { requestId, number, requestTitle, amountCents, dueAt } =
        spec.params;

      return {
        title: `Pedido ${number} está próximo do prazo`,
        message: `"${requestTitle}", no valor de ${formatBrl(amountCents)}, precisa de decisão até ${formatDateTime(dueAt)}.`,
        link: `/requests/${requestId}`,
        actionLabel: 'Decidir agora',
      };
    }

    case NotificationEvent.ESCALATED: {
      const {
        requestId,
        number,
        requestTitle,
        originalApproverName,
        escalatedToName,
      } = spec.params;

      return {
        title: `Pedido ${number} foi escalonado`,
        message: `"${requestTitle}" ultrapassou o prazo de decisão com ${originalApproverName} e foi escalonado para ${escalatedToName}.`,
        link: `/requests/${requestId}`,
        actionLabel: 'Ver pedido',
      };
    }

    case NotificationEvent.BUDGET_ALERT: {
      const {
        costCenterId,
        costCenterName,
        thresholdPercent,
        period,
        totalCents,
        committedCents,
      } = spec.params;

      return {
        title: `${costCenterName} atingiu ${thresholdPercent}% do orçamento`,
        message: `No período de ${formatPeriod(period)}, o orçamento de ${formatBrl(totalCents)} está com ${formatBrl(committedCents)} comprometidos.`,
        link: `/cost-centers/${costCenterId}/budget?period=${period}`,
        actionLabel: 'Ver consumo',
      };
    }

    case NotificationEvent.MONTHLY_REPORT: {
      const {
        costCenterId,
        costCenterName,
        period,
        approvedCount,
        totalCents,
      } = spec.params;

      return {
        title: `Relatório de ${formatPeriod(period)} — ${costCenterName}`,
        message: `No período foram aprovados ${approvedCount} pedidos, somando ${formatBrl(totalCents)}.`,
        link: `/cost-centers/${costCenterId}/reports?period=${period}`,
        actionLabel: 'Abrir relatório',
      };
    }
  }
}
