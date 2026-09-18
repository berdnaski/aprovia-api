import {
  AllocationLineDuplicatedError,
  AllocationSharesError,
  PrimaryCostCenterMissingError,
} from '../purchase-requests.errors';
import {
  allocate,
  assertValidAllocation,
  sameSplit,
  splitAmount,
  sumByCostCenter,
} from './allocation-split';

const line = (
  costCenterId: string,
  shareBps: number,
  chartAccountId: string | null = null,
) => ({ costCenterId, chartAccountId, shareBps });

describe('splitAmount', () => {
  it('reparte centavos sem sobrar nem faltar', () => {
    const amounts = splitAmount(100n, [3333, 3333, 3334]);

    expect(amounts).toEqual([33n, 33n, 34n]);
    expect(amounts.reduce((sum, amount) => sum + amount, 0n)).toBe(100n);
  });

  it('entrega o centavo que sobra para a maior fração', () => {
    expect(splitAmount(1001n, [5000, 5000])).toEqual([501n, 500n]);
    expect(splitAmount(1000n, [2500, 7500])).toEqual([250n, 750n]);
  });
});

describe('assertValidAllocation', () => {
  it('aceita rateio que fecha 100% e inclui o centro de custo do pedido', () => {
    expect(() =>
      assertValidAllocation([line('ti', 6000), line('mkt', 4000)], 'ti'),
    ).not.toThrow();
  });

  it('recusa rateio que não fecha 100%', () => {
    expect(() =>
      assertValidAllocation([line('ti', 6000), line('mkt', 3000)], 'ti'),
    ).toThrow(AllocationSharesError);
  });

  it('recusa a mesma combinação de centro de custo e conta duas vezes', () => {
    expect(() =>
      assertValidAllocation(
        [line('ti', 5000, 'conta'), line('ti', 5000, 'conta')],
        'ti',
      ),
    ).toThrow(AllocationLineDuplicatedError);
  });

  it('exige o centro de custo principal no rateio', () => {
    expect(() => assertValidAllocation([line('mkt', 10000)], 'ti')).toThrow(
      PrimaryCostCenterMissingError,
    );
  });
});

describe('sameSplit', () => {
  it('ignora a troca de conta e acusa mudança de percentual', () => {
    const current = [line('ti', 6000, 'a'), line('mkt', 4000)];

    expect(
      sameSplit(current, [line('ti', 6000, 'b'), line('mkt', 4000, 'c')]),
    ).toBe(true);
    expect(sameSplit(current, [line('ti', 5000), line('mkt', 5000)])).toBe(
      false,
    );
  });
});

describe('sumByCostCenter', () => {
  it('soma as linhas do mesmo centro de custo', () => {
    const lines = allocate(1000n, [
      line('ti', 5000, 'software'),
      line('ti', 2000, 'servicos'),
      line('mkt', 3000),
    ]);

    expect([...sumByCostCenter(lines)]).toEqual([
      ['ti', 700n],
      ['mkt', 300n],
    ]);
  });
});
