import { escapeCsv, formatAmount, toCsv, toReais } from './spreadsheet';

describe('formatAmount', () => {
  const cases: [bigint, string][] = [
    [0n, '0,00'],
    [5n, '0,05'],
    [123456n, '1234,56'],
    [-250000n, '-2500,00'],
    [9007199254740993n, '90071992547409,93'],
  ];

  it.each(cases)('converte %s centavos em %s', (cents, expected) => {
    expect(formatAmount(cents)).toBe(expected);
  });
});

describe('toReais', () => {
  it('entrega número para a planilha somar', () => {
    expect(toReais(1250000n)).toBe(12500);
  });
});

describe('escapeCsv', () => {
  it('deixa texto simples intacto', () => {
    expect(escapeCsv('Notebooks')).toBe('Notebooks');
  });

  it('protege o separador', () => {
    expect(escapeCsv('Notebooks; monitores')).toBe('"Notebooks; monitores"');
  });

  it('dobra as aspas internas', () => {
    expect(escapeCsv('Cabo "HDMI"')).toBe('"Cabo ""HDMI"""');
  });

  it('protege a quebra de linha', () => {
    expect(escapeCsv('linha1\nlinha2')).toBe('"linha1\nlinha2"');
  });
});

describe('toCsv', () => {
  it('abre com BOM para o Excel reconhecer o UTF-8', () => {
    const csv = toCsv([{ header: 'Número', width: 10 }], [[{ text: 'REQ-1' }]]);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('separa por ponto e vírgula e quebra com CRLF', () => {
    const csv = toCsv(
      [
        { header: 'A', width: 5 },
        { header: 'B', width: 5 },
      ],
      [[{ text: '1' }, { text: '2' }]],
    );

    expect(csv.slice(1)).toBe('A;B\r\n1;2');
  });

  it('não deixa um campo malicioso quebrar a coluna', () => {
    const csv = toCsv(
      [
        { header: 'A', width: 5 },
        { header: 'B', width: 5 },
      ],
      [[{ text: 'x;y' }, { text: 'z' }]],
    );

    expect(csv.slice(1)).toBe('A;B\r\n"x;y";z');
  });
});
