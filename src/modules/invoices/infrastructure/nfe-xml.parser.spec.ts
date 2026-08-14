import { InvoiceParseFailedError } from '../domain/invoices.errors';
import { NfeXmlParser } from './nfe-xml.parser';

const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35260812345678000199550010000012345123456789" versao="4.00">
      <ide>
        <nNF>1234</nNF>
        <serie>1</serie>
        <dhEmi>2026-08-10T09:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>12345678000199</CNPJ>
        <xNome>Fornecedor Exemplo LTDA</xNome>
      </emit>
      <dest>
        <CNPJ>98765432000188</CNPJ>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>001</cProd>
          <xProd>Notebook 15 polegadas</xProd>
          <NCM>84713012</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>2.0000</qCom>
          <vUnCom>2500.00</vUnCom>
          <vProd>5000.00</vProd>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <vBC>5000.00</vBC>
              <pICMS>18.00</pICMS>
              <vICMS>900.00</vICMS>
            </ICMS00>
          </ICMS>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vNF>5000.00</vNF>
          <vProd>5000.00</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

describe('NfeXmlParser', () => {
  const parser = new NfeXmlParser();

  it('extrai os dados principais da nota', () => {
    const result = parser.parse(validXml);

    expect(result.accessKey).toBe(
      '35260812345678000199550010000012345123456789',
    );
    expect(result.number).toBe('1234');
    expect(result.series).toBe('1');
    expect(result.issuerCnpj).toBe('12345678000199');
    expect(result.issuerName).toBe('Fornecedor Exemplo LTDA');
    expect(result.recipientCnpj).toBe('98765432000188');
  });

  it('converte valores para centavos sem passar por float', () => {
    const result = parser.parse(validXml);

    expect(result.totalAmountCents).toBe(500000n);
    expect(result.productsAmountCents).toBe(500000n);
  });

  it('extrai os itens com preço unitário e total', () => {
    const result = parser.parse(validXml);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      sequence: 1,
      description: 'Notebook 15 polegadas',
      ncm: '84713012',
      cfop: '5102',
      unit: 'UN',
      quantity: '2.0000',
      unitPriceCents: 250000n,
      totalCents: 500000n,
    });
  });

  it('extrai o ICMS destacado no item', () => {
    const result = parser.parse(validXml);

    expect(result.items[0].taxes).toContainEqual({
      kind: 'ICMS',
      baseCents: 500000n,
      rate: '18.00',
      amountCents: 90000n,
    });
  });

  it('rejeita um XML que não é NFe', () => {
    expect(() => parser.parse('<root><a>1</a></root>')).toThrow(
      InvoiceParseFailedError,
    );
  });

  it('rejeita um texto que não é um documento NFe', () => {
    expect(() => parser.parse('não é xml')).toThrow(InvoiceParseFailedError);
  });

  it('rejeita uma nota sem itens', () => {
    const withoutItems = validXml.replace(
      /<det nItem="1">[\s\S]*?<\/det>/,
      '',
    );

    expect(() => parser.parse(withoutItems)).toThrow(InvoiceParseFailedError);
  });

  it('rejeita uma nota com chave de acesso inválida', () => {
    const brokenKey = validXml.replace(
      'Id="NFe35260812345678000199550010000012345123456789"',
      'Id="NFe123"',
    );

    expect(() => parser.parse(brokenKey)).toThrow(InvoiceParseFailedError);
  });
});
