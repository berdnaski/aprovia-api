export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export abstract class IMailService {
  abstract send(input: SendMailInput): Promise<void>;
}
