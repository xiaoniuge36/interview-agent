import { Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

type MockRedisClient = {
  isReady: boolean;
  isOpen: boolean;
  connect: jest.Mock;
  quit: jest.Mock;
  ping: jest.Mock;
  publish: jest.Mock;
  eval: jest.Mock;
  subscribe: jest.Mock;
  unsubscribe: jest.Mock;
  duplicate: jest.Mock;
  on: jest.Mock;
};

const mockClients: MockRedisClient[] = [];

function mockRedisClient(): MockRedisClient {
  const client: MockRedisClient = {
    isReady: true,
    isOpen: true,
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    publish: jest.fn().mockResolvedValue(1),
    eval: jest.fn().mockResolvedValue(1),
    subscribe: jest.fn().mockResolvedValue(undefined),
    unsubscribe: jest.fn().mockResolvedValue(undefined),
    duplicate: jest.fn(() => mockRedisClient()),
    on: jest.fn(),
  };
  mockClients.push(client);
  return client;
}

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient()),
}));

beforeEach(() => {
  mockClients.length = 0;
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

test('connects the publisher and subscriber on module init', async () => {
  const service = buildService(false);

  await service.onModuleInit();

  expect(publisher().connect).toHaveBeenCalledTimes(1);
  expect(subscriber().connect).toHaveBeenCalledTimes(1);
});

test('warns and continues when redis is optional but unavailable', async () => {
  const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  const service = buildService(false);
  publisher().connect.mockRejectedValue(new Error('connection refused'));
  subscriber().connect.mockRejectedValue(new Error('connection refused'));

  await expect(service.onModuleInit()).resolves.toBeUndefined();

  expect(warn).toHaveBeenCalledWith(expect.stringContaining('Redis unavailable'));
});

test('fails fast when redis is required but unreachable', async () => {
  const service = buildService(true);
  publisher().connect.mockRejectedValue(new Error('connection refused'));
  subscriber().connect.mockRejectedValue(new Error('connection refused'));

  await expect(service.onModuleInit()).rejects.toThrow('connection refused');
});

test('publish degrades to false while the client is not ready', async () => {
  const service = buildService(false);
  publisher().isReady = false;

  await expect(service.publish('channel', 'payload')).resolves.toBe(false);
  expect(publisher().publish).not.toHaveBeenCalled();

  publisher().isReady = true;
  await expect(service.publish('channel', 'payload')).resolves.toBe(true);
  expect(publisher().publish).toHaveBeenCalledWith('channel', 'payload');
});

test('ping and eval reject while the client is not ready', async () => {
  const service = buildService(false);
  publisher().isReady = false;

  await expect(service.ping()).rejects.toThrow('Redis client is not ready');
  await expect(service.eval('return 1', ['key'], ['arg'])).rejects.toThrow(
    'Redis client is not ready',
  );
});

test('eval forwards keys and arguments to the client script call', async () => {
  const service = buildService(false);
  publisher().eval.mockResolvedValue(7);

  await expect(service.eval('return 7', ['hits:a'], ['1000'])).resolves.toBe(7);

  expect(publisher().eval).toHaveBeenCalledWith('return 7', {
    keys: ['hits:a'],
    arguments: ['1000'],
  });
});

test('subscribe and unsubscribe short-circuit while the subscriber is not ready', async () => {
  const service = buildService(false);
  subscriber().isReady = false;
  const listener = jest.fn();

  await expect(service.subscribe('channel', listener)).resolves.toBe(false);
  await service.unsubscribe('channel');

  expect(subscriber().subscribe).not.toHaveBeenCalled();
  expect(subscriber().unsubscribe).not.toHaveBeenCalled();

  subscriber().isReady = true;
  await expect(service.subscribe('channel', listener)).resolves.toBe(true);
  expect(subscriber().subscribe).toHaveBeenCalledWith('channel', listener);
});

test('quits only clients that are still open on module destroy', async () => {
  const service = buildService(false);
  subscriber().isOpen = false;

  await service.onModuleDestroy();

  expect(publisher().quit).toHaveBeenCalledTimes(1);
  expect(subscriber().quit).not.toHaveBeenCalled();
});

function buildService(required: boolean) {
  const config = {
    get: jest.fn((key: string) => (key === 'REDIS_URL' ? 'redis://localhost:6379' : required)),
  };
  return new RedisService(config as never);
}

function publisher(): MockRedisClient {
  return client(0);
}

function subscriber(): MockRedisClient {
  return client(1);
}

function client(index: number): MockRedisClient {
  const instance = mockClients[index];
  if (!instance) throw new Error(`mock redis client ${index} was not created`);
  return instance;
}
