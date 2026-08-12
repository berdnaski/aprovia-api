import { OnboardingStep } from 'generated/prisma/enums';

export const ONBOARDING_ORDER: OnboardingStep[] = [
  OnboardingStep.ACCOUNT,
  OnboardingStep.COMPANY,
  OnboardingStep.TEAM,
  OnboardingStep.REVIEW,
  OnboardingStep.DONE,
];

export interface OnboardingRequirement {
  key: string;
  label: string;
  done: boolean;
  required: boolean;
}

export interface OnboardingStatus {
  step: OnboardingStep;
  completedAt: Date | null;
  requirements: OnboardingRequirement[];
  canComplete: boolean;
}

export function furthestStep(
  current: OnboardingStep,
  target: OnboardingStep,
): OnboardingStep {
  const currentIndex = ONBOARDING_ORDER.indexOf(current);
  const targetIndex = ONBOARDING_ORDER.indexOf(target);

  return targetIndex > currentIndex ? target : current;
}

export function buildStatus(
  step: OnboardingStep,
  completedAt: Date | null,
  checks: {
    costCenterWithManager: boolean;
    approvalMatrix: boolean;
    team: boolean;
  },
): OnboardingStatus {
  const requirements: OnboardingRequirement[] = [
    {
      key: 'costCenterWithManager',
      label: 'Ao menos um Centro de Custo com gestor definido',
      done: checks.costCenterWithManager,
      required: true,
    },
    {
      key: 'approvalMatrix',
      label: 'Matriz de alçadas ativa',
      done: checks.approvalMatrix,
      required: true,
    },
    {
      key: 'team',
      label: 'Equipe convidada',
      done: checks.team,
      required: false,
    },
  ];

  return {
    step,
    completedAt,
    requirements,
    canComplete: requirements.every(
      (requirement) => !requirement.required || requirement.done,
    ),
  };
}
