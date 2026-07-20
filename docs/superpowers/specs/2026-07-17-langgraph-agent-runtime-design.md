# LangGraph Agent Runtime 接入设计

## 状态

已获用户批准按方案 A 执行：将 LangGraph 接入真实模拟面试主链，并通过 Product API 内部 Model Gateway 保持 BYOK 密钥边界。

## 目标

将当前 `apps/agent-runtime` 中确定性的规则工作流升级为可恢复、可观测、可结构化校验的 LangGraph 面试工作流，同时保留现有 Product API 的业务事实、租户隔离、幂等、事务、BYOK 凭证和 SSE 交互边界。

首期只覆盖模拟面试的 `advance` 和 `submit answer` 两条路径，不同时引入 RAG、长期记忆、多 Agent 自由协作或新的异步任务队列。

## 非目标

- 不把 Product API 的 Prisma 业务写入迁移到 Agent Runtime。
- 不把 API Key、Authorization header 或解密后的用户凭证传入 Agent Runtime。
- 不用 LangGraph checkpoint 替代 `InterviewSession`、`InterviewTurn`、`InterviewReport`、`AgentRun` 或幂等记录。
- 不引入 CrewAI、AutoGen、OpenAI Agents SDK、Mastra 等第二套顶层 Agent 编排框架。
- 不将当前工作区已有的 AI invocation observability 未提交改动重置、覆盖或重构成无关形态。

## 现状与约束

当前边界为：

```text
Web / Admin -> Product API -> Agent Runtime
                    ├─ 业务事实、租户、权限、幂等、事务
                    └─ 用户 BYOK 凭证与模型 Provider 调用
```

`apps/agent-runtime/app/workflows/interview.py` 当前根据岗位分类和候选人回答次数生成确定性问题；`apps/product-api/src/modules/agent-runtime/user-model-runtime.client.ts` 当前在 Product API 内直接解析用户凭证并调用 Provider。当前工作区还存在未提交的 AI invocation observability schema、migration 和 contracts 改动，接入必须以其为基线并保持兼容。

## 选型决策

### 主编排：LangGraph

LangGraph 负责显式工作流状态、节点转移、暂停/恢复、节点级重试、运行流式事件和 PostgreSQL checkpoint。它只负责 Agent 编排，不负责 Product API 的业务事务，也不直接访问 Prisma。

### 模型节点：PydanticAI 风格的 typed adapter

首期不把 PydanticAI 作为第二个顶层 graph framework。模型调用通过 Runtime 内的 `ModelGateway` 接口抽象，返回 Pydantic `InterviewDecision`；是否使用 PydanticAI 的 Agent loop 由模型适配层单独决定。这样可以先稳定跨服务协议，再按 Provider 兼容性和测试收益引入 PydanticAI 依赖，避免 LangGraph 与 PydanticAI 双重持久化和双重重试。

### 业务事实：Product API

Product API 继续负责：

- 认证、授权、租户和用户所有权检查；
- 面试命令租约、幂等键、版本检查和 Serializable 事务；
- InterviewSession、turn、report、audit 和 AI invocation 的持久化；
- API Key 解密、Provider 适配、usage 归一化与调用观测。

## 目标架构

```text
User Portal / Admin
        |
        v
Product API
  |  authz + tenant + idempotency + transaction
  |  signed ModelInvocationGrant
  v
Agent Runtime (FastAPI + LangGraph)
  |  graph state + checkpoint + typed decision
  |  internal Model Gateway request
  v
Product API /internal/model-invocations
  |  resolve credential by grant
  |  call provider without exposing secret
  v
OpenAI / Anthropic / DeepSeek / Qwen / OpenAI-compatible
```

这是一个受控的内部回调，不形成业务循环：`/internal/model-invocations` 只执行 Provider 调用，不再调用 Agent Runtime。Runtime 收到的 grant 只包含短期签名授权、tenant/user/session/operation/credential 标识和 trace 信息，不包含 API Key。

## 跨服务协议

### ModelInvocationGrant

Product API 为每次模型调用生成短期签名 grant，至少包含：

```json
{
  "grantId": "grant_xxx",
  "tenantId": "tenant_xxx",
  "userId": "user_xxx",
  "credentialId": "credential_xxx",
  "sessionId": "session_xxx",
  "operation": "interview_next",
  "traceId": "trace_xxx",
  "expiresAt": "2026-07-17T12:00:30.000Z"
}
```

约束：

- grant 只能被 Agent Runtime 用于指定 command/session/operation；为支持有限重试，同一 command 可在 30 秒有效期内复用；
- Product API 再次校验 tenant、user、credential 状态和 operation；
- grant 过期、签名错误、scope 不匹配时拒绝调用；
- grant、签名、Authorization、API Key 和供应商原始响应不得进入日志、SSE、审计或持久化 payload。

### Model Gateway request/response

请求使用共享 JSON Schema，但不复用面试最终响应 schema：

```text
ModelInvocationRequest
  grant
  systemPrompt
  userPrompt
  outputSchemaVersion
  stream
  traceId

ModelInvocationResponse
  content
  usage?
  provider
  model
```

Runtime 只消费 `content` 和经过校验的 usage 元数据；Product API 负责把 provider usage 写入既有 `AiInvocation` 记录。输出内容不写日志。

## LangGraph 状态

LangGraph state 只承载本次 Agent 编排所需的受控副本：

```text
InterviewGraphState
  contractVersion
  commandId
  traceId
  tenantId
  userId
  sessionId
  sessionVersion
  stage
  title
  recentTurns
  candidateTurnCount
  answer
  selectedFocus
  decision?
  failure?
```

状态中允许出现候选人回答和最近 turn，因为它们是本次模型请求所需输入；grant 和 raw Provider JSON 只存在于非持久化 Runtime context。不得把完整 prompt、Provider 响应、API Key 或隐藏推理链作为 checkpoint metadata 写入。checkpoint thread id 使用 `tenantId:sessionId`，避免跨租户串读。

### 节点与转移

```text
START
  -> prepare_context
  -> select_stage
  -> generate_decision
  -> validate_decision
      ├─ invalid/retryable -> generate_decision (bounded retry)
      ├─ invalid/non-retryable -> failure
      └─ valid -> END
```

节点职责：

- `prepare_context`：校验 graph state 的输入边界，生成本次 Model Gateway 所需的最小上下文；
- `select_stage`：根据当前 stage、候选人回答次数和岗位类别选择面试关注点，不直接决定最终业务状态；
- `generate_decision`：通过 Model Gateway 请求结构化面试决策，并将可展示的增量映射为内部 progress event；
- `validate_decision`：使用 `AgentRuntimeNextResponseSchema` 对完整结果做严格校验；
- `failure`：输出稳定错误码，不暴露 Provider 原始错误或内部细节。

本地 deterministic fallback 保留为 Provider 不可用或 Runtime 不可用时的显式降级路径，不能与 LangGraph 的成功结果混淆；Product API 继续负责是否允许 fallback 以及最终的业务落库。

## 持久化与一致性

- LangGraph 使用 PostgreSQL checkpointer 保存节点边界的编排状态，用于进程重启、短暂故障后的恢复和调试；首次部署需要执行 checkpointer setup。
- `InterviewSession`、`InterviewTurn`、`InterviewReport`、`AgentRun` 和幂等记录仍由 Product API 独占写入。
- checkpoint 成功不代表业务事务成功；只有 Product API 的 schema 校验、版本检查、Serializable 事务和审计全部提交后，才向用户发送正式 `result`。
- 业务事务失败时，Runtime checkpoint 可以保留失败上下文，但不能自动重放可能造成重复写入的 Product API 命令；重试必须通过现有 command idempotency 和 version guard。
- checkpoint 清理按 tenant/session 生命周期处理，不把用户回答写入长期 memory store。长期画像和 mastery 继续走 Product API 的 Memory 模块。

## 流式事件与错误

Runtime 向 Product API 输出内部 progress/delta，Product API 继续使用现有 `AiOperationStreamEventSchema` 对外发送安全事件。

允许向用户展示：固定 phase、模型生成的白名单 content 增量、最终结构化结果和公开错误码。禁止展示：系统 prompt、工具参数、隐藏 reasoning、API Key、Authorization、Provider 原始 body。

错误分类：

- `MODEL_CONNECTION_REQUIRED`：Product API 在生成 grant 前拒绝，不创建模型调用；
- `MODEL_PROVIDER_UNAVAILABLE`、限流、超时：可重试，记录 `failed` invocation；
- `MODEL_PROVIDER_RESPONSE_INVALID`：不可重试，完整结果 schema 校验失败；
- `AGENT_RUNTIME_TIMEOUT`、`AGENT_RUNTIME_NETWORK_ERROR`：沿用现有 Runtime retry/fallback 策略；
- checkpoint/database error：Runtime 返回稳定服务错误，不伪造成功结果；
- Product API 事务或版本冲突：不发送 `result`，保留现有命令错误语义。

重试必须有限且精确，不得对所有异常无限重试。Product API 现有 Serializable 冲突重试规则保持不变。

## 测试与验收

### Agent Runtime

- graph 结构测试：合法路径、完成路径、校验失败路径和有界重试；
- state 隔离测试：不同 tenant 的 thread id 不可复用；
- Model Gateway mock 测试：不传 API Key，正确传 grant、trace 和 schema version；
- Provider invalid JSON、超时、限流和网络异常映射测试；
- checkpoint 恢复测试：节点失败后从最后成功节点继续；
- streaming event 测试：只输出白名单 content 和固定 phase，不输出敏感字段；
- 现有 FastAPI boundary、liveness、readiness、body limit 和日志脱敏测试继续通过。

### Product API

- grant 签名、过期、command scope、tenant/user/credential 校验；
- internal Model Gateway 不接受外部请求；
- provider usage 继续写入 `AiInvocation`，写日志失败不影响模型业务结果；
- Runtime 返回无效结果时不落库、不发送正式 result；
- command idempotency、session version、事务和租户隔离回归测试；
- 现有流式面试事件协议与用户模型连接测试继续通过。

### 质量门禁

按仓库既有门禁执行：

```text
pnpm format:check
pnpm contracts:check
pnpm db:validate
pnpm db:generate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm security:audit
pnpm infra:config
```

此外执行 Agent Runtime 的 pytest、mypy、ruff 和数据库集成测试；涉及迁移时执行 `pnpm db:migrate:deploy`，并保护当前工作区已有未提交改动。

## 分阶段交付

### Phase 1：协议与 Runtime graph

新增内部 grant/Model Gateway contract、LangGraph graph、checkpoint 配置和 mock gateway；先让 Runtime 在无真实 Provider 的测试环境中完成可验证的结构化决策。

### Phase 2：Product API Model Gateway

将现有 Product API Provider 调用能力包装成只供 Agent Runtime 使用的内部 endpoint，接入 grant 验证、usage 观测和流式转发；不改变用户凭证读取 API。

### Phase 3：真实面试主链切换

将 `AgentRuntimeClient` 的真实模型路径切换为 LangGraph 主链，保留 deterministic fallback 和现有错误/幂等语义；完成端到端测试和运行时验证。

### Phase 4：后续扩展

在首期稳定后，再评估 PydanticAI Agent、RAG、Profile/Memory graph、评估集、LLM judge、MCP 工具和 LangSmith/OpenTelemetry 集成。每个扩展单独设计，不能默认扩大首期范围。
