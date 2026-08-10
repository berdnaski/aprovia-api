import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../domain/errors/domain.error';
import {
  isPrismaKnownError,
  PrismaKnownError,
} from '../domain/prisma-error';

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof DomainError || !isPrismaKnownError(exception)) {
      throw exception;
    }

    const response = host.switchToHttp().getResponse<Response>();
    const { status, message } = this.translate(exception);

    this.logger.warn(`Prisma ${exception.code}: ${message}`);

    response.status(status).json({
      statusCode: status,
      error: 'DATABASE_CONSTRAINT',
      message,
      timestamp: new Date().toISOString(),
    });
  }

  private translate(error: PrismaKnownError): {
    status: HttpStatus;
    message: string;
  } {
    switch (error.code) {
      case 'P2002': {
        const fields = error.meta?.target?.join(', ');
        return {
          status: HttpStatus.CONFLICT,
          message: fields
            ? `Já existe um registro com este valor: ${fields}.`
            : 'Já existe um registro com estes dados.',
        };
      }

      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Referência inválida: o registro relacionado não existe.',
        };

      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Registro não encontrado.',
        };

      case 'P2014':
        return {
          status: HttpStatus.CONFLICT,
          message:
            'Operação bloqueada: existem registros vinculados que dependem deste.',
        };

      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Erro ao acessar os dados.',
        };
    }
  }
}
