# AI 调用日志与双端统计设计

## 目标

为用户自带模型（BYOK）的实际调用建立安全、可检索的调用日志和聚合统计：用户只看自己的使用情况，平台管理员看全站运行健康。首期覆盖模型连接测试、单题 AI 评价和模拟面试；不记录 API Key、Authorization、完整提示词、用户回答正文、模型正文或供应商原始响应。

## 参考与边界

参考 CPA-Manager-Plus 的“请求历史 + 多维聚合 + 失败诊断”模式，但不引入网关、配额探测、价格同步或成本估算。仅在供应商响应包含 usage 时保存 token 数；缺失时界面显示“未提供”，不得猜测价格或 token。

日志保留 90 天。没有新增 Worker 或队列：`AiInvocationService` 在首次成功记录后以进程内每日一次的机会性清理删除过期数据；即使清理失败，模型调用与训练流程不得失败。

## 数据模型

新增 Prisma `AiInvocation` 表和两个枚举：

```text
AiInvocationOperation = model_connection_test | practice_evaluation | interview_next
AiInvocationStatus = succeeded | failed | cancelled
```

字段：

```text
id, tenantId, userId, credentialId?, sessionId?, practiceSessionId?, practiceItemId?
operation, provider, model, status, traceId
inputTokens?, outputTokens?, cacheReadTokens?, reasoningTokens?, totalTokens?
latencyMs?, errorCode?, startedAt, finishedAt, createdAt
```

索引：`[tenantId,userId,createdAt]`、`[tenantId,provider,model,createdAt]`、`[tenantId,status,createdAt]`、`[traceId]`。外键只连接 tenant、user 和 credential；业务会话字段保持普通 ID，避免历史清理、级联删除和兼容旧训练数据时的复杂耦合。

## 采集流程

`ModelProviderClient` 继续隐藏供应商差异，同时通过可选 `onUsage` 回调标准化可用 usage：

- OpenAI Compatible：`prompt_tokens`、`completion_tokens`、`total_tokens`，以及可选 cache/reasoning 明细。
- Anthropic：`input_tokens`、`output_tokens`、`cache_read_input_tokens`。

`AiInvocationService.measure()` 接收安全元数据和实际 provider 调用闭包。它以 `performance.now()` 测量耗时，接收 usage 回调，在成功、失败或 Abort 后写入一条终态日志。记录写入失败只记服务端日志，不影响调用的业务结果；错误只保存既有公开错误码。

调用方：

1. `ModelCredentialService.testConnection()` 记录 `model_connection_test`。
2. `PracticeModelEvaluator.evaluate/evaluateStream()` 记录 `practice_evaluation`。
3. `UserModelRuntimeClient.next/nextStream()` 记录 `interview_next`。

`AgentRun` 继续承担模拟面试命令租约、状态机和审计，不替代逐次模型调用日志。

## API 与权限

共享 contracts 新增：`AiUsagePeriod`（today/7d/30d）、用户摘要、用户最近调用、管理端聚合、模型/提供商 breakdown、失败码 breakdown 和日趋势。

```text
GET /ai-usage/summary?period=7d
GET /admin/ai-analytics?period=7d&provider?&operation?
```

第一个端点强制 `model_credential:read` 并以当前 `tenantId + userId` 过滤。第二个端点强制 `analytics:read` 且仅平台管理员可访问。两端均不返回输入、输出、密钥或供应商原始错误。

## 界面

用户端在“设置中心 → AI 模型”增加“我的 AI 使用情况”：调用次数、成功率、平均耗时、已返回 token、按模型分布、最近 10 次调用。没有记录时显示空态；没有 usage 时显示“供应商未提供 token 用量”。

管理端在现有“数据看板”增加“AI 调用洞察”：时间范围、提供商与操作筛选；全站调用量、成功率、平均耗时、token、按模型/提供商排行、失败码分布和最近失败调用。现有 `AgentRun` 运行质量卡继续保留。

## 错误与隐私

- 不持久化 prompt、completion、用户回答、API Key、Authorization 或原始 payload。
- `MODEL_PROVIDER_RESPONSE_INVALID`、鉴权、限流、超时、网络错误等只保留公开 code。
- 中断在供应商请求开始后记录为 `cancelled`；调用尚未开始的授权/参数校验失败继续走标准 HTTP 错误，不创建伪日志。
- 写日志或清理失败不阻断面试、评价和连接测试。

## 测试与验收

- Prisma schema/migration 验证，并覆盖租户隔离、90 天清理与日志降级不影响业务。
- provider usage 适配覆盖 OpenAI Compatible、Anthropic、缺失 usage 与流式 final usage。
- 用户端只读取当前用户统计；管理端的 provider/operation/range 聚合、失败码和趋势正确。
- 组件测试覆盖空态、未提供 usage、成功/失败状态；桌面与 390px 不溢出。
- Contracts、Product API、Admin Console、User Portal 的 test/typecheck/lint/build，以及相关浏览器验收通过。

## 非目标

- 不做费用估算、价格表、预算告警或配额自动管理。
- 不接入第三方遥测、网关或将日志发送到外部。
- 不改变 API Key 的加密存储和现有训练命令幂等语义。
