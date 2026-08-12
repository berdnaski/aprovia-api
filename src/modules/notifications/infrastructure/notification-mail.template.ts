import { SendMailInput } from 'src/shared/mail/application/mail.service';
import { renderLayout } from 'src/shared/mail/templates/base.template';
import { NotificationContent } from '../domain/notification-templates';

export function renderNotificationEmail(
  recipientName: string,
  content: NotificationContent,
  frontendUrl: string,
): Omit<SendMailInput, 'to'> {
  const { mailActions } = content;

  const actionUrl = mailActions
    ? `${frontendUrl}${mailActions.primary.path}`
    : content.link
      ? `${frontendUrl}${content.link}`
      : undefined;

  const actionLabel = mailActions
    ? mailActions.primary.label
    : actionUrl
      ? (content.actionLabel ?? 'Abrir no AprovAI')
      : undefined;

  return {
    subject: content.title,
    html: renderLayout({
      title: content.title,
      greeting: `Olá, ${recipientName}.`,
      body: content.message,
      actionLabel,
      actionUrl,
      secondaryLabel: mailActions?.secondary.label,
      secondaryUrl: mailActions
        ? `${frontendUrl}${mailActions.secondary.path}`
        : undefined,
      footer: mailActions
        ? 'Os botões abrem uma página de confirmação — nada é decidido só por clicar no e-mail. O link vale uma única vez e expira em 7 dias.'
        : 'Você recebe este e-mail porque acompanha aprovações no AprovAI. É possível escolher quais eventos chegam por e-mail nas suas preferências de notificação.',
    }),
  };
}
