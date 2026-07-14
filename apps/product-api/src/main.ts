import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import type { Environment } from './common/config/environment';
import { HttpExceptionFilter } from './common/errors/http-exception.filter';

const DEVELOPMENT_ORIGINS = ['http://localhost:3000', 'http://localhost:3002'];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const config = app.get(ConfigService<Environment, true>);
  const bodyLimit = config.get('API_BODY_LIMIT', { infer: true });
  app.use(helmet());
  app.useBodyParser('json', { limit: bodyLimit });
  app.useBodyParser('urlencoded', { extended: false, limit: bodyLimit });
  app.setGlobalPrefix('api');
  app.enableCors(corsOptions(config));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableShutdownHooks();

  if (config.get('API_SWAGGER_ENABLED', { infer: true })) {
    setupSwagger(app);
  }

  await app.listen(
    config.get('API_PORT', { infer: true }),
    config.get('API_HOST', { infer: true }),
  );
}

function corsOptions(config: ConfigService<Environment, true>) {
  const configured = config.get('API_CORS_ORIGINS', { infer: true });
  const development = config.get('NODE_ENV', { infer: true }) !== 'production';
  return {
    origin: configured.length > 0 ? configured : development ? DEVELOPMENT_ORIGINS : false,
    credentials: false,
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Idempotency-Key',
      'X-Development-Actor',
      'X-Request-Id',
      'X-Trace-Id',
    ],
    exposedHeaders: ['X-Request-Id', 'X-Trace-Id'],
  };
}

function setupSwagger(app: NestExpressApplication) {
  const configuration = new DocumentBuilder()
    .setTitle('Interview Agent Product API')
    .setDescription('业务事实源 API：权限、画像、岗位、面试会话、审计与 Agent Runtime 调度。')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, configuration);
  SwaggerModule.setup('api/docs', app, document);
}

void bootstrap();
