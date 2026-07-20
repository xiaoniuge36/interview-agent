# LangGraph Agent Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将真实模拟面试的非流式决策路径切换到 FastAPI + LangGraph，并通过 Product API 内部 Model Gateway 使用用户 BYOK 模型而不向 Runtime 暴露 API Key；现有真实流式 Provider 路径保持兼容，避免回退为伪流式。

**Architecture:** Product API 为已验证的默认模型签发短期 HMAC grant，并把 grant 随 `interview-runtime.v1` 请求发送给 Agent Runtime。LangGraph 以受控 session context 为 state，通过内部 Model Gateway 回调 Product API 完成模型调用；Product API 继续持有密钥、记录 `AiInvocation` 并提交业务事务。无 grant 时 Runtime 继续运行确定性回归路径。

**Tech Stack:** NestJS 11、TypeScript 5、Zod、FastAPI、Pydantic v2、LangGraph、PostgreSQL checkpointer、httpx、Jest、pytest、mypy、ruff。

## Global Constraints

- Product API 是 InterviewSession、turn、report、AgentRun、幂等和审计的唯一业务事实源。
- API Key、Authorization header、完整 prompt、用户回答正文和 Provider 原始响应不得写入日志、SSE、审计或 AiInvocation。
- grant 使用 `INTERNAL_AGENT_TOKEN` 做 HMAC-SHA256 签名，绑定 tenant、user、credential、session、command、operation、traceId 和 30 秒有效期；同一 command 可在有效期内用于有限重试。
- checkpoint thread id 必须包含 tenantId 和 sessionId；checkpoint 只保存编排状态，不替代业务表。
- 当前工作区已有 AI invocation observability 与 streaming 未提交改动；不得重置、覆盖或格式化无关文件。
- 当前用户没有授权 git 历史或远程操作；计划执行期间不 commit、不 push。
- `UserModelRuntimeClient.nextStream()` 保持现有真实 Provider streaming 路径，首期不以完整 JSON 伪造 Runtime token 流。

---

### Task 1: 扩展 Runtime 契约并保持跨语言生成一致

**Files:**

- Modify: `packages/contracts/src/schemas/interview.ts`
- Modify: `packages/contracts/src/contracts.test.ts`
- Modify: `packages/contracts/scripts/generate-runtime-schema.ts`
- Generated: `apps/agent-runtime/app/schemas/interview.py`

**Interfaces:**

- Consumes: 现有 `AgentRuntimeNextRequestSchema` 与 `interview-runtime.v1`。
- Produces: 可选 `modelInvocationGrant?: string`，Python 对应 `model_invocation_grant: str | None`。

- [ ] **Step 1: 写契约失败测试**

```ts
const parsed = AgentRuntimeNextRequestSchema.parse({
  ...VALID_RUNTIME_REQUEST,
  modelInvocationGrant: 'payload.signature',
});
expect(parsed.modelInvocationGrant).toBe('payload.signature');
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @interview-agent/contracts test`

Expected: FAIL，因为 schema 会剥离未知的 `modelInvocationGrant`。

- [ ] **Step 3: 扩展 Zod schema 与 Python generator**

```ts
modelInvocationGrant: z.string().trim().min(16).max(4096).optional(),
```

Python template 增加：

```python
model_invocation_grant: str | None = Field(default=None, min_length=16, max_length=4096)
```

- [ ] **Step 4: 生成 Python schema 并验证**

Run: `pnpm contracts:generate && pnpm contracts:check && pnpm --filter @interview-agent/contracts test`

Expected: generator check 和 contracts 测试通过。

### Task 2: 增加 LangGraph workflow、Gateway client 与 checkpoint 生命周期

**Files:**

- Modify: `apps/agent-runtime/pyproject.toml`
- Modify: `apps/agent-runtime/uv.lock`
- Modify: `apps/agent-runtime/app/config.py`
- Create: `apps/agent-runtime/app/model_gateway.py`
- Create: `apps/agent-runtime/app/workflows/interview_graph.py`
- Modify: `apps/agent-runtime/app/main.py`
- Create: `apps/agent-runtime/tests/test_interview_graph.py`
- Modify: `apps/agent-runtime/tests/test_settings.py`
- Modify: `.env.example`
- Modify: `infra/docker/docker-compose.yml`

**Interfaces:**

- Consumes: `NextInterviewRequest.model_invocation_grant`、`NextInterviewResponse`、Product API `/api/internal/model-invocations`。
- Produces: `create_interview_graph(gateway, checkpointer)`、`run_interview_graph(graph, payload)`、`ModelGatewayClient.complete(...)`。

- [ ] **Step 1: 写 graph 与配置失败测试**

```python
async def test_graph_uses_gateway_when_grant_is_present() -> None:
    gateway = FakeGateway('{"stage":"jd_core","content":"请展开技术取舍。","shouldFinish":false}')
    graph = create_interview_graph(gateway, InMemorySaver())
    result = await run_interview_graph(graph, request_with_grant())
    assert result.stage == "jd_core"
    assert gateway.grants == ["payload.signature"]
```

同时覆盖不同 tenant 生成不同 thread id、无效 JSON 映射 `MODEL_PROVIDER_RESPONSE_INVALID`、Gateway 5xx 有界重试以及 production 缺失 checkpoint URL 拒绝启动。

- [ ] **Step 2: 运行 Agent Runtime 测试确认失败**

Run: `pnpm --filter @interview-agent/agent-runtime test`

Expected: FAIL，因为 LangGraph workflow、Gateway client 和配置字段尚不存在。

- [ ] **Step 3: 增加 Python 依赖**

```toml
"httpx>=0.28.1,<1.0.0",
"langgraph>=1.2.9,<2.0.0",
"langgraph-checkpoint-postgres>=3.1.0,<4.0.0",
"psycopg[binary,pool]>=3.3.4,<4.0.0",
```

Run: `uv lock --project apps/agent-runtime`

Expected: `uv.lock` 更新且 Python 3.11/3.12 均可解析。

- [ ] **Step 4: 实现 Gateway client 与 LangGraph state machine**

核心状态：

```python
class InterviewGraphState(TypedDict, total=False):
    request: NextInterviewRequest
    system_prompt: str
    user_prompt: str
    raw_decision: str
    decision: NextInterviewResponse
    attempt: int
    failure_code: str
```

节点固定为 `prepare_context -> generate_decision -> validate_decision`，Gateway 临时错误最多重试 2 次，schema 错误不重试。`run_interview_graph()` 使用 `tenant_id:session_id` 作为 thread id。

- [ ] **Step 5: 接入 FastAPI lifespan 与 PostgreSQL checkpointer**

开发/测试缺少 `AGENT_RUNTIME_CHECKPOINT_DATABASE_URL` 时使用 `InMemorySaver`；production 必须配置 PostgreSQL，并在首次启动调用 `AsyncPostgresSaver.setup()`。`/interviews/next` 收到 grant 时走 LangGraph，无 grant 时继续调用确定性 `next_interview_turn()`。

- [ ] **Step 6: 配置本地与 Compose 环境**

```env
AGENT_RUNTIME_MODEL_GATEWAY_URL=http://localhost:3001/api/internal/model-invocations
AGENT_RUNTIME_CHECKPOINT_DATABASE_URL=postgresql://interview_agent:change-me-local-postgres@localhost:5432/interview_agent
```

Compose 内 Runtime 使用 `http://api:3001/api/internal/model-invocations` 和同一 PostgreSQL 服务，并增加 postgres health dependency。

- [ ] **Step 7: 运行 Runtime 门禁**

Run: `pnpm --filter @interview-agent/agent-runtime test && pnpm --filter @interview-agent/agent-runtime typecheck && pnpm --filter @interview-agent/agent-runtime lint && pnpm --filter @interview-agent/agent-runtime build`

Expected: pytest coverage 不低于 85%，mypy、ruff、结构检查和 compileall 通过。

### Task 3: 实现 Product API grant 与内部 Model Gateway

**Files:**

- Create: `apps/product-api/src/modules/agent-runtime/model-invocation-grant.service.ts`
- Create: `apps/product-api/src/modules/agent-runtime/model-gateway.controller.ts`
- Create: `apps/product-api/src/modules/agent-runtime/model-gateway.schemas.ts`
- Create: `apps/product-api/src/modules/agent-runtime/model-invocation-grant.service.spec.ts`
- Create: `apps/product-api/src/modules/agent-runtime/model-gateway.controller.spec.ts`
- Modify: `apps/product-api/src/modules/agent-runtime/agent-runtime.module.ts`
- Modify: `apps/product-api/src/modules/agent-runtime/user-model-runtime.client.ts`
- Modify: `apps/product-api/src/modules/agent-runtime/user-model-runtime.client.spec.ts`
- Modify: `apps/product-api/src/modules/model-credential/model-credential.service.ts`
- Modify: `apps/product-api/src/common/context/context.middleware.ts`
- Modify: `apps/product-api/src/common/context/context.middleware.spec.ts`

**Interfaces:**

- Consumes: `ProductRequestContext`、`ModelCredentialService`、`ModelProviderClient`、`AiInvocationService`。
- Produces: `ModelInvocationGrantService.issue()`、`ModelInvocationGrantService.verify()`、`POST /api/internal/model-invocations`。

- [ ] **Step 1: 写 grant 和 internal endpoint 失败测试**

```ts
const token = await grants.issue(context, {
  sessionId: 'session-1',
  commandId: 'command-1',
  traceId: 'trace-test-0001',
});
expect(grants.verify(token)).toEqual(
  expect.objectContaining({ tenantId: 'tenant-1', operation: 'interview_next' }),
);
```

覆盖篡改签名、过期、credential/user/tenant 不匹配、缺少内部身份 header、日志不含 grant 和 API Key。

- [ ] **Step 2: 运行 Product API 定向测试确认失败**

Run: `pnpm --filter @interview-agent/product-api test -- --runInBand model-invocation-grant.service.spec.ts model-gateway.controller.spec.ts`

Expected: FAIL，因为新服务和 controller 尚不存在。

- [ ] **Step 3: 实现 HMAC grant**

grant payload：

```ts
type ModelInvocationGrantPayload = {
  grantId: string;
  tenantId: string;
  userId: string;
  credentialId: string;
  sessionId: string;
  commandId: string;
  operation: 'interview_next';
  traceId: string;
  expiresAt: string;
};
```

token 格式为 `<base64url-json>.<base64url-hmac>`；校验使用 `timingSafeEqual`，有效期 30 秒。签发前只读取已验证的默认 credential metadata，不解密 API Key。

- [ ] **Step 4: 实现内部 Model Gateway**

请求 schema：

```ts
const ModelGatewayRequestSchema = z.object({
  grant: z.string().min(16).max(4096),
  systemPrompt: z.string().min(1).max(CONTRACT_LIMITS.longText),
  userPrompt: z.string().min(1).max(CONTRACT_LIMITS.longText),
  outputSchemaVersion: z.literal('interview-runtime.v1'),
  traceId: z.string().min(8).max(128),
});
```

controller 标记 `@Public()`，但必须验证 `x-service-name=agent-runtime` 与 constant-time `x-internal-agent-token`。ContextMiddleware 只跳过该精确 path。服务验证 grant 后按 `tenantId + userId + credentialId + verified` 查询凭证，解密后调用现有 Provider，并通过 `AiInvocationService.measure()` 记录 usage。

- [ ] **Step 5: 运行 Product API 定向测试**

Run: `pnpm --filter @interview-agent/product-api test -- --runInBand model-invocation-grant.service.spec.ts model-gateway.controller.spec.ts user-model-runtime.client.spec.ts context.middleware.spec.ts`

Expected: grant、安全边界、Provider 调用和现有用户模型测试全部通过。

### Task 4: 将非流式真实面试切换到 LangGraph，保留真实 streaming

**Files:**

- Modify: `apps/product-api/src/modules/agent-runtime/agent-runtime.client.ts`
- Modify: `apps/product-api/src/modules/agent-runtime/agent-runtime.client.spec.ts`
- Modify: `apps/product-api/src/modules/agent-runtime/agent-runtime.module.ts`

**Interfaces:**

- Consumes: `ModelInvocationGrantService.issue()`、Runtime 可选 `modelInvocationGrant`。
- Produces: 带用户 context 的非流式 `AgentRuntimeClient.next()` 通过 Runtime/LangGraph 执行；带 `onContentDelta` 的流式调用继续使用现有真实 Provider stream。

- [ ] **Step 1: 写客户端切换失败测试**

```ts
await client.next(requestInput(), context);
expect(grants.issue).toHaveBeenCalledWith(
  context,
  expect.objectContaining({ commandId: 'command-1' }),
);
expect(fetch).toHaveBeenCalledWith(
  'http://runtime.test/interviews/next',
  expect.objectContaining({ body: expect.stringContaining('modelInvocationGrant') }),
);
expect(userModels.next).not.toHaveBeenCalled();
```

另写测试证明传入 `onContentDelta` 时仍调用 `userModels.nextStream()`，防止把真实 Provider streaming 降级为完整 JSON 后切片。

- [ ] **Step 2: 运行客户端测试确认失败**

Run: `pnpm --filter @interview-agent/product-api test -- --runInBand agent-runtime.client.spec.ts`

Expected: FAIL，因为当前 authenticated context 仍直接调用 `UserModelRuntimeClient.next()`。

- [ ] **Step 3: 实现切换和兼容路径**

非流式 context 先签发 grant，再构建 `AgentRuntimeNextRequestSchema`；无 context 的内部回归测试继续无 grant 调 Runtime；流式 progress 存在时继续使用 `UserModelRuntimeClient.nextStream()`。

- [ ] **Step 4: 运行 Agent Runtime 与 Product API 集成回归**

Run: `pnpm --filter @interview-agent/product-api test -- --runInBand agent-runtime.client.spec.ts interview.service.spec.ts user-model-runtime.client.spec.ts`

Expected: Runtime 调度、幂等、错误遥测、fallback、流式调用均通过。

### Task 5: 集成验证与工作区保护

**Files:**

- Verify only: all task-scoped files

**Interfaces:**

- Consumes: Tasks 1-4 的 contracts、Runtime、Gateway、client。
- Produces: 可复核的测试、类型、格式、构建、数据库和安全证据。

- [ ] **Step 1: 检查并行改动和差异完整性**

Run: `git status --short && git diff --check`

Expected: 无 whitespace error；现有 AI observability/streaming 改动仍存在且没有被重置。

- [ ] **Step 2: 运行 contracts 与 Runtime 门禁**

Run: `pnpm contracts:check && pnpm --filter @interview-agent/contracts test && pnpm --filter @interview-agent/agent-runtime test && pnpm --filter @interview-agent/agent-runtime typecheck && pnpm --filter @interview-agent/agent-runtime lint && pnpm --filter @interview-agent/agent-runtime build`

Expected: 全部退出码 0。

- [ ] **Step 3: 运行 Product API 数据库与应用门禁**

Run: `pnpm db:validate && pnpm db:generate && pnpm --filter @interview-agent/product-api test && pnpm --filter @interview-agent/product-api typecheck && pnpm --filter @interview-agent/product-api lint && pnpm --filter @interview-agent/product-api build`

Expected: Prisma schema、Product API tests/typecheck/lint/build 全部通过。

- [ ] **Step 4: 运行基础设施与安全门禁**

Run: `pnpm infra:config && pnpm --filter @interview-agent/agent-runtime security:audit`

Expected: Compose config 与 Python dependency audit 退出码 0；若外部漏洞源不可访问，记录阻塞原因而不伪报通过。

- [ ] **Step 5: 汇总未执行项**

若没有可用 PostgreSQL 或 Provider 凭证，明确区分：mock/contract/integration 已验证；真实 BYOK 外部 Provider 与 PostgreSQL checkpoint 恢复尚未现场验证。不得把未运行命令描述为通过。
