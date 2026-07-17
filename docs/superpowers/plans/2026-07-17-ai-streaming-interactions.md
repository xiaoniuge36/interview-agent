# AI 流式交互实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让用户自配模型在模拟面试与单题评价中真实流式输出用户可读正文，并仅在校验和持久化成功后提交正式结果。

**Architecture:** Product API 将供应商 SSE 归一化为文本增量，以受限字段解码器仅提取 `content` 或 `feedback`，再通过 POST SSE 发送固定阶段、delta、最终 result 或安全 error。User Portal 以一个认证 fetch-SSE 客户端管理 abort、事件解析与状态更新；正式业务状态只由 result 更新。

**Tech Stack:** NestJS 11、TypeScript、Prisma、Zod、Next.js 15、React 18、Vitest、Jest。

## Global Constraints

- 直接在用户授权的 `main` 工作区修改；不创建分支、不提交、不覆盖任何无关的脏工作区改动。
- 不增加数据库迁移、队列或 Worker；保留既有非流式端点、模型连接测试和访谈恢复 SSE。
- SSE 只传固定阶段、白名单字段 delta、提交后的 result 和安全 error；不得发送原始供应商 payload、提示词、密钥或隐藏推理。
- `result` 只能在 Zod 校验、租户/版本校验、事务与审计全部成功后发送。
- 采用 TypeScript 严格类型；每个新增/调整的函数保持单一职责且不超过 50 行。

---

## 文件结构

- `packages/contracts/src/schemas/ai-operation-stream.ts`：共享流事件的 Zod 契约。
- `apps/product-api/src/common/streaming/*`：SSE 写入、增量 JSON 字段提取和安全错误映射。
- `apps/product-api/src/modules/model-credential/model-provider.client.ts`：供应商真实 SSE adapter。
- `apps/product-api/src/modules/practice/*`：评价流服务、端点与测试。
- `apps/product-api/src/modules/interview/*`：复用命令租约的面试流执行与端点。
- `apps/user-portal/src/lib/ai-operation-stream.ts`：认证 POST SSE 解析器。
- `apps/user-portal/src/hooks/useAiOperationStream.ts`：生命周期、abort 和 reducer 状态。
- `apps/user-portal/src/components/practice/player/*` 与 `components/interview/*`：阶段、临时文本和最终结果 UI。

### Task 1: 共享流事件契约与前端帧解析

**Files:**

- Create: `packages/contracts/src/schemas/ai-operation-stream.ts`
- Modify: `packages/contracts/src/index.ts`
- Create: `packages/contracts/src/schemas/ai-operation-stream.test.ts`
- Create: `apps/user-portal/src/lib/ai-operation-stream.test.ts`

**Interfaces:**

- Produces `AiOperationStreamEventSchema`、`AiOperationPhase`、`AiOperationStreamEvent`。
- 事件公共字段为 `operationId`、`occurredAt`、`traceId`；`delta.channel` 仅允许 `interviewer_content` 或 `evaluation_feedback`。

- [ ] **Step 1: 写失败的契约测试**

```ts
assert.equal(
  AiOperationStreamEventSchema.safeParse({ type: 'delta', channel: 'secret', content: 'x' })
    .success,
  false,
);
assert.equal(AiOperationStreamEventSchema.safeParse(validPhase).success, true);
```

- [ ] **Step 2: 运行契约测试，确认新增模块尚不存在**

Run: `pnpm --filter @interview-agent/contracts test`

- [ ] **Step 3: 定义 discriminated union 并从 contracts index 导出**

```ts
export const AiOperationStreamEventSchema = z.discriminatedUnion('type', [
  AiOperationPhaseEventSchema,
  AiOperationDeltaEventSchema,
  AiOperationResultEventSchema,
  AiOperationErrorEventSchema,
]);
```

- [ ] **Step 4: 为文本 SSE 分帧与 schema 拒绝测试实现前端纯函数**

```ts
export function parseAiOperationSse(buffer: string): {
  frames: AiOperationStreamEvent[];
  remainder: string;
};
```

- [ ] **Step 5: 运行 contracts 与 portal 定向测试**

Run: `pnpm --filter @interview-agent/contracts test && pnpm --filter @interview-agent/user-portal test -- ai-operation-stream`

### Task 2: 供应商真实流与受限字段增量解码

**Files:**

- Modify: `apps/product-api/src/modules/model-credential/model-provider.client.ts`
- Create: `apps/product-api/src/modules/model-credential/model-provider.client.spec.ts`
- Create: `apps/product-api/src/common/streaming/incremental-json-field-decoder.ts`
- Create: `apps/product-api/src/common/streaming/incremental-json-field-decoder.spec.ts`

**Interfaces:**

- Produces `ModelProviderClient.stream(input): AsyncGenerator<string>`；`complete()` 以此流拼接，连接测试行为不变。
- Produces `IncrementalJsonFieldDecoder.push(chunk): string[]` 与 `complete(): string`，只接受构造时传入的白名单字段。

- [ ] **Step 1: 先写 OpenAI、Anthropic、跨 chunk、`[DONE]` 和异常帧失败测试**

```ts
await expect(collect(client.stream(input))).resolves.toEqual(['你', '好']);
expect(() => decoder.push('{"reasoning":"x"}')).not.toEmit();
```

- [ ] **Step 2: 运行 ModelProviderClient 与 decoder 测试，确认失败**

Run: `pnpm --filter @interview-agent/product-api test -- model-provider incremental-json-field-decoder`

- [ ] **Step 3: 实现带 30 秒 timeout、帧/累计大小限制的供应商 SSE adapter**

```ts
for await (const line of readSseLines(response.body)) {
  const delta = provider === 'anthropic' ? anthropicDelta(line) : compatibleDelta(line);
  if (delta) yield delta;
}
```

- [ ] **Step 4: 实现可跨 chunk 处理 JSON 转义与 Unicode 的字段字符串 decoder**

```ts
const visible = new IncrementalJsonFieldDecoder('feedback');
const deltas = visible.push(providerDelta);
```

- [ ] **Step 5: 运行定向后端测试**

Run: `pnpm --filter @interview-agent/product-api test -- model-provider incremental-json-field-decoder`

### Task 3: 单题评价 POST SSE

**Files:**

- Modify: `apps/product-api/src/modules/practice/practice-model-evaluator.ts`
- Modify: `apps/product-api/src/modules/practice/practice-evaluation-command.service.ts`
- Modify: `apps/product-api/src/modules/practice/practice.service.ts`
- Modify: `apps/product-api/src/modules/practice/practice.controller.ts`
- Create: `apps/product-api/src/modules/practice/practice-evaluation-stream.spec.ts`

**Interfaces:**

- Produces `PracticeService.evaluateStream(command, sink)`，在已有评价时直接下发 result。
- Adds `POST /practices/:id/items/:itemId/evaluate/stream`，响应 `text/event-stream`。

- [ ] **Step 1: 写 phase → delta → validating → saving → result 的失败测试**

```ts
expect(events.map((event) => event.type)).toEqual([
  'phase',
  'phase',
  'delta',
  'phase',
  'phase',
  'result',
]);
```

- [ ] **Step 2: 运行 practice 流测试，确认端点与服务尚未实现**

Run: `pnpm --filter @interview-agent/product-api test -- practice-evaluation-stream`

- [ ] **Step 3: 为 evaluator 增加仅反馈字段的流式 draft 入口**

```ts
async evaluateStream(context, input, onDelta): Promise<PracticeEvaluationDraft>;
```

- [ ] **Step 4: 在既有读校验和 Serializable 事务外包裹阶段事件，并复用保存逻辑**

```ts
await sink.phase('saving');
const result = await this.persistEvaluation(command, draft);
await sink.result({ operation: 'practice_evaluation', result });
```

- [ ] **Step 5: Controller 设置 SSE header、heartbeat、close/abort 行为并映射安全 error**

```ts
response.setHeader('Content-Type', 'text/event-stream');
request.on('close', () => abortController.abort());
```

- [ ] **Step 6: 运行 practice 流和既有评价回归测试**

Run: `pnpm --filter @interview-agent/product-api test -- practice-evaluation`

### Task 4: 面试命令 POST SSE

**Files:**

- Modify: `apps/product-api/src/modules/agent-runtime/user-model-runtime.client.ts`
- Modify: `apps/product-api/src/modules/agent-runtime/agent-runtime.client.ts`
- Modify: `apps/product-api/src/modules/interview/interview-command.service.ts`
- Modify: `apps/product-api/src/modules/interview/interview-event.factory.ts`
- Modify: `apps/product-api/src/modules/interview/interview.controller.ts`
- Create: `apps/product-api/src/modules/interview/interview-stream.spec.ts`

**Interfaces:**

- Adds `POST /interviews/:id/advance/stream` and `POST /interviews/:id/answer/stream` with existing bodies and `Idempotency-Key`.
- Command execution receives optional `onProgress` callback and returns the existing `InterviewCommandResult` only after completion transaction commits.

- [ ] **Step 1: 写命令租约、版本冲突、完整持久化前无 result 和成功顺序的失败测试**

```ts
expect(events.at(-1)).toMatchObject({ type: 'result', operation: 'interview_next' });
expect(events.some((event) => event.type === 'result')).toBe(false);
```

- [ ] **Step 2: 运行 interview 流测试，确认失败**

Run: `pnpm --filter @interview-agent/product-api test -- interview-stream`

- [ ] **Step 3: 将用户模型 runtime 改为 stream + content 白名单 decoder，并收集完整 JSON 后校验**

```ts
await runtime.next(input, { onContentDelta: sink.delta });
```

- [ ] **Step 4: 让 command service 在保留命令租约、幂等和审计边界下发阶段并等待原 completion handler**

```ts
const result = await this.execute(command, { onProgress: sink.phase, onDelta: sink.delta });
await sink.result({ operation: 'interview_next', result, basisSummary });
```

- [ ] **Step 5: 停止 event factory 伪造 token，保留 GET SSE 的恢复事件兼容**

```ts
return persistedEvents.filter((event) => event.type !== 'token');
```

- [ ] **Step 6: 运行面试流与现有命令回归测试**

Run: `pnpm --filter @interview-agent/product-api test -- interview`

### Task 5: 用户端通用流 hook 与练习体验

**Files:**

- Create: `apps/user-portal/src/hooks/useAiOperationStream.ts`
- Modify: `apps/user-portal/src/lib/practice-api.ts`
- Modify: `apps/user-portal/src/components/practice/player/practice-player-actions.ts`
- Modify: `apps/user-portal/src/components/practice/player/PracticeCoachPanel.tsx`
- Create: `apps/user-portal/src/hooks/useAiOperationStream.test.tsx`
- Create: `apps/user-portal/src/components/practice/player/PracticeCoachPanel.test.tsx`

**Interfaces:**

- Produces `runAiOperationStream({ path, body, onResult }): Promise<void>` with Authorization header, AbortController and typed reducer state.
- `evaluatePracticeItemStream()` calls the new endpoint and returns formal feedback only from result.

- [ ] **Step 1: 写 abort、分帧累积、error requestId 和 result 前不展示评分的失败测试**

```tsx
expect(screen.queryByText('本题得分')).not.toBeInTheDocument();
await user.click(screen.getByRole('button', { name: '调用我的模型评价' }));
expect(await screen.findByText('正在组织评价')).toBeVisible();
```

- [ ] **Step 2: 运行 portal 定向测试，确认失败**

Run: `pnpm --filter @interview-agent/user-portal test -- useAiOperationStream PracticeCoachPanel`

- [ ] **Step 3: 实现不泄露原始帧的 fetch-SSE hook，并在卸载/新操作时 abort 旧流**

```ts
const response = await fetch(apiUrl(path), { method: 'POST', headers, body, signal });
for await (const event of readAiOperationEvents(response.body)) dispatch({ type: 'event', event });
```

- [ ] **Step 4: 用 stream 结果替换评价的等待整包调用，并渲染阶段与临时 feedback**

```tsx
{
  stream.visibleText ? <p className="practice-stream-preview">{stream.visibleText}</p> : null;
}
```

- [ ] **Step 5: 运行练习交互定向测试**

Run: `pnpm --filter @interview-agent/user-portal test -- useAiOperationStream PracticeCoachPanel`

### Task 6: 用户端面试临时消息与最终替换

**Files:**

- Modify: `apps/user-portal/src/lib/interview-stream.ts`
- Modify: `apps/user-portal/src/hooks/useInterviewController.ts`
- Modify: `apps/user-portal/src/components/interview/interview-state.ts`
- Modify: `apps/user-portal/src/components/interview/RuntimeEventList.tsx`
- Create: `apps/user-portal/src/hooks/useInterviewController.test.tsx`

**Interfaces:**

- `advanceInterviewStream`、`answerInterviewStream` 发送 POST SSE。
- state 包含当前操作 phase、临时 interviewer content、basis summary；result 以正式 session 替换临时文本。

- [ ] **Step 1: 写首 token 前阶段可见、临时消息追加、result 替换且无重复 turn 的失败测试**

```tsx
expect(screen.getByText('正在组织下一轮追问')).toBeVisible();
expect(screen.getByText('请具体说明')).toBeVisible();
await waitFor(() => expect(screen.queryByTestId('temporary-interviewer-message')).toBeNull());
```

- [ ] **Step 2: 运行面试 portal 定向测试，确认失败**

Run: `pnpm --filter @interview-agent/user-portal test -- useInterviewController`

- [ ] **Step 3: 接入通用 stream hook，取消当前 POST 对旧 GET SSE token 的依赖**

```ts
await answerInterviewStream(session.id, body, streamHandlers);
dispatch({ type: 'stream_result', session: result.session, basisSummary: result.basisSummary });
```

- [ ] **Step 4: 渲染固定阶段、临时 AI 气泡和最多三条依据摘要；无摘要不渲染容器**

```tsx
{
  basisSummary.length ? (
    <ul>
      {basisSummary.slice(0, 3).map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  ) : null;
}
```

- [ ] **Step 5: 保持 GET SSE 对恢复/报告事件的处理并忽略当前 POST 的兼容 token**

```ts
case 'token': return; // 仅新 POST 操作期间忽略旧伪流 token
```

- [ ] **Step 6: 运行面试 portal 定向测试**

Run: `pnpm --filter @interview-agent/user-portal test -- useInterviewController`

### Task 7: 完整质量门禁与浏览器验收

**Files:**

- Modify only as required by test/lint/typecheck findings in Tasks 1–6.

- [ ] **Step 1: 执行 contracts、API 与 portal 的测试、类型和 lint**

Run: `pnpm --filter @interview-agent/contracts test && pnpm --filter @interview-agent/product-api test && pnpm --filter @interview-agent/product-api typecheck && pnpm --filter @interview-agent/product-api lint && pnpm --filter @interview-agent/user-portal test && pnpm --filter @interview-agent/user-portal typecheck && pnpm --filter @interview-agent/user-portal lint`

- [ ] **Step 2: 构建 User Portal 并检查本次文件格式/差异**

Run: `pnpm --filter @interview-agent/user-portal build && pnpm exec prettier --check packages/contracts/src/schemas/ai-operation-stream.ts packages/contracts/src/index.ts apps/product-api/src/common/streaming apps/product-api/src/modules/model-credential/model-provider.client.ts apps/product-api/src/modules/practice/practice-model-evaluator.ts apps/product-api/src/modules/practice/practice-evaluation-command.service.ts apps/product-api/src/modules/practice/practice.service.ts apps/product-api/src/modules/practice/practice.controller.ts apps/product-api/src/modules/interview apps/product-api/src/modules/agent-runtime/user-model-runtime.client.ts apps/product-api/src/modules/agent-runtime/agent-runtime.client.ts apps/user-portal/src/lib/ai-operation-stream.ts apps/user-portal/src/lib/practice-api.ts apps/user-portal/src/hooks/useAiOperationStream.ts apps/user-portal/src/hooks/useInterviewController.ts apps/user-portal/src/components/practice/player apps/user-portal/src/components/interview && git diff --check -- packages/contracts/src apps/product-api/src/common/streaming apps/product-api/src/modules/model-credential/model-provider.client.ts apps/product-api/src/modules/practice/practice-model-evaluator.ts apps/product-api/src/modules/practice/practice-evaluation-command.service.ts apps/product-api/src/modules/practice/practice.service.ts apps/product-api/src/modules/practice/practice.controller.ts apps/product-api/src/modules/interview apps/product-api/src/modules/agent-runtime/user-model-runtime.client.ts apps/product-api/src/modules/agent-runtime/agent-runtime.client.ts apps/user-portal/src/lib/ai-operation-stream.ts apps/user-portal/src/lib/practice-api.ts apps/user-portal/src/hooks/useAiOperationStream.ts apps/user-portal/src/hooks/useInterviewController.ts apps/user-portal/src/components/practice/player apps/user-portal/src/components/interview`

- [ ] **Step 3: 用可控流式 mock 验证桌面和 390px UI**

```text
练习/面试进入操作 → 首 token 前固定阶段可见 → delta 逐字追加 → result 后出现正式评分或 turn → error 显示安全信息与 requestId。
```

- [ ] **Step 4: 记录无法用真实用户密钥自动化验证的边界**

```text
不在浏览器自动化中使用用户 API Key；以 mock SSE 证明 UI 合约，以单元测试证明供应商帧归一化。
```
