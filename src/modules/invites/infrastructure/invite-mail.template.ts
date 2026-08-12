import { CompanyMemberRole } from 'generated/prisma/enums';
import { SendMailInput } from 'src/shared/mail/application/mail.service';
import { renderLayout } from 'src/shared/mail/templates/base.template';

export const ROLE_LABEL: Record<CompanyMemberRole, string> = {
  REQUESTER: 'Solicitante',
  APPROVER: 'Aprovador',
  FINANCE_ADMIN: 'Admin Financeiro',
};

export interface InviteMailInput {
  companyName: string;
  inviterName: string;
  role: CompanyMemberRole;
  token: string;
  frontendUrl: string;
}

export function renderInviteEmail(
  input: InviteMailInput,
): Omit<SendMailInput, 'to'> {
  return {
    subject: `${input.inviterName} convidou você para ${input.companyName}`,
    html: renderLayout({
      title: `Convite para ${input.companyName}`,
      greeting: 'Olá.',
      body: `${input.inviterName} convidou você para participar de ${input.companyName} no AprovAI como <strong>${ROLE_LABEL[input.role]}</strong>. Aceite o convite para definir sua senha e concluir o cadastro.`,
      actionLabel: 'Aceitar convite',
      actionUrl: `${input.frontendUrl}/convites/${input.token}`,
      footer:
        'O link vale por 72 horas e só pode ser usado uma vez. Depois disso, peça ao Admin Financeiro para reenviar o convite.',
    }),
  };
}
