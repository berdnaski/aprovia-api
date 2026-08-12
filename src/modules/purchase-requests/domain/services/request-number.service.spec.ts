import {
  nextRequestNumber,
  requestNumberPrefix,
} from './request-number.service';

describe('RequestNumberService', () => {
  it('começa em 0001 quando a empresa não tem pedidos no ano', () => {
    expect(nextRequestNumber(2026, null)).toBe('REQ-2026-0001');
  });

  it('incrementa a sequência mantendo o padding', () => {
    expect(nextRequestNumber(2026, 'REQ-2026-0041')).toBe('REQ-2026-0042');
  });

  it('não trunca quando a sequência passa de 4 dígitos', () => {
    expect(nextRequestNumber(2026, 'REQ-2026-9999')).toBe('REQ-2026-10000');
  });

  it('reinicia a contagem na virada do ano', () => {
    expect(nextRequestNumber(2027, null)).toBe('REQ-2027-0001');
  });

  it('cai para 0001 se o número anterior estiver corrompido', () => {
    expect(nextRequestNumber(2026, 'REQ-2026-ABC')).toBe('REQ-2026-0001');
  });

  it('o prefixo isola empresa por ano para a busca do último número', () => {
    expect(requestNumberPrefix(2026)).toBe('REQ-2026-');
  });
});
