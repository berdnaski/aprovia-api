import { TaxRegime } from 'generated/prisma/enums';
import { resolveTaxRegime } from './tax-regime.service';

describe('resolveTaxRegime', () => {
  it('prioriza MEI sobre qualquer outro indicador', () => {
    expect(
      resolveTaxRegime({
        meiOpted: true,
        simplesOpted: true,
        regimeTributario: [{ ano: 2024, forma_de_tributacao: 'LUCRO REAL' }],
      }),
    ).toBe(TaxRegime.MEI);
  });

  it('usa o Simples quando não é MEI', () => {
    expect(
      resolveTaxRegime({
        meiOpted: false,
        simplesOpted: true,
        regimeTributario: [],
      }),
    ).toBe(TaxRegime.SIMPLES_NACIONAL);
  });

  it('pega o ano mais recente do histórico de tributação', () => {
    expect(
      resolveTaxRegime({
        meiOpted: false,
        simplesOpted: false,
        regimeTributario: [
          { ano: 2022, forma_de_tributacao: 'LUCRO PRESUMIDO' },
          { ano: 2024, forma_de_tributacao: 'LUCRO REAL' },
          { ano: 2023, forma_de_tributacao: 'LUCRO PRESUMIDO' },
        ],
      }),
    ).toBe(TaxRegime.LUCRO_REAL);
  });

  it('devolve UNKNOWN sem nenhum indicador aproveitável', () => {
    expect(
      resolveTaxRegime({
        meiOpted: null,
        simplesOpted: null,
        regimeTributario: [],
      }),
    ).toBe(TaxRegime.UNKNOWN);
  });
});
