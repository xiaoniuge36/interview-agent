# Interview Agent

面试训练平台 Monorepo，包含用户端 Web、治理后台 Admin、Product API、Agent Runtime、共享认证客户端、共享业务契约与本地集成基础设施。

## 系统边界

```text
Web / Admin ──HTTP/SSE──> Product API ──内部 HTTP──> Agent Runtime
                              │
                              ├── PostgreSQL / pgvector（业务事实、审计、事件、报告）
                              └── Redis（跨实例事件通知与可用性依赖）
```

- **Product API 是唯一业务事实源**：负责认证、授权、租户隔离、业务状态机、幂等命令、串行化事务、审计、事件与持久化。
- **Agent Runtime 是受保护的工作流执行层**：只接受 Product API 的内部服务身份，不直接写入业务事实。
- **Web 与 Admin 只访问 Product API**：不得直连数据库、Redis、Agent Runtime 或模型服务。
- **SSE 只承担事件读取、订阅与重放**：读取事件不会推进面试状态。
- 模型调用统一经过 Product API 的受控 Provider 网关；管理员或用户可配置 OpenAI、Anthropic、DeepSeek、通义千问与 OpenAI 兼容端点。API Key 仅用于后端加密保存、测试与调用，界面和审计记录只保留掩码与非敏感元数据。
- 仓库已交付 feature-flag 控制的 RAG/向量检索、确定性 Golden 评测与可选 LLM Judge 接口；真实 Provider 验证、外部 Judge 服务、生产级云基础设施及集中式可观测性后端仍需部署环境提供。

## 能力矩阵与自动化证据

| 能力                                                         | 状态                                  | 自动化证据                                                            |
| ------------------------------------------------------------ | ------------------------------------- | --------------------------------------------------------------------- |
| MemoryEvent、Mastery 与可解释推荐                            | 已交付                                | Product API memory/practice tests、`e2e/user-practice.spec.ts`        |
| Background Job、Embedding 与 Hybrid Retrieval                | 已交付                                | jobs/retrieval/embedding tests、12-case Retrieval Golden、Admin E2E   |
| 训练题单、面试追问与报告 RAG                                 | 已交付（独立 feature flag，默认关闭） | practice/interview/report fallback tests、Runtime contract tests      |
| practice_report Graph、repair 与确定性 fallback              | 已交付                                | Agent Runtime Pytest、`evals/run-agent-evals.ts`                      |
| Schema/Golden 指标与可选 LLM Judge                           | 已交付 runner                         | `evals/practice-evaluation`、`evals/report`；Judge 仅在显式配置时调用 |
| 错题本、弱项复练与训练连续性                                 | 已交付                                | Product API mistake-book tests、Portal component tests、用户 E2E      |
| 模型预算、熔断、双密钥与发布配置门禁                         | 已交付                                | guardrail/environment tests、security audit、Compose 校验             |
| 真实 Provider CI、外部 OIDC 租户、Secret Manager、生产云部署 | 未交付                                | 需要部署目标、真实凭证与外部服务                                      |

完整计划状态与提交证据见 [`docs/superpowers/DELIVERED.md`](docs/superpowers/DELIVERED.md)。

## 目录结构

```text
interview-agent/
├─ apps/
│  ├─ user-portal/            # Next.js 用户端，默认端口 3000
│  ├─ admin-console/          # Next.js 治理后台，默认端口 3002
│  ├─ product-api/            # NestJS Product API，默认端口 3001
│  └─ agent-runtime/          # FastAPI Agent Runtime，默认端口 8000
├─ packages/
│  ├─ auth-client/            # Web/Admin 共用的 development/OIDC 认证客户端
│  └─ contracts/              # TypeScript/Zod 契约与 Runtime Schema 生成源
├─ infra/docker/              # 本地集成环境 Docker Compose
├─ .github/                   # CI、Dependabot、CODEOWNERS 与 PR 模板
├─ 需求/                      # 产品范围与冻结稿，不参与构建
├─ 设计稿/                    # UI 设计产物，不参与构建
├─ 技术方案/                  # 架构与技术设计文档
└─ 参考资料/                  # 外部项目分析材料
```

根目录 `apps/` 按业务角色与运行边界组织：`user-portal`、`admin-console`、`product-api` 与 `agent-runtime`。其中前两个是 Next.js App Router 应用，`product-api` 是 NestJS 业务 API，`agent-runtime` 是 Python 工作流运行时。

## 技术栈

- Node.js：支持范围 20–24，CI 基准 22
- Python：支持范围 3.11–3.12，CI 基准 3.12
- pnpm 10.33.0、Turborepo
- Next.js 15、React 18、TypeScript 5、Zod
- NestJS 11、Prisma 6、PostgreSQL 16 + pgvector、Redis 7
- uv、FastAPI、Pydantic
- Jest、Vitest、Node Test Runner、Pytest、Ruff、mypy

## 环境准备

1. 安装 Node.js、pnpm、Python、uv；完整本地集成环境还需要 Docker Desktop。
2. 创建本地环境文件并替换所有占位凭证：

```powershell
Copy-Item .env.example .env
```

3. 安装锁定依赖：

```powershell
pnpm install --frozen-lockfile
uv sync --project apps/agent-runtime --frozen --extra dev
```

`.env.example` 只包含本地开发占位值。生产环境不得复用任何 `change-me`、`dev-only` 或示例 OIDC 配置。

## 本地运行

### 一键启动宿主机开发服务

如果已经完成依赖安装并准备好根目录 `.env`，可以直接启动用户端、后台端、Product API 和 Agent Runtime：

```powershell
pnpm dev:local
```

Windows 也可以双击 `scripts/start-dev.cmd` 启动；需要同时启动 PostgreSQL、Redis、MinIO 和 Phoenix 时执行：

```powershell
pnpm dev:local -- --infra
```

脚本会为每个服务添加统一前缀输出，按 `Ctrl+C` 会停止本次启动的全部开发进程。首次使用仍需按环境准备完成数据库迁移和种子数据，脚本不会自动执行迁移或写入数据。

### 方案一：完整 Docker Compose 集成栈

```powershell
docker compose --env-file .env -f infra/docker/docker-compose.yml up --build -d
docker compose --env-file .env -f infra/docker/docker-compose.yml ps
```

默认入口：

| 服务          | 地址                             |
| ------------- | -------------------------------- |
| Web           | `http://localhost:3000`          |
| Product API   | `http://localhost:3001/api`      |
| Swagger       | `http://localhost:3001/api/docs` |
| Admin         | `http://localhost:3002`          |
| Agent Runtime | `http://localhost:8000`          |
| Phoenix       | `http://localhost:6006`          |
| MinIO Console | `http://localhost:9001`          |

停止服务：

```powershell
docker compose --env-file .env -f infra/docker/docker-compose.yml down
```

此 Compose 文件定位为**本地开发与集成验证栈**，不是 Kubernetes、云托管或生产发布清单。

### 方案二：基础设施容器 + 宿主机开发服务

```powershell
docker compose --env-file .env -f infra/docker/docker-compose.yml up -d postgres redis minio minio-init phoenix
pnpm db:generate
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev
```

也可按需单独运行：

```powershell
pnpm dev:user-portal
pnpm dev:admin-console
pnpm dev:product-api
pnpm dev:agent-runtime
```

## 数据库与种子数据

Prisma 使用 `apps/product-api/prisma/schema/` 多文件 Schema，迁移位于 `apps/product-api/prisma/schema/migrations/`。

```powershell
pnpm db:validate          # 校验 Schema
pnpm db:generate          # 生成 Prisma Client
pnpm db:migrate           # 本地开发迁移
pnpm db:migrate:deploy    # CI、容器或受控环境应用既有迁移
pnpm db:seed              # 幂等写入默认租户与公共题目
```

`db:seed` 需要可用的 `DATABASE_URL`，可以重复执行，不应创建重复数据。

### 导入外部题库（agent-interview-hub）

`scripts/import-agent-interview-hub.ts` 用于把 [agent-interview-hub](https://github.com/Zchary1106/agent-interview-hub) 整理的公司面试题 JSON 导入 `public` 租户题库：脚本按「公司 + 题干 + 序号」哈希生成稳定 ID 做幂等 upsert，可重复执行；根据题干自动推断题型（system_design / project_deep_dive / short_answer），并写入统一评分标准与来源引用。

使用前需要可用的 `DATABASE_URL` 且已执行 `pnpm db:generate` 与迁移；数据文件为 `[{ company, questions: [{ question, answer, thinking? }] }]` 结构的 JSON：

```powershell
pnpm exec tsx scripts/import-agent-interview-hub.ts <data.json 路径>
```

不传路径时使用脚本内置的本机默认路径（仅适用于原始导入环境），因此团队使用时应显式传入数据文件路径。

## 认证模式

### Product API

通过 `AUTH_MODE` 选择：

- `development`：仅限本地开发；读取 `x-development-actor: user | admin`。
- `jwt_hs256`：校验 HMAC JWT；必须配置足够长度的 `JWT_SECRET`、`JWT_ISSUER`、`JWT_AUDIENCE`。
- `oidc`：通过远程 JWKS 校验 OIDC Access Token；必须配置 `OIDC_ISSUER_URL`、`OIDC_JWKS_URL`、`OIDC_AUDIENCE`。

生产环境启动时会拒绝 `development` 认证模式。Agent Runtime 使用 `INTERNAL_AGENT_TOKEN` 与 `x-service-name` 校验内部调用身份。

### Web 与 Admin

通过 `NEXT_PUBLIC_AUTH_MODE` 选择：

- `development`：自动附加开发身份头，仅限本地。
- `oidc`：使用 Authorization Code + PKCE 登录、回调与登出流程。

Web 使用 `NEXT_PUBLIC_OIDC_CLIENT_ID`；Admin 使用独立的 `NEXT_PUBLIC_ADMIN_OIDC_CLIENT_ID`、回调地址和登出地址，生产环境不得共用客户端身份。

## 健康检查与 API 文档

Product API：

- `GET /api/health`、`GET /api/health/live`：存活探针。
- `GET /api/health/ready`：检查 PostgreSQL；当 `REDIS_REQUIRED=true` 时同时要求 Redis 可用。
- `GET /api/docs`：仅在 `API_SWAGGER_ENABLED=true` 时开放 Swagger UI。

Agent Runtime：

- `GET /health`、`GET /health/live`：存活探针。
- `GET /health/ready`：配置就绪探针。
- `POST /interviews/next`：仅允许携带内部服务身份的 Product API 调用。

## 质量门禁

```powershell
pnpm format:check
pnpm contracts:check
pnpm db:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm security:audit
pnpm infra:config
pnpm test:e2e
```

聚合代码验证可运行：

```powershell
pnpm verify
```

`pnpm verify` 覆盖上面列出的静态检查、单元测试、构建与审计门禁，但**不包含 E2E**；端到端验收需要单独执行 `pnpm test:e2e`。

确定性评测门禁可独立运行：

```powershell
pnpm test:evals            # practice-evaluation 与 report 的 Schema/Golden 校验
pnpm test:retrieval-eval   # 12 例检索 Golden 的 Recall@5 / MRR / nDCG 指标
```

两者均为纯确定性检查，不需要数据库或真实模型凭证，已接入 CI。`evals/run-agent-evals.ts` 的可选 LLM Judge（`LLM_JUDGE_ENABLED=true` 且配置 `LLM_JUDGE_URL`）需要真实 Judge 服务，不在 CI 中执行。

Agent Runtime 的 lint 同时执行 Ruff、格式检查和结构门禁；测试启用分支覆盖率且最低覆盖率为 85%。TypeScript ESLint 规则对源文件执行以下硬限制：文件不超过 300 行、函数不超过 50 行、嵌套不超过 3 层、位置参数不超过 3 个、圈复杂度不超过 10，并禁止未命名魔法数字。

`pnpm test:e2e` 需要 Docker 和 Playwright Chromium。它会启动独立的 PostgreSQL、Redis、模型替身、Product API、Agent Runtime、用户端和后台端，并在独立端口完成登录、模型调用、审核发布、看板与密钥脱敏验收，不会复用本地开发服务。前端默认先 `next build` 再以 `next start` 运行生产构建（不启用 standalone 输出）；本地调试可设置 `E2E_DEV_SERVER=1` 回退到 `next dev`。容器镜像构建通过 `NEXT_OUTPUT_STANDALONE=true` 显式开启 standalone 输出。

CI 将质量门禁拆分为并行任务（静态检查、Lint、类型检查、单元测试与评测、数据库迁移与集成测试、构建、依赖审计），并通过聚合的 `quality` 任务作为分支保护入口；此外还执行隔离 E2E 验收、Compose 校验、Docker 镜像构建、Gitleaks、Dependency Review、SPDX SBOM 和 CodeQL。E2E 失败或取消时会保留 Playwright 报告与测试产物。

## 发布前检查

- 使用生产 OIDC Client、TLS 与明确的 CORS 白名单；禁止 `development` 认证和示例回调地址。
- 在 Secret Manager 中配置并轮换 `CREDENTIAL_ENCRYPTION_KEY_CURRENT`、可选上一版本密钥、内部服务令牌和 Provider Key；轮换后在后台重新测试模型连接。
- 确认 PostgreSQL、Redis、Product API 与 Agent Runtime 的 ready 探针均通过，并由变更负责人完成迁移、备份和恢复演练。
- 明确灰度范围、监控阈值、回滚开关、回滚负责人和通知渠道；发布后复核审核队列、AI 调用失败率与训练报告链路。

## 安全与协作

- 不提交 `.env`、访问令牌、私钥、数据库凭证或真实用户数据。
- 生产环境必须使用 TLS、独立 OIDC Client、密钥管理服务、最小权限数据库账号与受控网络边界。
- 对外 API 统一经过认证、授权、租户校验、输入验证、限流和结构化错误处理。
- 数据库写入使用 Prisma 参数化查询与事务；禁止拼接 SQL 或不可信 Shell 命令。
- 漏洞报告流程见 `SECURITY.md`，贡献流程见 `CONTRIBUTING.md`。

## 当前范围说明

仓库已经具备可验证的业务边界、持久化 Repository、数据库事务、事件重放、前后端认证适配、本地集成基础设施、受控 Provider 调用、Memory/RAG、确定性评测与失败回放能力。真实 Provider CI、托管 LLM Judge、生产级云基础设施、集中式 Secret Manager、外部 OIDC 租户配置与正式可观测性后端仍属于部署环境能力，不应在本地示例中伪装为已完成。
