import { DecisionType, NotificationEvent } from 'generated/prisma/enums';
import {
  formatBrl,
  formatPeriod,
  renderNotification,
} from './notification-templates';

describe('formatBrl', () => {
  const cases: [string, string][] = [
    ['0', 'R$ 0,00'],
    ['5', 'R$ 0,05'],
    ['123456', 'R$ 1.234,56'],
    ['100000000', 'R$ 1.000.000,00'],
    ['-250000', '-R$ 2.500,00'],
    ['9007199254740993', 'R$ 90.071.992.547.409,93'],
  ];

  it.each(cases)('formata %s como %s', (cents, expected) => {
    expect(formatBrl(cents)).toBe(expected);
  });
});

describe('formatPeriod', () => {
  it('exibe AAAA-MM como MM/AAAA', () => {
    expect(formatPeriod('2026-03')).toBe('03/2026');
  });
});

describe('renderNotification', () => {
  it('anuncia o valor em reais no pedido pendente', () => {
    const content = renderNotification({
      event: NotificationEvent.REQUEST_PENDING,
      params: {
        requestId: 'req-1',
        number: 'REQ-2026-0042',
        requestTitle: 'Notebooks',
        amountCents: '1250000',
        requesterName: 'Ana',
        approvalToken: null,
      },
    });

    expect(content.title).toBe('Pedido REQ-2026-0042 aguarda sua aprovação');
    expect(content.message).toContain('R$ 12.500,00');
    expect(content.link).toBe('/requests/req-1');
    expect(content.mailActions).toBeUndefined();
  });

  it('só oferece Aprovar/Rejeitar no e-mail quando há token (RF65)', () => {
    const content = renderNotification({
      event: NotificationEvent.REQUEST_PENDING,
      params: {
        requestId: 'req-1',
        number: 'REQ-2026-0042',
        requestTitle: 'Notebooks',
        amountCents: '1250000',
        requesterName: 'Ana',
        approvalToken: 'tok-123',
      },
    });

    expect(content.mailActions?.primary.label).toBe('Aprovar');
    expect(content.mailActions?.secondary.label).toBe('Rejeitar');
    expect(content.mailActions?.primary.path).toContain('tok-123');
    expect(content.link).toBe('/requests/req-1');
  });

  it('separa aprovação com ressalva de aprovação simples', () => {
    const content = renderNotification({
      event: NotificationEvent.DECISION_MADE,
      params: {
        requestId: 'req-1',
        number: 'REQ-2026-0042',
        requestTitle: 'Notebooks',
        decision: DecisionType.APPROVED_WITH_OVERRIDE,
        deciderName: 'Bruno',
        justification: 'Compra urgente',
      },
    });

    expect(content.title).toBe('Pedido REQ-2026-0042 aprovado');
    expect(content.message).toContain('com ressalva de orçamento');
    expect(content.message).toContain('Justificativa: Compra urgente');
  });

  it('diz o que fazer quando o pedido volta para ajuste', () => {
    const content = renderNotification({
      event: NotificationEvent.REQUEST_RETURNED,
      params: {
        requestId: 'req-1',
        number: 'REQ-2026-0042',
        requestTitle: 'Notebooks',
        deciderName: 'Bruno',
        justification: null,
      },
    });

    expect(content.message).toContain('não informado');
    expect(content.actionLabel).toBe('Ajustar pedido');
  });

  it('nomeia o limiar cruzado no alerta de orçamento', () => {
    const content = renderNotification({
      event: NotificationEvent.BUDGET_ALERT,
      params: {
        costCenterId: 'cc-1',
        costCenterName: 'TI',
        thresholdPercent: 80,
        period: '2026-03',
        totalCents: '10000000',
        committedCents: '8200000',
      },
    });

    expect(content.title).toBe('TI atingiu 80% do orçamento');
    expect(content.message).toContain('03/2026');
    expect(content.message).toContain('R$ 82.000,00');
  });
});
