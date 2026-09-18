import { ChartAccountKind } from 'generated/prisma/enums';
import { parseChartCsv } from './chart-csv.parser';

describe('parseChartCsv', () => {
  it('lê planilha com ponto e vírgula, acentos e BOM do Excel', () => {
    const content =
      '\uFEFFCódigo;Nome;Natureza;Analítica;Código ERP\r\n4;Despesas;Despesa;N;\r\n4.1.01;"Softwares; assinaturas";;S;31101\r\n';

    const result = parseChartCsv(content);

    expect(result.problems).toEqual([]);
    expect(result.rows).toEqual([
      {
        line: 2,
        code: '4',
        name: 'Despesas',
        kind: ChartAccountKind.EXPENSE,
        postable: false,
        externalCode: null,
      },
      {
        line: 3,
        code: '4.1.01',
        name: 'Softwares; assinaturas',
        kind: null,
        postable: true,
        externalCode: '31101',
      },
    ]);
  });

  it('aceita só código e nome separados por vírgula', () => {
    const result = parseChartCsv('codigo,nome\n1,Ativo\n');

    expect(result.rows[0]).toMatchObject({
      code: '1',
      name: 'Ativo',
      kind: null,
      postable: null,
    });
  });

  it('aponta a linha com natureza desconhecida', () => {
    const result = parseChartCsv('codigo;nome;natureza\n9;Outros;Diversos\n');

    expect(result.rows).toEqual([]);
    expect(result.problems[0]).toContain('Linha 2');
  });

  it('exige as colunas de código e nome', () => {
    const result = parseChartCsv('conta contabil\n1\n');

    expect(result.problems).toHaveLength(1);
  });
});
