import { TaxRegime } from 'generated/prisma/enums';

interface RegimeTributarioEntry {
  ano: number;
  forma_de_tributacao?: string | null;
}

export interface FiscalRegimeInput {
  simplesOpted: boolean | null;
  meiOpted: boolean | null;
  regimeTributario: RegimeTributarioEntry[];
}

const FORMA_MAP: Record<string, TaxRegime> = {
  'SIMPLES NACIONAL': TaxRegime.SIMPLES_NACIONAL,
  'LUCRO PRESUMIDO': TaxRegime.LUCRO_PRESUMIDO,
  'LUCRO REAL': TaxRegime.LUCRO_REAL,
  'LUCRO ARBITRADO': TaxRegime.LUCRO_ARBITRADO,
  IMUNE: TaxRegime.IMMUNE_OR_EXEMPT,
  ISENTA: TaxRegime.IMMUNE_OR_EXEMPT,
};

export function resolveTaxRegime(input: FiscalRegimeInput): TaxRegime {
  if (input.meiOpted) {
    return TaxRegime.MEI;
  }

  if (input.simplesOpted) {
    return TaxRegime.SIMPLES_NACIONAL;
  }

  const latest = [...input.regimeTributario]
    .filter((entry) => entry.forma_de_tributacao)
    .sort((left, right) => right.ano - left.ano)[0];

  if (!latest?.forma_de_tributacao) {
    return TaxRegime.UNKNOWN;
  }

  return (
    FORMA_MAP[latest.forma_de_tributacao.trim().toUpperCase()] ??
    TaxRegime.UNKNOWN
  );
}
