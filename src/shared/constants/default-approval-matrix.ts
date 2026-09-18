import { ApproverType } from 'generated/prisma/enums';

/**
 * Faixas de alçada que toda empresa nova recebe.
 *
 * Sem nenhuma faixa, o primeiro pedido não consegue ser enviado:
 * ApprovalMatrixService.resolve lança NoApprovalRuleError quando nenhuma
 * faixa cobre o valor. São valores de partida para PME, pensados para o
 * cliente ajustar depois em Configurações.
 */
export const DEFAULT_APPROVAL_MATRIX: ReadonlyArray<{
  minAmountCents: bigint;
  maxAmountCents: bigint | null;
  approverType: ApproverType;
  requiresDualApproval: boolean;
}> = [
  {
    minAmountCents: 0n,
    maxAmountCents: 100_000n,
    approverType: ApproverType.COST_CENTER_MANAGER,
    requiresDualApproval: false,
  },
  {
    minAmountCents: 100_001n,
    maxAmountCents: 1_000_000n,
    approverType: ApproverType.DIRECT_MANAGER,
    requiresDualApproval: false,
  },
  {
    minAmountCents: 1_000_001n,
    maxAmountCents: null,
    approverType: ApproverType.DIRECT_MANAGER,
    requiresDualApproval: true,
  },
];
