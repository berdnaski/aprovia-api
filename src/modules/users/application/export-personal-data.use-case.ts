import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';

export interface PersonalDataExport {
  geradoEm: string;
  titular: {
    id: string;
    nome: string;
    email: string;
    telefone: string | null;
    emailVerificado: boolean;
    termosAceitosEm: string | null;
    criadoEm: string;
    contaDesativadaEm: string | null;
  };
  vinculos: unknown[];
  pedidosCriados: unknown[];
  decisoesDeAprovacao: unknown[];
  notificacoes: unknown[];
  preferenciasDeNotificacao: unknown[];
  feedbacksEnviados: unknown[];
  registrosDeAuditoria: unknown[];
  observacoes: string[];
}

@Injectable()
export class ExportPersonalDataUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string): Promise<PersonalDataExport> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('Usuário', userId);
    }

    const memberships = await this.prisma.companyMember.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        role: true,
        created_at: true,
        disabled_at: true,
        company: { select: { legal_name: true, trade_name: true } },
      },
    });

    const memberIds = memberships.map((membership) => membership.id);

    const [
      requests,
      decisions,
      notifications,
      preferences,
      feedbacks,
      auditLogs,
    ] = await this.prisma.$transaction([
      this.prisma.purchaseRequest.findMany({
        where: { requester_id: { in: memberIds } },
        select: {
          id: true,
          number: true,
          title: true,
          description: true,
          status: true,
          total_amount_cents: true,
          created_at: true,
          submitted_at: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.decision.findMany({
        where: { decider_id: { in: memberIds } },
        select: {
          id: true,
          type: true,
          justification: true,
          channel: true,
          ip_address: true,
          decided_at: true,
          approval_step: {
            select: {
              purchase_request: { select: { number: true, title: true } },
            },
          },
        },
        orderBy: { decided_at: 'desc' },
      }),
      this.prisma.notification.findMany({
        where: { recipient_id: userId },
        select: {
          id: true,
          event: true,
          title: true,
          message: true,
          read_at: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        take: 500,
      }),
      this.prisma.notificationPreference.findMany({
        where: { user_id: userId },
        select: { event: true, email_enabled: true },
      }),
      this.prisma.feedback.findMany({
        where: { author_id: userId },
        select: {
          id: true,
          kind: true,
          message: true,
          route: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.auditLog.findMany({
        where: { actor_id: userId },
        select: {
          id: true,
          event_type: true,
          entity_type: true,
          entity_id: true,
          ip_address: true,
          occurred_at: true,
        },
        orderBy: { occurred_at: 'desc' },
        take: 1000,
      }),
    ]);

    return {
      geradoEm: new Date().toISOString(),
      titular: {
        id: user.id,
        nome: user.name,
        email: user.email,
        telefone: user.phone,
        emailVerificado: user.email_verified,
        termosAceitosEm: user.terms_accepted_at?.toISOString() ?? null,
        criadoEm: user.created_at.toISOString(),
        contaDesativadaEm: user.disabled_at?.toISOString() ?? null,
      },
      vinculos: memberships,
      pedidosCriados: requests.map((request) => ({
        ...request,
        total_amount_cents: request.total_amount_cents.toString(),
      })),
      decisoesDeAprovacao: decisions,
      notificacoes: notifications,
      preferenciasDeNotificacao: preferences,
      feedbacksEnviados: feedbacks,
      registrosDeAuditoria: auditLogs,
      observacoes: [
        'Valores monetários estão em centavos, como número inteiro.',
        'Notificações e registros de auditoria trazem os mais recentes; para o histórico completo, solicite ao encarregado.',
        'Anexos enviados por você não vão neste arquivo: baixe-os pela tela do pedido correspondente.',
        'Este arquivo atende aos direitos de acesso e de portabilidade previstos no art. 18, II e V, da LGPD.',
      ],
    };
  }
}
