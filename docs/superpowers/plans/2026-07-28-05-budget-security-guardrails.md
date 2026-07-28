# 预算、安全与发布门禁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 为模型操作加入任务预算和熔断，并将现有认证、CORS、密钥加密和运行配置升级为可测试的发布门禁。

**Architecture:** 预算和熔断由 Product API Provider 网关统一执行，Runtime 通过稳定错误码获知拒绝。生产配置校验在启动前失败；密钥轮换支持当前和上一版本短暂双读，写入始终使用当前版本。

**Tech Stack:** NestJS、Prisma、Zod、Redis/PostgreSQL、Jest、Vitest、Docker Compose。

---

## 文件边界

- Modify: packages/contracts/src/schemas/ai-usage.ts
- Modify: packages/contracts/src/schemas/model-credential.ts
- Modify: apps/product-api/src/common/config/environment.ts
- Modify: apps/product-api/src/modules/ai-usage/ai-invocation.service.ts
- Create: apps/product-api/src/modules/ai-usage/ai-budget-policy.ts
- Create: apps/product-api/src/modules/ai-usage/ai-circuit-breaker.ts
- Modify: apps/product-api/src/modules/agent-runtime/model-gateway.service.ts
- Modify: apps/product-api/src/modules/model-credential/model-provider.client.ts
- Modify: apps/product-api/src/modules/model-credential/credential-crypto.service.ts
- Modify: apps/product-api/src/modules/model-credential/model-credential.service.ts
- Modify: apps/product-api/src/main.ts
- Modify: .env.example
- Modify: infra/docker/docker-compose.yml
- Modify: .github/workflows/ci.yml
- Test: apps/product-api/src/common/config/environment.spec.ts
- Test: apps/product-api/src/modules/ai-usage/ai-budget-policy.spec.ts
- Test: apps/product-api/src/modules/ai-usage/ai-circuit-breaker.spec.ts
- Test: apps/product-api/src/modules/model-credential/credential-crypto.service.spec.ts

### Task 1: 定义稳定预算和熔断错误契约

- [ ] Step 1: 写 operation 预算和错误 schema 测试。

  expect(AiBudgetDecisionSchema.parse({ allowed: false, code: "AI_BUDGET_EXHAUSTED" })).toMatchObject({ allowed: false });
  expect(AiCircuitStateSchema.parse("half_open")).toBe("half_open");

- [ ] Step 2: 定义 per-operation 配置，不允许用户请求覆盖上限。

  const policy = { operation: "practice_report", maxInputCharacters: 12000, maxOutputTokens: 1400, maxAttempts: 2, timeoutMs: 30000 };

- [ ] Step 3: 在 gateway 前检查预算，在 provider 失败后更新熔断状态。

  const decision = this.budget.check(input);
  if (!decision.allowed) throw new BadGatewayException({ code: decision.code });
  return this.breaker.execute(key, () => this.provider.complete(request));

- [ ] Step 4: 运行 policy 和 gateway 测试。

Run: pnpm --filter @interview-agent/product-api test -- ai-budget-policy ai-circuit-breaker model-gateway

Expected: 预算拒绝不调用 Provider，open circuit 立即返回稳定错误。

### Task 2: 实现可控时钟的熔断状态机

- [ ] Step 1: 为 closed、open、half_open、探测成功和失败写测试。

  expect(breaker.recordFailure(key, now)).toBe("open");
  expect(breaker.allow(key, afterCooldown)).toBe(true);
  expect(breaker.recordSuccess(key, afterCooldown)).toBe("closed");

- [ ] Step 2: 使用 provider + model + operation 作为状态键，避免相互影响。

  const key = [input.provider, input.model, input.operation].join(":");

- [ ] Step 3: 配置阈值、冷却时间与最大半开探测数。

Run: pnpm --filter @interview-agent/product-api test -- ai-circuit-breaker

Expected: 测试不依赖真实等待，状态机覆盖全部分支。

### Task 3: 支持双密钥轮换与敏感数据清洗

- [ ] Step 1: 写当前密钥写入、上一密钥解密、过期密钥拒绝测试。

  expect(crypto.decrypt(previousCiphertext)).toBe("sk-old-secret");
  expect(crypto.encrypt("sk-new-secret").keyVersion).toBe(currentVersion);

- [ ] Step 2: 将环境变量扩展为当前密钥和可选上一版本密钥。

  CREDENTIAL_ENCRYPTION_KEY_CURRENT
  CREDENTIAL_ENCRYPTION_KEY_PREVIOUS
  CREDENTIAL_ENCRYPTION_KEY_VERSION

- [ ] Step 3: 对 span、日志、错误和 retrieval preview 复用同一敏感字段清洗器。

  return redactText(value).slice(0, MAX_SAFE_PREVIEW_LENGTH);

- [ ] Step 4: 运行凭证、日志、AI usage 回归。

Run: pnpm --filter @interview-agent/product-api test -- credential-crypto ai-usage user-page-agent admin-page-agent

Expected: 旧密文可读，新密文只用当前版本，任何返回体不出现凭证。

### Task 4: 强化生产配置与 CI 门禁

- [ ] Step 1: 为 production 拒绝 development auth、空 CORS、示例域名、空 OTLP 密钥和共享 client id 写环境测试。

  expect(() => validateEnvironment(productionWithDevelopmentAuth)).toThrow("生产环境禁止使用 development 认证模式");

- [ ] Step 2: 在 Docker Compose 和 CI 使用 .env.example 做配置校验。

Run: pnpm infra:config && pnpm --filter @interview-agent/product-api test -- environment

Expected: 示例配置可解析；生产组合缺字段时启动前失败。

- [ ] Step 3: 在 Admin UI 展示预算拒绝和熔断状态，不显示阈值中的敏感 Provider 信息。

Run: pnpm --filter @interview-agent/admin-console test -- PlatformAiAnalytics && pnpm --filter @interview-agent/admin-console build

Expected: 状态可观察但不泄密。

### Task 5: 运行安全门禁并提交

- [ ] Step 1: 执行完整验证。

Run: pnpm format:check && pnpm contracts:check && pnpm db:validate && pnpm --filter @interview-agent/product-api test && pnpm security:audit && pnpm infra:config

Expected: 通过。

- [ ] Step 2: 提交。

  git add packages/contracts apps/product-api apps/admin-console infra .github .env.example
  git commit -m "feat(guard): 增加模型预算与安全门禁"
