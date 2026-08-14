const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatCents(cents: bigint): string {
  return BRL.format(Number(cents) / 100);
}
