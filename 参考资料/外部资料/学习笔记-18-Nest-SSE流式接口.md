---
title: "Nest + LangChain + SSE 流式接口"
date: 2026-10-22
tags: [外部资料, NestJS, SSE, LangChain, 流式]
kind: reference
track: 外部资料
source: 根据 ai-god-learn 第18章与 `18-Nest-LangChain-SSE面试题.md` 整理
---

# Nest + LangChain + SSE 流式接口

> 补齐学习路线中缺失的「Nest 流式 AI 接口」主题，对应题库 `18-Nest-LangChain-SSE面试题.md`。

## 为什么用 SSE

- 普通 HTTP 要等模型完整生成后才返回，首字节延迟高。
- SSE 可以边生成边推送，用户更快看到内容。
- 浏览器原生支持 `EventSource`，实现成本低；服务端保持单向流即可，比 WebSocket 更轻。

## Nest 里的最小实现

```typescript
@Sse('chat/stream')
chatStream(@Query('query') query: string): Observable<MessageEvent> {
  return from(this.aiService.streamChain(query)).pipe(
    map((chunk) => ({ data: chunk })),
  );
}
```

关键点：

1. Controller 用 `@Sse()` 声明流式端点。
2. 返回 `Observable<MessageEvent>`。
3. 每个增量包装成 `{ data: chunk }`。
4. 流结束时 Observable 完成，连接关闭。

## LangChain 的同步与流式

- 同步：`chain.invoke()`，一次拿完整结果。
- 流式：`chain.stream()`，用 `for await` 逐段产出。
- 接口层用 `AsyncGenerator` 包一层，Controller 再转成 Observable。

```typescript
async *streamChain(query: string): AsyncGenerator<string> {
  const stream = await this.chain.stream({ query });
  for await (const chunk of stream) {
    yield chunk;
  }
}
```

## 依赖注入与模型配置

模型初始化依赖 API Key、Base URL 和模型名，推荐用 `useFactory` 读取 `ConfigService`：

```typescript
{
  provide: 'CHAT_MODEL',
  useFactory: (config: ConfigService) => new ChatOpenAI({
    modelName: config.get('MODEL_NAME'),
    apiKey: config.get('OPENAI_API_KEY'),
    configuration: { baseURL: config.get('OPENAI_BASE_URL') },
  }),
  inject: [ConfigService],
}
```

好处：业务 Service 不关心模型怎么创建，测试时可以替换成 mock。

## 流式接口的工程问题

- 输入校验：空 query 直接 400，避免浪费模型调用。
- 取消：客户端断开时取消上游模型请求，避免继续计费。
- 超时：设置总超时和心跳，防止连接长时间挂起。
- 错误：流中错误要转成结构化事件，不把堆栈推给前端。
- 幂等：流结束不代表业务提交成功，保存/评估要单独确认。
- 观测：记录首字节延迟、总耗时、Token、错误码和 traceId。

## 前端消费

- `EventSource` 监听 `message`，持续拼接内容。
- 自定义 `done` 事件表示服务端完成。
- `error` 时关闭连接并提示重试；注意区分网络错误和服务端错误。
- 组件卸载时主动 `close()`，避免泄漏和重复请求。

## 面试怎么讲

先讲「为什么要流式」，再讲 Nest `@Sse` + Observable 的最小实现，最后补取消、超时、错误和幂等。能说出「流结束不等于事务成功」和「客户端断开要取消上游模型调用」，就能从 API 用法升级到生产设计。
