# 用户端 AI 流式交互设计

## 目标

将用户端真实模型调用从“等待整包结果”升级为真实增量流式交互，首期覆盖：

1. 模拟面试开始、提交回答后的下一题生成。
2. 练习空间的单题 AI 评价。

模型连接测试继续使用一次性请求。用户界面展示应用阶段、用户可见正文增量，以及完成后的结构化依据摘要；不展示隐藏 Chain-of-Thought、系统提示词或供应商原始事件。

## 当前问题

- `ModelProviderClient.complete()` 等待供应商返回完整 JSON，没有上游增量读取。
- 模拟面试虽然存在 `token` SSE 事件，但事件是在完整模型 JSON 返回后由 `createInterviewEvents()` 按字符切片生成，属于伪流式。
- 面试客户端在命令请求完成后才连接 GET SSE，因此模型等待期间无法收到进度。
- 单题评价调用 `evaluatePracticeItem()` 后等待完整响应，只能显示“模型评价中…”。
- 评分和追问结果必须经过共享 schema 校验与数据库事务落库，不能直接信任未完成的 token。

## 设计决策

采用“直接 HTTP 流式响应 + 现有持久化结果”方案：

- 新增 Product API 流式端点，使用 `fetch()` 发起 POST，并读取 `text/event-stream` 响应。
- Product API 从模型供应商真实流中读取增量，归一化为内部 text delta。
- 流式端点发送应用阶段、可见正文增量、最终结果或错误事件。
- 完整模型输出仍由现有 Zod schema 校验；最终数据库事务成功后才发送 `result`。
- 原有非流式端点保留，供兼容和回退使用。
- 模拟面试现有 GET SSE 继续负责会话恢复、跨页面同步和最终状态回放，不再承担当前操作的首屏实时输出。
- `createInterviewEvents()` 停止对完整内容按字符生成伪 `token`；共享 `token` 类型暂时保留兼容，但新事件工厂只持久化工作流、阶段、正式 turn、报告和错误里程碑。
- 不引入数据库迁移、任务 Worker 或新的持久化队列表。

不采用以下方案：

- 仅前端模拟进度：无法满足真实模型流式要求。
- 异步任务 + 可恢复事件流：可靠性更强，但需要任务表、Worker、恢复调度和迁移，超出首期交互优化范围。

## 事件协议

在 `packages/contracts` 新增共享 `AiOperationStreamEventSchema`。所有事件使用 SSE `event` 与 JSON `data` 帧，公共字段包含：

- `operationId`：当前用户操作的唯一标识。
- `occurredAt`：ISO 时间。
- `traceId`：服务端链路追踪标识。

事件类型：

### `phase`

```ts
{
  type: 'phase';
  phase: 'preparing' | 'analyzing' | 'composing' | 'validating' | 'saving';
  label: string;
}
```

`label` 由服务端映射表生成，不接受模型自由输出。推荐文案：

- `preparing`：正在连接你的默认模型
- `analyzing`：正在提取回答中的有效证据
- `composing`：正在组织评价或下一轮追问
- `validating`：正在核对模型结果
- `saving`：正在保存本轮结果

### `delta`

```ts
{
  type: 'delta';
  channel: 'interviewer_content' | 'evaluation_feedback';
  content: string;
}
```

只发送允许展示的 JSON 字符串字段内容：模拟面试发送 `content`，单题评价发送 `feedback`。不得转发完整原始 JSON、供应商 reasoning 字段或工具参数。

### `result`

使用操作类型区分最终数据：

```ts
type AiOperationResultEvent =
  | {
      type: 'result';
      operation: 'interview_next';
      result: InterviewCommandResult;
      basisSummary: string[];
    }
  | {
      type: 'result';
      operation: 'practice_evaluation';
      result: PracticeItemFeedback;
    };
```

`result` 仅在 schema 校验、并发校验、数据库事务和审计记录全部成功后发送。

### `error`

```ts
{
  type: 'error';
  code: string;
  message: string;
  requestId?: string;
  retryable: boolean;
}
```

消息沿用 Product API 的用户安全错误映射。不得把模型供应商原始响应、内部服务名或密钥写入事件。

### `heartbeat`

长时间无 token 时每 15 秒发送 SSE 注释心跳，前端不渲染。

## 模型供应商增量适配

`ModelProviderClient` 新增 `stream()`，返回 `AsyncGenerator<string>`：

- OpenAI、DeepSeek、Qwen、OpenAI Compatible：请求体设置 `stream: true`，解析 `data:` 帧中的 `choices[0].delta.content`，忽略 `[DONE]`。
- Anthropic：请求体设置 `stream: true`，解析 `content_block_delta` 事件中的 `delta.text`。
- 统一限制响应体大小、单帧大小、累计字符数和 30 秒模型超时。
- 供应商 HTTP 状态继续映射为现有 `ModelProviderError`。
- `complete()` 改为消费 `stream()` 并拼接文本，使连接测试和兼容调用复用同一供应商实现。

模型仍输出单个结构化 JSON。流解析器累计完整文本，同时通过增量 JSON 字符串字段解码器，仅提取允许展示的字段。解码器必须处理跨 chunk、转义字符和 Unicode，不得把不完整 JSON 交给 `JSON.parse()`。

模型提示词要求把允许展示的字符串字段放在 JSON 前部：面试先输出 `content`，评价先输出 `feedback`。供应商未遵循字段顺序时，前端继续显示阶段状态，最终结果仍以完整 JSON 校验为准。

## 单题 AI 评价数据流

新增：

```text
POST /api/practices/:sessionId/items/:itemId/evaluate/stream
Accept: text/event-stream
```

执行顺序：

1. 校验租户、用户、练习状态和已保存回答。
2. 若已有评价，直接发送 `result`，不再次调用模型。
3. 发送 `preparing`，解析用户默认模型凭据。
4. 发送 `analyzing`，开始真实供应商流。
5. 增量提取 `feedback` 并发送 `evaluation_feedback` delta。
6. 模型流结束后发送 `validating`，执行完整 JSON 与 `PracticeEvaluationSchema` 校验。
7. 发送 `saving`，执行现有 Serializable 事务、回答版本检查、评价 upsert 和审计。
8. 事务提交后发送 `result` 并关闭流。

前端禁用同一题的重复提交。连接在 `saving` 前断开时，服务端中止上游模型请求且不发送成功事件；进入 `saving` 后允许既有事务完成。用户已保存回答不受影响；重试时若第一次请求已经落库，步骤 2 直接回放最终结果。首期不承诺两个并发评价流共享同一次供应商调用，数据库唯一键和回答版本检查仍负责最终一致性。

## 模拟面试数据流

新增流式端点：

```text
POST /api/interviews/:sessionId/advance/stream
POST /api/interviews/:sessionId/answer/stream
Accept: text/event-stream
Idempotency-Key: interview-advance|answer:<uuid>
```

请求体继续使用现有 `AdvanceInterviewInput` 和 `SubmitInterviewAnswerInput`。

执行顺序：

1. 复用现有命令租约、幂等键、版本校验和审计边界。
2. 发送 `preparing`，解析用户默认模型。
3. 发送 `analyzing`，构建会话历史与当前回答上下文。
4. 发送 `composing`，开始供应商真实流。
5. 增量提取模型 JSON 的 `content` 字段并发送 `interviewer_content` delta。
6. 完整响应结束后发送 `validating`，校验 `AgentRuntimeNextResponseSchema`。
7. 发送 `saving`，完成现有面试命令事务、会话状态、turn、报告和审计写入。
8. 提交后发送带 `InterviewCommandResult` 的 `result`。
9. 现有 GET SSE 继续发布持久化后的阶段、turn 和报告事件，客户端按 `eventId` 去重。

`basisSummary` 是模型最终结构化输出中的可选用户可读依据，最多 3 条，每条为简短证据或待验证缺口。该字段写入面试 turn 的 `structuredPayload`，不改变数据库 schema。

`AgentRuntimeNextResponseSchema` 增加可选 `basisSummary`，保持 `interview-runtime.v1` 对旧 Agent Runtime 响应向后兼容。用户模型提示词要求生成该字段；Python Agent Runtime 和本地 fallback 可继续省略。

## 用户端交互

新增通用 `useAiOperationStream()`：

- 使用认证头和 `fetch()` 发起 POST 流。
- 复用 SSE 分帧基础能力，但使用新的事件 schema。
- 维护 `phase`、`visibleText`、`result`、`error` 和 `connected` 状态。
- 组件卸载或新操作开始时 abort 旧流。
- 收到 `result` 后才更新正式业务状态并显示成功 Toast。
- 收到 `error` 或连接异常时保留用户输入，展示统一失败 Toast 和重试入口。

单题评价界面：

- 原按钮进入流式状态后禁用重复提交。
- 显示五阶段进度，已完成、当前和待处理状态可区分。
- `feedback` delta 实时追加到预览区。
- 分数、missingPoints、rubricScores 和 followUpQuestion 仅在 `result` 后展示。

模拟面试界面：

- 提交回答后立即显示阶段进度。
- `interviewer_content` delta 追加到临时 AI 消息气泡。
- `result` 后用正式 session turn 替换临时消息，避免重复。
- 完成后显示最多 3 条 `basisSummary`；无该字段时不显示空容器。
- GET SSE 只处理当前 POST 流未覆盖的恢复事件和后台报告事件。
- 用户端忽略当前 POST 操作对应的兼容 `token` 事件；正式 `turn_completed` 仍用于恢复和跨页面同步。

## 错误与恢复

- 认证、租户、权限、版本冲突在开始模型调用前失败，并使用标准错误 envelope。
- 模型认证失败、限流、超时和供应商不可用映射为可重试 `error`。
- 模型返回无效 JSON 或 schema 不符时发送不可重试 `MODEL_PROVIDER_RESPONSE_INVALID`，提示测试或更换模型。
- 事务失败时不得发送 `result`；现有 Serializable 精确重试规则保持不变。
- 前端不得用已接收的 delta 构造最终分数或正式 turn。
- 页面刷新后通过现有 session/evaluation 查询恢复最终结果，不恢复未完成 token。

## 安全与隐私

- API Key 只在 Product API 内存中解密并用于当前供应商请求。
- 日志、SSE、审计和数据库都不得记录 API Key、Authorization header 或供应商原始响应。
- 阶段文案由应用固定映射生成。
- 不请求或输出隐藏 Chain-of-Thought。
- `basisSummary` 只允许引用用户回答、岗位要求和评分标准中的可解释证据。
- 所有流式端点继续执行现有租户和所有权校验。

## 测试策略

### Contracts

- 流事件 discriminated union 的成功、非法字段和越界测试。
- `result` 的两种操作类型测试。

### Product API

- OpenAI Compatible SSE、Anthropic SSE、跨 chunk、转义 Unicode、`[DONE]` 和异常帧测试。
- 增量 JSON 字符串字段解码器测试，证明只输出白名单字段。
- 单题评价 phase → delta → validating → saving → result 顺序测试。
- 面试命令幂等、版本冲突、重复请求和事务失败不发 result 测试。
- 用户、租户隔离与 requestId 错误事件测试。

### User Portal

- SSE 分帧、事件 reducer、delta 拼接和重复事件测试。
- 单题评价只在 result 后展示分数测试。
- 面试临时消息被正式 turn 替换且不重复测试。
- 流失败保留回答、显示后端 message/requestId 测试。

### 渲染验证

- 桌面和 390px 移动端验证阶段列表、流式文本、完成态和错误态。
- 检查无布局跳动、文本溢出、框架错误覆盖层和相关控制台错误。

## 验收标准

1. 模拟面试和单题评价都从供应商真实 stream 读取增量，不再对完整结果定时或按字符伪切片。
2. 用户在模型首个 token 前能看到明确阶段状态。
3. 可见正文随供应商增量逐步更新。
4. 最终分数、正式 turn 和成功 Toast 只在 schema 校验及数据库提交后出现。
5. 任何界面和事件都不包含隐藏推理链、系统提示词、密钥或供应商原始 payload。
6. 断线或失败不会丢失用户已保存的回答。
7. 原有非流式端点、模型连接测试和会话恢复流程继续可用。
8. Contracts、Product API、User Portal、lint、typecheck、build 和相关浏览器验证全部通过。
