import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../domain/authenticated-user';
import { ForbiddenError } from '../domain/errors/domain.error';

/** Empresa ativa da sessão. Falha quando o usuário ainda não pertence a uma. */
export const CurrentCompany = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    const companyId = request.user?.companyId;

    if (!companyId) {
      throw new ForbiddenError('Nenhuma empresa ativa nesta sessão');
    }

    return companyId;
  },
);
