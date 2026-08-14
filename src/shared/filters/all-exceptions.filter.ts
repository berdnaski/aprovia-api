import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError, DomainErrorKind } from '../domain/errors/domain.error';
import { isPrismaKnownError, PrismaKnownError } from '../domain/prisma-error';

const SERVER_ERROR_THRESHOLD: number = HttpStatus.INTERNAL_SERVER_ERROR;

const STATUS_BY_KIND: Record<DomainErrorKind, HttpStatus> = {
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  INVALID_STATE: HttpStatus.UNPROCESSABLE_ENTITY,
  VALIDATION: HttpStatus.BAD_REQUEST,
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    if (exception instanceof DomainError) {
      const status = STATUS_BY_KIND[exception.kind] ?? HttpStatus.BAD_REQUEST;

      response.status(status).json({
        statusCode: status,
        error: exception.kind,
        message: exception.message,
        ...(exception.details && { details: exception.details }),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (isPrismaKnownError(exception)) {
      const { status, message } = this.translatePrisma(exception);

      this.logger.warn(
        `Prisma ${exception.code} em ${request.method} ${request.url}: ${JSON.stringify(exception.meta ?? {})}`,
      );

      response.status(status).json({
        statusCode: status,
        error: 'DATABASE_CONSTRAINT',
        message,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload = isHttp ? exception.getResponse() : null;
    const message = this.extractMessage(payload, status);

    if (status >= SERVER_ERROR_THRESHOLD) {
      this.logger.error(
        `${request.method} ${request.url} — ${String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private translatePrisma(error: PrismaKnownError): {
    status: HttpStatus;
    message: string;
  } {
    switch (error.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message:
            'Já existe um cadastro com estes dados. Confira se este registro não foi criado antes.',
        };

      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message:
            'Um dos itens selecionados não existe mais. Atualize a página e escolha novamente.',
        };

      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message:
            'Este registro não foi encontrado. Ele pode ter sido excluído por outra pessoa.',
        };

      case 'P2014':
        return {
          status: HttpStatus.CONFLICT,
          message:
            'Outros registros dependem deste, por isso ele não pode ser excluído. Inative-o para preservar o histórico.',
        };

      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            'Não foi possível concluir a operação agora. Tente novamente em instantes.',
        };
    }
  }

  private extractMessage(payload: unknown, status: number): string | string[] {
    if (status >= SERVER_ERROR_THRESHOLD) {
      return 'Erro interno. Tente novamente em instantes.';
    }

    if (typeof payload === 'string') {
      return payload;
    }

    if (
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload
    ) {
      return (payload as { message: string | string[] }).message;
    }

    return 'Requisição inválida.';
  }
}
