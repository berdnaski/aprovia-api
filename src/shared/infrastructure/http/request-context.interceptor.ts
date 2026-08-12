import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { runWithRequestContext } from './request-context';

interface IncomingRequest {
  ip?: string;
  socket?: { remoteAddress?: string };
  headers: Record<string, string | string[] | undefined>;
}

function resolveIp(request: IncomingRequest): string | null {
  const forwarded = request.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;

  const candidate =
    first?.split(',')[0]?.trim() ??
    request.ip ??
    request.socket?.remoteAddress ??
    null;

  return candidate ? candidate.slice(0, 45) : null;
}

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<IncomingRequest>();

    return runWithRequestContext({ ipAddress: resolveIp(request) }, () =>
      next.handle(),
    );
  }
}
