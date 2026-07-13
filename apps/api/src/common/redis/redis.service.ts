import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';
import type { Environment } from '../config/environment';

const RECONNECT_BASE_DELAY_MS = 100;
const MAX_RECONNECT_DELAY_MS = 3_000;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly publisher: RedisClientType;
  private readonly subscriber: RedisClientType;
  private readonly required: boolean;

  constructor(config: ConfigService<Environment, true>) {
    const url = config.get('REDIS_URL', { infer: true });
    this.required = config.get('REDIS_REQUIRED', { infer: true });
    const socket = {
      reconnectStrategy: (retries: number) =>
        Math.min(RECONNECT_BASE_DELAY_MS * 2 ** retries, MAX_RECONNECT_DELAY_MS),
    };
    this.publisher = createClient({ url, socket });
    this.subscriber = this.publisher.duplicate();
    this.attachErrorLogging(this.publisher, 'publisher');
    this.attachErrorLogging(this.subscriber, 'subscriber');
  }

  async onModuleInit() {
    try {
      await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
      this.logger.log('Redis connections established');
    } catch (error) {
      if (this.required) throw error;
      this.logger.warn(
        `Redis unavailable; continuing without realtime fan-out: ${errorMessage(error)}`,
      );
    }
  }

  async onModuleDestroy() {
    await Promise.allSettled([this.close(this.publisher), this.close(this.subscriber)]);
  }

  async ping() {
    if (!this.publisher.isReady) throw new Error('Redis client is not ready');
    return this.publisher.ping();
  }

  async publish(channel: string, payload: string) {
    if (!this.publisher.isReady) return false;
    await this.publisher.publish(channel, payload);
    return true;
  }

  async subscribe(channel: string, listener: (payload: string) => void) {
    if (!this.subscriber.isReady) return false;
    await this.subscriber.subscribe(channel, listener);
    return true;
  }

  async unsubscribe(channel: string) {
    if (!this.subscriber.isReady) return;
    await this.subscriber.unsubscribe(channel);
  }

  private attachErrorLogging(client: RedisClientType, name: string) {
    client.on('error', (error) => this.logger.warn(`Redis ${name} error: ${error.message}`));
  }

  private async close(client: RedisClientType) {
    if (client.isOpen) await client.quit();
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'unknown error';
}
