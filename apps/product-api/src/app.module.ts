import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CommonModule } from './common/common.module';
import { RolesGuard } from './common/authz/roles.guard';
import { validateEnvironment, type Environment } from './common/config/environment';
import { ContextMiddleware } from './common/context/context.middleware';
import { PrismaModule } from './common/database/prisma.module';
import { RequestLoggingInterceptor } from './common/logging/request-logging.interceptor';
import { RedisModule } from './common/redis/redis.module';
import { AdminModule } from './modules/admin/admin.module';
import { AgentRuntimeModule } from './modules/agent-runtime/agent-runtime.module';
import { HealthModule } from './modules/health/health.module';
import { InterviewModule } from './modules/interview/interview.module';
import { JobIntentModule } from './modules/job-intent/job-intent.module';
import { ProfileModule } from './modules/profile/profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => [
        {
          ttl: config.get('API_THROTTLE_TTL_MS', { infer: true }),
          limit: config.get('API_THROTTLE_LIMIT', { infer: true }),
        },
      ],
    }),
    PrismaModule,
    RedisModule,
    CommonModule,
    HealthModule,
    AgentRuntimeModule,
    ProfileModule,
    JobIntentModule,
    InterviewModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleware).forRoutes('*');
  }
}
