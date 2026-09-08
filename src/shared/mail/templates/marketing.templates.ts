import { renderLayout } from './base.template';
import { MailTemplate } from './auth.templates';

export function waitlistJoinedTemplate(
  name: string | null,
  privacyUrl: string,
  hasPhone: boolean,
): MailTemplate {
  const greeting = name ? `Olá, ${name}!` : 'Olá!';
  const how = hasPhone
    ? 'Quando chegar a sua vez, chamamos por e-mail ou pelo telefone que você deixou.'
    : 'Quando chegar a sua vez, escrevemos para este endereço.';

  return {
    subject: 'Você está na fila do AprovAI',
    html: renderLayout({
      title: 'Lugar guardado na fila',
      greeting,
      body: `Seu lugar está guardado. O AprovAI ainda não abriu para todo
             mundo: estamos liberando o acesso aos poucos. ${how} Não é preciso
             fazer mais nada agora.`,
      footer: `Guardamos o seu contato apenas para esse aviso. Para sair da
               fila, responda esta mensagem. Saiba como tratamos seus dados em
               ${privacyUrl}.`,
    }),
  };
}
