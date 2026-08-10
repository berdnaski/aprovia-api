export const DEFAULT_CATEGORIES: ReadonlyArray<{
  name: string;
  description: string;
}> = [
  {
    name: 'Software',
    description: 'Licenças, assinaturas e ferramentas digitais',
  },
  {
    name: 'Serviços',
    description: 'Consultoria, manutenção e serviços terceirizados',
  },
  {
    name: 'Materiais',
    description: 'Materiais de escritório, consumo e insumos',
  },
  {
    name: 'Equipamentos',
    description: 'Computadores, mobiliário e ativos imobilizados',
  },
  {
    name: 'Viagens',
    description: 'Passagens, hospedagem e despesas de deslocamento',
  },
  {
    name: 'Marketing',
    description: 'Publicidade, eventos e material promocional',
  },
  {
    name: 'Infraestrutura',
    description: 'Hospedagem, telecomunicações e utilidades',
  },
] as const;
