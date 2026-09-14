import { sumTaxesByKind } from './invoice-taxes';

describe('sumTaxesByKind', () => {
  it('soma o ICMS de todos os itens em uma linha só', () => {
    const taxes = sumTaxesByKind([
      {
        kind: 'ICMS',
        baseCents: 1740000n,
        rate: '18.00',
        amountCents: 313200n,
      },
      { kind: 'ICMS', baseCents: 360000n, rate: '18.00', amountCents: 64800n },
    ]);

    expect(taxes).toEqual([
      {
        kind: 'ICMS',
        baseCents: 2100000n,
        rate: '18.00',
        amountCents: 378000n,
      },
    ]);
  });

  it('calcula a alíquota efetiva quando os itens têm alíquotas diferentes', () => {
    const taxes = sumTaxesByKind([
      { kind: 'ICMS', baseCents: 100000n, rate: '18.00', amountCents: 18000n },
      { kind: 'ICMS', baseCents: 100000n, rate: '12.00', amountCents: 12000n },
    ]);

    expect(taxes[0].rate).toBe('15.00');
  });

  it('mantém cada tipo de imposto em uma linha separada', () => {
    const taxes = sumTaxesByKind([
      { kind: 'ICMS', baseCents: 100000n, rate: '18.00', amountCents: 18000n },
      { kind: 'IPI', baseCents: 100000n, rate: '5.00', amountCents: 5000n },
      { kind: 'ICMS', baseCents: 50000n, rate: '18.00', amountCents: 9000n },
    ]);

    expect(taxes.map((tax) => tax.kind)).toEqual(['ICMS', 'IPI']);
    expect(taxes[0].amountCents).toBe(27000n);
  });

  it('não gera linha quando a nota não tem imposto', () => {
    expect(sumTaxesByKind([])).toEqual([]);
  });
});
