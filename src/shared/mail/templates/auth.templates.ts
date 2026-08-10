import { renderLayout } from './base.template';

export interface MailTemplate {
  subject: string;
  html: string;
}

export function verifyEmailTemplate(
  name: string,
  verificationUrl: string,
): MailTemplate {
  return {
    subject: 'Confirme seu e-mail — AprovAI',
    html: renderLayout({
      title: 'Confirme seu e-mail',
      greeting: `Olá, ${name}!`,
      body: `Sua conta foi criada. Confirme seu endereço de e-mail para liberar
             o uso das funcionalidades da plataforma. Este link expira em 24 horas.`,
      actionLabel: 'Confirmar e-mail',
      actionUrl: verificationUrl,
    }),
  };
}

export function passwordResetTemplate(
  name: string,
  resetUrl: string,
): MailTemplate {
  return {
    subject: 'Redefinição de senha — AprovAI',
    html: renderLayout({
      title: 'Redefinir senha',
      greeting: `Olá, ${name}!`,
      body: `Recebemos um pedido para redefinir sua senha. Clique no botão abaixo
             para escolher uma nova. Este link expira em 1 hora e só pode ser
             usado uma vez.`,
      actionLabel: 'Redefinir senha',
      actionUrl: resetUrl,
      footer: `Se você não solicitou a redefinição, ignore este e-mail —
               sua senha atual permanece válida.`,
    }),
  };
}

export function passwordChangeTemplate(
  name: string,
  confirmUrl: string,
): MailTemplate {
  return {
    subject: 'Confirme a alteração de senha — AprovAI',
    html: renderLayout({
      title: 'Confirmar alteração de senha',
      greeting: `Olá, ${name}!`,
      body: `Para concluir a alteração da sua senha, confirme a operação pelo
             botão abaixo. Este link expira em 1 hora.`,
      actionLabel: 'Confirmar alteração',
      actionUrl: confirmUrl,
      footer: `Se não foi você, recomendamos trocar sua senha imediatamente.`,
    }),
  };
}

export function passwordChangedTemplate(name: string): MailTemplate {
  return {
    subject: 'Sua senha foi alterada — AprovAI',
    html: renderLayout({
      title: 'Senha alterada',
      greeting: `Olá, ${name}!`,
      body: `Sua senha foi alterada e todas as sessões ativas foram encerradas.
             Você precisará entrar novamente nos seus dispositivos.`,
      footer: `Se você não fez esta alteração, entre em contato com o suporte
               imediatamente.`,
    }),
  };
}
