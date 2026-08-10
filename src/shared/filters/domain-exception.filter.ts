import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError, DomainErrorKind } from '../domain/errors/domain.error';

const STATUS_BY_KIND: Record<DomainErrorKind, HttpStatus> = {
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  INVALID_STATE: HttpStatus.UNPROCESSABLE_ENTITY,
  VALIDATION: HttpStatus.BAD_REQUEST,
};

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = STATUS_BY_KIND[exception.kind] ?? HttpStatus.BAD_REQUEST;

    response.status(status).json({
      statusCode: status,
      error: exception.kind,
      message: exception.message,
      ...(exception.details && { details: exception.details }),
      timestamp: new Date().toISOString(),
    });
  }
}
