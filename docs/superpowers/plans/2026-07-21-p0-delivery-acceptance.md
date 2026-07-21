# P0 交付闭环验收 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为用户端与后台的关键闭环建立隔离、无真实模型费用的 Playwright E2E 门禁，并修正发布能力说明。

**Architecture:** 根脚本在独立端口和 `e2e` Prisma schema 中启动模型替身、Agent Runtime、Product API 与两个 Next 应用。浏览器测试操作真实本地认证和管理界面；夹具只通过受认证 HTTP API 创建，不直连 Prisma。模型替身提供固定成功、SSE、429 和非法 JSON 响应。

**Tech Stack:** Playwright、Node.js、Next.js、NestJS、FastAPI、PostgreSQL/Redis、Prisma。

---

## 文件结构

- Create: `playwright.config.ts` — Chromium、产物与超时配置。
- Create: `e2e/helpers/api.ts` — 登录和受认证夹具请求。
- Create: `e2e/helpers/auth.ts` — 浏览器本地登录帮助方法。
- Create: `e2e/user-practice.spec.ts` — 用户端成功、SSE、失败与登录失效。
- Create: `e2e/admin-governance.spec.ts` — 后台权限、模型、导入审核发布与看板。
- Create: `scripts/e2e/child-process.mjs` — 子进程和健康检查。
- Create: `scripts/e2e/model-stub.mjs` — 仅回环可访问的模型替身。
- Create: `scripts/e2e/run.mjs` — 隔离环境、迁移、种子和服务编排。
- Create: `scripts/e2e/run.test.mjs` — 隔离 URL 与启动命令单测。
- Modify: `package.json`, `pnpm-lock.yaml`, `.github/workflows/ci.yml`, `README.md`。

## Task 1: 定义失败测试与隔离契约

**Files:**
- Create: `scripts/e2e/run.test.mjs`
- Create: `e2e/user-practice.spec.ts`
- Create: `e2e/admin-governance.spec.ts`

- [ ] **Step 1: 写出环境隔离的失败测试**

```js
test('E2E 环境使用独立 schema 和端口', () => {
  const environment = createE2eEnvironment({ DATABASE_URL: baseDatabaseUrl });
  assert.match(environment.DATABASE_URL, /schema=e2e/);
  assert.equal(environment.API_PORT, '3101');
  assert.equal(environment.AGENT_RUNTIME_URL, 'http://127.0.0.1:8100');
  assert.equal(environment.NEXT_PUBLIC_API_BASE_URL, 'http://127.0.0.1:3101/api');
});
```

- [ ] **Step 2: 写出用户成功和失败的失败用例**

```ts
test('用户确认模型额度后得到整轮复盘', async ({ page }) => {
  await signInAsUser(page, user);
  await openAnsweredPractice(page, { modelMode: 'success' });
  await page.getByRole('button', { name: '生成 AI 复盘' }).click();
  await expect(page.getByRole('dialog')).toContainText('模型额度');
  await page.getByRole('button', { name: '确认生成' }).click();
  await expect(page.getByText('下一轮训练建议')).toBeVisible();
});

test('模型非法 JSON 时保留回答且提示错误', async ({ page }) => {
  await signInAsUser(page, user);
  await openAnsweredPractice(page, { modelMode: 'invalid_json' });
  await page.getByRole('button', { name: '生成 AI 复盘' }).click();
  await page.getByRole('button', { name: '确认生成' }).click();
  await expect(page.getByRole('alert')).toContainText('模型');
  await expect(page.getByText('我会说明背景、决策、结果和复盘。')).toBeVisible();
});
```

- [ ] **Step 3: 写出后台旅程的失败用例**

```ts
test('管理员导入、审核发布后可看到运营数据', async ({ page }) => {
  await signInAsAdmin(page, administrator);
  await page.goto('/#imports');
  await page.getByRole('button', { name: '导入资料' }).click();
  await page.getByLabel('资料标题').fill('E2E 支付系统题库');
  await page.getByRole('button', { name: '导入并生成候选题' }).click();
  await page.getByRole('button', { name: '审核待办' }).click();
  await approveAndPublishFirstCandidate(page);
  await page.goto('/#analytics');
  await expect(page.getByText('内容与训练链路')).toBeVisible();
});
```

- [ ] **Step 4: 运行并确认红灯**

Run: `node --test scripts/e2e/run.test.mjs`

Expected: FAIL，原因是 `createE2eEnvironment` 尚不存在；`pnpm exec playwright test e2e --list` 也因缺少配置/依赖失败。

## Task 2: 实现运行器与模型替身

**Files:**
- Create: `scripts/e2e/child-process.mjs`
- Create: `scripts/e2e/model-stub.mjs`
- Create: `scripts/e2e/run.mjs`
- Modify: `package.json`, `pnpm-lock.yaml`
- Test: `scripts/e2e/run.test.mjs`

- [ ] **Step 1: 安装固定版本测试依赖**

Run: `pnpm add -Dw @playwright/test@1.58.0`

Expected: 只更新根依赖和 lockfile。

- [ ] **Step 2: 实现并通过环境构造测试**

```js
export function createE2eEnvironment(source) {
  return {
    ...source,
    NODE_ENV: 'test',
    API_HOST: '127.0.0.1',
    API_PORT: '3101',
    DATABASE_URL: withSchema(source.DATABASE_URL, 'e2e'),
    AGENT_RUNTIME_URL: 'http://127.0.0.1:8100',
    AGENT_RUNTIME_MODEL_GATEWAY_URL: 'http://127.0.0.1:3101/api/internal/model-invocations',
    NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3101/api',
  };
}
```

`withSchema()` 保留 URL 其他查询参数，只替换/追加 `schema=e2e`；非 PostgreSQL URL 抛出可读错误。

- [ ] **Step 3: 实现本机模型替身**

```js
if (mode === 'rate_limited') return json(response, 429, { error: { message: 'e2e rate limit' } });
if (mode === 'invalid_json') return json(response, 200, { choices: [{ message: { content: '{invalid' } }] });
return json(response, 200, completionResponse(request));
```

替身只绑定 `127.0.0.1:4100`、只接受 `/v1/chat/completions`；`stream: true` 固定输出 `data:` feedback、usage 与 `[DONE]`。

- [ ] **Step 4: 编排服务生命周期**

顺序：校验环境 → `prisma migrate reset --force --skip-seed`（仅 `e2e` schema）→ `pnpm db:seed` → `pnpm db:bootstrap:admin` → 模型替身 → Runtime → API → 两个 Next dev server → health probe → Playwright。无论成功或失败，`finally` 仅停止此运行器启动的进程。

```js
await waitForHttp('http://127.0.0.1:8100/health/ready');
await waitForHttp('http://127.0.0.1:3101/api/health/ready');
await waitForHttp('http://127.0.0.1:3100');
await waitForHttp('http://127.0.0.1:3102');
```

- [ ] **Step 5: 添加命令并验证绿灯**

```json
"test:e2e": "node scripts/e2e/run.mjs"
```

Run: `node --test scripts/e2e/run.test.mjs`

Expected: PASS，无需服务启动即可验证端口、schema 与命令。

## Task 3: 配置 Playwright 与用户验收

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/helpers/api.ts`
- Create: `e2e/helpers/auth.ts`
- Modify: `e2e/user-practice.spec.ts`

- [ ] **Step 1: 配置产物与重试策略**

```ts
export default defineConfig({
  testDir: './e2e', timeout: 45_000, retries: process.env.CI ? 1 : 0,
  outputDir: 'test-results/e2e',
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- [ ] **Step 2: 用真实 API 创建夹具**

helper 必须先调用 `/api/auth/register` 或 `/api/auth/login` 获取 JWT，再通过 Bearer Token 创建 JD、模型连接、练习和答案；禁止直连 Prisma。模型 base URL 指向 `http://127.0.0.1:4100/v1`。

- [ ] **Step 3: 实现登录失效、SSE 与报告断言**

```ts
await page.locator('#access-email').fill(user.email);
await page.locator('#access-password').fill(user.password);
await page.getByRole('button', { name: '登录' }).click();
await expect(page).toHaveURL(/\/home/);
await page.evaluate(() => localStorage.clear());
await page.reload();
await expect(page.locator('#access-email')).toBeVisible();
```

成功路径断言流式 feedback、确认弹窗、报告与下一轮推荐；429/非法 JSON 断言传统错误提示、保存回答仍可读取且不生成报告。

- [ ] **Step 4: 运行用户 suite**

Run: `pnpm exec playwright test e2e/user-practice.spec.ts --project=chromium`

Expected: PASS，覆盖登录失效、SSE、成功复盘和失败保护。

## Task 4: 实现后台治理验收

**Files:**
- Modify: `e2e/helpers/api.ts`
- Modify: `e2e/helpers/auth.ts`
- Modify: `e2e/admin-governance.spec.ts`

- [ ] **Step 1: 先写普通用户越权失败断言**

```ts
test('普通用户不能进入后台', async ({ page }) => {
  await signInAsUser(page, ordinaryUser);
  await page.goto('http://127.0.0.1:3102');
  await expect(page.getByText('没有管理后台权限')).toBeVisible();
});
```

- [ ] **Step 2: 实现管理员模型连接脱敏验证**

使用 `#admin-email` 与 `#admin-password` 登录，打开 `#models`，创建 `openai_compatible` 模型连接并测试；列表只允许显示名称、Provider、模型和预算，不得显示输入密钥。

- [ ] **Step 3: 实现导入审核发布与看板验证**

从 `#imports` 以 Markdown 表单创建候选题，在候选题表格批量审批并发布；仅审批成功后发布。进入 `#analytics` 后断言内容链路和 AI/Agent 指标按实际 API 返回显示。

- [ ] **Step 4: 运行后台 suite**

Run: `pnpm exec playwright test e2e/admin-governance.spec.ts --project=chromium`

Expected: PASS，覆盖权限拒绝、模型密钥脱敏和导入审核发布。

## Task 5: CI 门禁与发布文档

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`

- [ ] **Step 1: 增加依赖 `quality` 的 E2E job**

使用 PostgreSQL/Redis 服务、冻结依赖与 Chromium，运行 `pnpm test:e2e`。失败/取消时上传 `playwright-report/` 与 `test-results/e2e/`；不得上传 `.env`、Authorization 或模型原始请求。

- [ ] **Step 2: 修正 README 并加入发布检查**

说明模型调用已通过 Product API 网关、短期授权和加密凭证边界接入受控 Provider；明确 RAG、向量检索、评测集、LLM judge、生产云与集中可观测性仍未交付。新增 `pnpm test:e2e`、OIDC、CORS、Secret Manager、密钥轮换、健康检查和回滚负责人检查项。

- [ ] **Step 3: 完整验证并提交**

Run: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm contracts:check && pnpm db:validate && pnpm infra:config && pnpm test:e2e && git diff --check`

Expected: 所有命令退出码为 0；差异仅包含 E2E、依赖锁、CI、README 与必要稳定选择器。

```bash
git add package.json pnpm-lock.yaml playwright.config.ts scripts/e2e e2e .github/workflows/ci.yml README.md
git commit -m "test(e2e): 建立关键业务验收门禁"
```

## 自检

- 隔离 schema、模型替身、用户/后台旅程、CI 产物和 README 均有对应任务。
- 不新增 RAG、数据表、额度计费或独立系统；P1/P2 不混入本计划。
- 运行器与浏览器行为先由测试定义，配置和依赖由最终完整命令覆盖。
