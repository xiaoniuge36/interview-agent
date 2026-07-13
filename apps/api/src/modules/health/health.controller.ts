import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { Readiness } from '@interview-agent/contracts';
import { Public } from '../../common/authz/public.decorator';
import type { Environment } from '../../common/config/environment';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

const SERVICE_NAME = 'product-api';

type DependencyCheck = Readiness['checks'][string];

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  @Get()
  liveness() {
    return this.live();
  }

  @Get('live')
  live() {
    return {
      status: 'ok' as const,
      service: SERVICE_NAME,
      time: new Date().toISOString(),
    };
  }

  @Get('ready')
  async readiness(@Res({ passthrough: true }) response: Response): Promise<Readiness> {
    const [database, redis] = await Promise.all([
      timedCheck(() => this.prisma.$queryRaw`SELECT 1`),
      timedCheck(() => this.redis.ping()),
    ]);
    const redisRequired = this.config.get('REDIS_REQUIRED', { infer: true });
    const ready = database.status === 'up' && (!redisRequired || redis.status === 'up');
    response.status(ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return {
      status: ready ? 'ready' : 'not_ready',
      service: SERVICE_NAME,
      time: new Date().toISOString(),
      checks: { database, redis },
    };
  }
}

async function timedCheck(operation: () => Promise<unknown>): Promise<DependencyCheck> {
  const startedAt = Date.now();
  try {
    await operation();
    return { status: 'up', latencyMs: Date.now() - startedAt };
  } catch (error) {
    return {
      status: 'down',
      latencyMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : 'dependency unavailable',
    };
  }
}
