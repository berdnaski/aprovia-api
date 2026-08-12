interface LayoutInput {
  title: string;
  greeting: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
  secondaryLabel?: string;
  secondaryUrl?: string;
  footer?: string;
}

export function renderLayout({
  title,
  greeting,
  body,
  actionLabel,
  actionUrl,
  secondaryLabel,
  secondaryUrl,
  footer,
}: LayoutInput): string {
  const secondary =
    secondaryLabel && secondaryUrl
      ? `<a href="${secondaryUrl}"
             style="display:inline-block;background:#ffffff;color:#b91c1c;
                    border:1px solid #fca5a5;text-decoration:none;
                    padding:11px 24px;border-radius:6px;margin-left:8px;
                    font-weight:600;font-size:14px;">${secondaryLabel}</a>`
      : '';

  const button =
    actionLabel && actionUrl
      ? `<tr>
          <td style="padding: 8px 0 24px;">
            <a href="${actionUrl}"
               style="display:inline-block;background:#1f2937;color:#ffffff;
                      text-decoration:none;padding:12px 24px;border-radius:6px;
                      font-weight:600;font-size:14px;">${actionLabel}</a>${secondary}
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:24px;color:#6b7280;font-size:13px;line-height:20px;">
            Se o botão não funcionar, copie este endereço no navegador:<br>
            <span style="color:#374151;word-break:break-all;">${actionUrl}</span>
          </td>
        </tr>`
      : '';

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f3f4f6;
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="max-width:560px;margin:0 auto;background:#ffffff;
                  border-radius:8px;padding:32px;">
      <tr>
        <td style="padding-bottom:24px;font-size:18px;font-weight:700;color:#111827;">
          AprovAI
        </td>
      </tr>
      <tr>
        <td style="padding-bottom:16px;font-size:16px;color:#111827;">
          ${greeting}
        </td>
      </tr>
      <tr>
        <td style="padding-bottom:24px;font-size:14px;line-height:22px;color:#374151;">
          ${body}
        </td>
      </tr>
      ${button}
      <tr>
        <td style="border-top:1px solid #e5e7eb;padding-top:16px;
                   font-size:12px;line-height:18px;color:#9ca3af;">
          ${footer ?? 'Se você não solicitou este e-mail, pode ignorá-lo com segurança.'}
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function toPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
