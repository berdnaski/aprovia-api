import { ApiProperty } from '@nestjs/swagger';
import { RequestStatus } from 'generated/prisma/enums';
import { EmailApprovalView } from '../application/get-email-approval.use-case';

export class EmailApprovalResponseDto {
  @ApiProperty({ example: 'REQ-2026-0042' })
  number: string;

  @ApiProperty({ example: 'Notebooks para o time de vendas' })
  title: string;

  @ApiProperty({ type: String, example: '1250000' })
  totalAmountCents: string;

  @ApiProperty({
    enum: [
      'DRAFT',
      'PENDING',
      'APPROVED',
      'REJECTED',
      'CHANGES_REQUESTED',
      'CANCELED',
    ],
  })
  status: RequestStatus;

  @ApiProperty()
  requesterName: string;

  @ApiProperty()
  approverName: string;

  @ApiProperty({
    description: 'Falso quando o link já foi usado ou o pedido saiu da fila.',
  })
  actionable: boolean;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Explica em português por que a decisão não está disponível.',
  })
  reason: string | null;

  static fromView(
    this: void,
    view: EmailApprovalView,
  ): EmailApprovalResponseDto {
    const dto = new EmailApprovalResponseDto();

    dto.number = view.number;
    dto.title = view.title;
    dto.totalAmountCents = view.totalAmountCents.toString();
    dto.status = view.status;
    dto.requesterName = view.requesterName;
    dto.approverName = view.approverName;
    dto.actionable = view.actionable;
    dto.reason = view.reason;

    return dto;
  }
}
