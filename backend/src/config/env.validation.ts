import { plainToInstance, Type } from 'class-transformer';
import { IsEnum, IsNumber, IsString, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
  @IsNumber()
  PORT = 4000;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  REDIS_HOST = 'localhost';

  @Type(() => Number)
  @IsNumber()
  REDIS_PORT = 6379;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN = '7d';

  @IsString()
  S3_ENDPOINT = 'localhost';

  @Type(() => Number)
  @IsNumber()
  S3_PORT = 9000;

  @IsString()
  S3_ACCESS_KEY: string;

  @IsString()
  S3_SECRET_KEY: string;

  @IsString()
  S3_BUCKET_NAME: string;
}

export function validateEnv(config: Record<string, any>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
