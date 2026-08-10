import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../domain/authenticated-user';
import { ForbiddenError } from '../domain/errors/domain.error';

export const CurrentMember = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    const memberId = request.user?.memberId;

    if (!memberId) {
      throw new ForbiddenError('Nenhuma empresa ativa nesta sessão');
    }

    return memberId;
  },
);
