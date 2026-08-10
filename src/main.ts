import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';
import { DomainExceptionFilter } from './shared/filters/domain-exception.filter';
import { PrismaExceptionFilter } from './shared/filters/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.use(helmet());
  app.use(cookieParser());

  const port = process.env.PORT ?? 3000;

  app.enableCors({
    origin: [
      process.env.FRONTEND_URL ?? 'http://localhost:5173',
      `http://localhost:${port}`,
    ],
    credentials: true,
  });

  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new PrismaExceptionFilter(),
    new DomainExceptionFilter(),
  );

  app.enableShutdownHooks();

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('AprovAI API')
      .setDescription('Gestão de compras e aprovações')
      .setVersion('1.0')
      .addCookieAuth('access_token')
      .build();

    SwaggerModule.setup(
      'docs',
      app,
      SwaggerModule.createDocument(app, config),
      {
        swaggerOptions: {
          persistAuthorization: true,
          withCredentials: true,
          requestInterceptor: (request: { credentials: string }) => {
            request.credentials = 'include';
            return request;
          },
        },
      },
    );
  }

  await app.listen(port);

  logger.log(`API em http://localhost:${port}/${process.env.API_PREFIX ?? 'api'}`);
}

void bootstrap();
