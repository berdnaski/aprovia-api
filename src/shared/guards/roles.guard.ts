import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../domain/authenticated-user';
import { ForbiddenError } from '../domain/errors/domain.error';
import { CompanyMemberRole } from 'generated/prisma/enums';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<CompanyMemberRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    if (!user) {
      throw new ForbiddenError('Autenticação obrigatória.');
    }

    if (!user.role) {
      throw new ForbiddenError('Nenhuma empresa ativa nesta sessão.');
    }

    if (!required.includes(user.role)) {
      throw new ForbiddenError(
        'Seu perfil não permite executar esta operação.',
      );
    }

    return true;
  }
}
