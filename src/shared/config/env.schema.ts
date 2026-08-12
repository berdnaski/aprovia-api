import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export const NodeEnv = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
} as const;

export type NodeEnv = (typeof NodeEnv)[keyof typeof NodeEnv];

export class EnvSchema {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.DEVELOPMENT;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  REDIS_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT = 6379;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  REFRESH_TOKEN_SECRET: string;

  @IsString()
  R2_ACCOUNT_ID: string;

  @IsString()
  R2_ACCESS_KEY_ID: string;

  @IsString()
  R2_SECRET_ACCESS_KEY: string;

  @IsString()
  R2_BUCKET: string;

  @IsInt()
  @Min(60)
  @Max(604800)
  R2_SIGNED_URL_TTL_SECONDS = 900;

  @IsInt()
  @Min(1024)
  UPLOAD_MAX_SIZE_BYTES = 10485760;

  @IsUrl({ require_tld: false })
  BRASIL_API_BASE_URL = 'https://brasilapi.com.br/api';

  @IsInt()
  @Min(500)
  @Max(30000)
  BRASIL_API_TIMEOUT_MS = 3000;

  @IsOptional()
  @IsString()
  DEEPSEEK_API_KEY?: string;

  @IsUrl({ require_tld: false })
  DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

  @IsString()
  DEEPSEEK_MODEL = 'deepseek-chat';

  @IsInt()
  @Min(1000)
  @Max(120000)
  AI_EXTRACTION_TIMEOUT_MS = 20000;
}

const NUMERIC_KEYS: readonly (keyof EnvSchema)[] = [
  'REDIS_PORT',
  'R2_SIGNED_URL_TTL_SECONDS',
  'UPLOAD_MAX_SIZE_BYTES',
  'BRASIL_API_TIMEOUT_MS',
  'AI_EXTRACTION_TIMEOUT_MS',
];

export function validateEnv(raw: Record<string, unknown>): EnvSchema {
  const coerced: Record<string, unknown> = { ...raw };

  for (const key of NUMERIC_KEYS) {
    if (coerced[key] !== undefined && coerced[key] !== '') {
      coerced[key] = Number(coerced[key]);
    } else {
      delete coerced[key];
    }
  }

  const config = plainToInstance(EnvSchema, coerced, {
    enableImplicitConversion: false,
    exposeDefaultValues: true,
  });

  const errors = validateSync(config, { skipMissingProperties: false });

  if (errors.length > 0) {
    const detail = errors
      .map(
        (error) =>
          `${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`,
      )
      .join('\n  ');

    throw new Error(`Configuração de ambiente inválida:\n  ${detail}`);
  }

  return config;
}
