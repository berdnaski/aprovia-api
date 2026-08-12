import { formatCnpj, isValidCnpj, normalizeCnpj } from './cnpj';

describe('cnpj', () => {
  it('aceita CNPJ válido com e sem máscara', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCnpj('11222333000181')).toBe(true);
  });

  it('rejeita dígitos verificadores errados', () => {
    expect(isValidCnpj('11222333000182')).toBe(false);
  });

  it('rejeita tamanho inválido', () => {
    expect(isValidCnpj('112223330001')).toBe(false);
  });

  it('rejeita sequência de dígitos repetidos', () => {
    expect(isValidCnpj('00000000000000')).toBe(false);
    expect(isValidCnpj('11111111111111')).toBe(false);
  });

  it('normaliza removendo a máscara', () => {
    expect(normalizeCnpj('11.222.333/0001-81')).toBe('11222333000181');
  });

  it('formata para exibição', () => {
    expect(formatCnpj('11222333000181')).toBe('11.222.333/0001-81');
  });

  it('devolve o valor original quando não dá para formatar', () => {
    expect(formatCnpj('123')).toBe('123');
  });
});
