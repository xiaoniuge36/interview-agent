import { Throttle } from '@nestjs/throttler';

type AiThrottleOptions = { ttl: number; limit: number };

// 与 environment.ts 默认值一致；启动后由 AppModule 用已校验的环境值覆盖
let configured: AiThrottleOptions = { ttl: 60_000, limit: 30 };

/** 启动时注入已校验的环境配置。装饰器在 import 期求值，无法直接读 ConfigService，故延迟到请求期解析。 */
export function configureAiThrottle(options: AiThrottleOptions) {
  configured = options;
}

/**
 * 昂贵 AI 接口（LLM 命令/评测/补全、Embedding 检索）专用限流。
 * 覆盖该路由的默认限流额度：普通浏览接口不受影响，单 IP 刷 AI 接口时先于全局限流拦截，保护模型成本。
 */
export function AiThrottle() {
  return Throttle({
    default: { ttl: () => configured.ttl, limit: () => configured.limit },
  });
}
