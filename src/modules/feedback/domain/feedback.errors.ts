import { NotFoundError } from 'src/shared/domain/errors/domain.error';

export class FeedbackNotFoundError extends NotFoundError {
  constructor() {
    super('Este feedback não existe ou já foi removido.');
  }
}
