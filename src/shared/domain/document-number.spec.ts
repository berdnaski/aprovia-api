import {
  buildDocumentNumber,
  documentNumberPrefix,
  nextDocumentNumber,
} from './document-number';

describe('documentNumber', () => {
  it('começa a sequência em 1 quando não há número anterior', () => {
    expect(nextDocumentNumber('PO', 2026, null)).toBe('PO-2026-0001');
  });

  it('incrementa a partir do último número', () => {
    expect(nextDocumentNumber('PO', 2026, 'PO-2026-0041')).toBe('PO-2026-0042');
  });

  it('mantém o padding ao passar de quatro dígitos', () => {
    expect(nextDocumentNumber('REC', 2026, 'REC-2026-9999')).toBe(
      'REC-2026-10000',
    );
  });

  it('reinicia a sequência a cada ano', () => {
    expect(nextDocumentNumber('PO', 2027, null)).toBe('PO-2027-0001');
  });

  it('volta para 1 quando o número anterior está corrompido', () => {
    expect(nextDocumentNumber('PO', 2026, 'PO-2026-ABC')).toBe('PO-2026-0001');
  });

  it('monta o prefixo do ano', () => {
    expect(documentNumberPrefix('PO', 2026)).toBe('PO-2026-');
  });

  it('monta um número a partir da sequência', () => {
    expect(buildDocumentNumber('PO', 2026, 7)).toBe('PO-2026-0007');
  });
});
