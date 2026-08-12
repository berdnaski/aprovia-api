import {
  DecisionChannel,
  DecisionType,
  StepStatus,
} from 'generated/prisma/enums';
import {
  actorLabel,
  resolveCurrentStepOrder,
  TimelineDecision,
  TimelineStep,
} from './request-timeline';

const step = (order: number, status: StepStatus): TimelineStep => ({
  id: `step-${order}`,
  order,
  status,
  expectedApproverId: `member-${order}`,
  expectedApproverName: `Aprovador ${order}`,
  requiresDualApproval: false,
  escalatedFromId: null,
  escalatedFromName: null,
  escalatedAt: null,
  startedAt: null,
  endedAt: null,
  decisions: [],
});

const decision = (
  deciderName: string,
  onBehalfOfName: string | null,
): TimelineDecision => ({
  id: 'decision-1',
  type: DecisionType.APPROVED,
  justification: null,
  channel: DecisionChannel.PLATFORM,
  decidedAt: new Date(),
  deciderId: 'm1',
  deciderName,
  onBehalfOfId: onBehalfOfName ? 'm2' : null,
  onBehalfOfName,
});

describe('request-timeline', () => {
  describe('resolveCurrentStepOrder', () => {
    it('cascata de 3 niveis: destaca a primeira WAITING', () => {
      const steps = [
        step(1, StepStatus.APPROVED),
        step(2, StepStatus.WAITING),
        step(3, StepStatus.WAITING),
      ];

      expect(resolveCurrentStepOrder(steps)).toBe(2);
    });

    it('rascunho sem etapas nao tem etapa atual', () => {
      expect(resolveCurrentStepOrder([])).toBeNull();
    });

    it('cascata concluida nao destaca nenhuma etapa', () => {
      const steps = [
        step(1, StepStatus.APPROVED),
        step(2, StepStatus.APPROVED),
      ];

      expect(resolveCurrentStepOrder(steps)).toBeNull();
    });

    it('rejeicao encerra o fluxo: nenhuma etapa fica atual', () => {
      const steps = [
        step(1, StepStatus.APPROVED),
        step(2, StepStatus.REJECTED),
        step(3, StepStatus.CANCELED),
      ];

      expect(resolveCurrentStepOrder(steps)).toBeNull();
    });

    it('nao depende da ordem em que as etapas chegam', () => {
      const steps = [
        step(3, StepStatus.WAITING),
        step(1, StepStatus.APPROVED),
        step(2, StepStatus.WAITING),
      ];

      expect(resolveCurrentStepOrder(steps)).toBe(2);
    });

    it('etapa escalonada nao conta como atual', () => {
      const steps = [
        step(1, StepStatus.ESCALATED),
        step(2, StepStatus.WAITING),
      ];

      expect(resolveCurrentStepOrder(steps)).toBe(2);
    });
  });

  describe('actorLabel', () => {
    it('decisao propria mostra so o nome', () => {
      expect(actorLabel(decision('Marina Lima', null))).toBe('Marina Lima');
    });

    it('substituto aparece como "X em nome de Y" (RN29)', () => {
      expect(actorLabel(decision('Carlos Souza', 'Marina Lima'))).toBe(
        'Carlos Souza em nome de Marina Lima',
      );
    });
  });
});
