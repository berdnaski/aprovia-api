import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AuthenticatedUser } from '../domain/authenticated-user';
import { ForbiddenError } from '../domain/errors/domain.error';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  private readonly logger = new Logger(SuperAdminGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      method: string;
      url: string;
    }>();

    const user = request.user;

    if (!user?.isSuperAdmin) {
      throw new ForbiddenError(
        'Esta área é restrita à administração da plataforma',
      );
    }

    this.logger.log(
      `Acesso de plataforma por ${user.email}: ${request.method} ${request.url}`,
    );

    return true;
  }
}
