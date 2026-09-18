import { ApiProperty } from '@nestjs/swagger';
import { ChartAccountKind } from 'generated/prisma/enums';
import { DreReport } from '../domain/metrics';

export class DreAccountLineResponseDto {
  @ApiProperty({ format: 'uuid' })
  chartAccountId: string;

  @ApiProperty({ example: '4.1.02' })
  code: string;

  @ApiProperty({ example: 'Serviços de terceiros' })
  name: string;

  @ApiProperty({ enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COST', 'EXPENSE'] })
  kind: ChartAccountKind;

  @ApiProperty({ example: '480000' })
  amountCents: string;
}

export class DreResponseDto {
  @ApiProperty()
  from: Date;

  @ApiProperty()
  to: Date;

  @ApiProperty({
    example: '0',
    description: 'Somente contas de natureza REVENUE. Este é um sistema de compras, então normalmente zero.',
  })
  revenueCents: string;

  @ApiProperty({ example: '1200000', description: 'Soma das contas de natureza COST.' })
  costCents: string;

  @ApiProperty({ example: '860000', description: 'Soma das contas de natureza EXPENSE.' })
  expenseCents: string;

  @ApiProperty({
    example: '-2060000',
    description: 'Receita − custo − despesa. Negativo é normal aqui: mede saída de caixa, não é uma DRE societária completa.',
  })
  resultCents: string;

  @ApiProperty({ type: [DreAccountLineResponseDto] })
  lines: DreAccountLineResponseDto[];

  static fromDomain(report: DreReport): DreResponseDto {
    const dto = new DreResponseDto();

    dto.from = report.from;
    dto.to = report.to;
    dto.revenueCents = report.revenueCents.toString();
    dto.costCents = report.costCents.toString();
    dto.expenseCents = report.expenseCents.toString();
    dto.resultCents = report.resultCents.toString();
    dto.lines = report.lines.map((line) => ({
      chartAccountId: line.chartAccountId,
      code: line.code,
      name: line.name,
      kind: line.kind,
      amountCents: line.amountCents.toString(),
    }));

    return dto;
  }
}
