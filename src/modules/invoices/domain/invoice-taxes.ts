import { CreateInvoiceTaxData } from './invoices.repository.interface';
import { ParsedNfeTax } from './nfe-parser.interface';

interface TaxTotal {
  baseCents: bigint;
  amountCents: bigint;
  rates: Set<string>;
}

function effectiveRate(total: TaxTotal): string {
  if (total.rates.size === 1) {
    return [...total.rates][0];
  }

  if (total.baseCents === 0n) {
    return '0.00';
  }

  const basisPoints =
    (total.amountCents * 10000n + total.baseCents / 2n) / total.baseCents;

  return (Number(basisPoints) / 100).toFixed(2);
}

export function sumTaxesByKind(taxes: ParsedNfeTax[]): CreateInvoiceTaxData[] {
  const totals = new Map<ParsedNfeTax['kind'], TaxTotal>();

  for (const tax of taxes) {
    const current = totals.get(tax.kind) ?? {
      baseCents: 0n,
      amountCents: 0n,
      rates: new Set<string>(),
    };

    current.baseCents += tax.baseCents;
    current.amountCents += tax.amountCents;
    current.rates.add(tax.rate);
    totals.set(tax.kind, current);
  }

  return [...totals].map(([kind, total]) => ({
    kind,
    baseCents: total.baseCents,
    amountCents: total.amountCents,
    rate: effectiveRate(total),
  }));
}
