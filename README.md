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
- 当前 Runtime 实现为规则化、确定性的工作流边界，已预留模型编排契约，但**尚未接入真实 LLM、RAG 或向量检索 Provider**。

## 目录结构

```text
interview-agent/
├─ apps/
│  ├─ web/                    # Next.js 用户端，默认端口 3000
│  ├─ admin/                  # Next.js 治理后台，默认端口 3002
│  ├─ api/                    # NestJS Product API，默认端口 3001
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

根目录 `apps/` 是 Monorepo 应用集合；`apps/web/src/app/`、`apps/admin/src/app/` 是 Next.js App Router 约定；`apps/agent-runtime/app/` 是 Python 包。三者语义不同，不应为追求表面一致而重命名。

## 技术栈

- Node.js 22（CI 基准；仓库允许 20–24）
- pnpm 10.33.0、Turborepo
- Next.js 15、React 18、TypeScript 5、Zod
- NestJS 11、Prisma 6、PostgreSQL 16 + pgvector、Redis 7
- Python 3.11/3.12、uv、FastAPI、Pydantic
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
pnpm dev:web
pnpm dev:admin
pnpm dev:api
pnpm dev:agent
```

## 数据库与种子数据

Prisma 使用 `apps/api/prisma/schema/` 多文件 Schema，迁移位于 `apps/api/prisma/migrations/`。

```powershell
pnpm db:validate          # 校验 Schema
pnpm db:generate          # 生成 Prisma Client
pnpm db:migrate           # 本地开发迁移
pnpm db:migrate:deploy    # CI、容器或受控环境应用既有迁移
pnpm db:seed              # 幂等写入默认租户与公共题目
```

`db:seed` 需要可用的 `DATABASE_URL`，可以重复执行，不应创建重复数据。

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
```

聚合代码验证可运行：

```powershell
pnpm verify
```

Agent Runtime 的 lint 同时执行 Ruff、格式检查和结构门禁；测试启用分支覆盖率且最低覆盖率为 85%。TypeScript ESLint 规则对源文件执行以下硬限制：文件不超过 300 行、函数不超过 50 行、嵌套不超过 3 层、位置参数不超过 3 个、圈复杂度不超过 10，并禁止未命名魔法数字。

CI 还执行数据库迁移与集成测试、生产依赖审计、Compose 校验、Docker 镜像构建、Gitleaks、Dependency Review、SPDX SBOM 和 CodeQL。

## 安全与协作

- 不提交 `.env`、访问令牌、私钥、数据库凭证或真实用户数据。
- 生产环境必须使用 TLS、独立 OIDC Client、密钥管理服务、最小权限数据库账号与受控网络边界。
- 对外 API 统一经过认证、授权、租户校验、输入验证、限流和结构化错误处理。
- 数据库写入使用 Prisma 参数化查询与事务；禁止拼接 SQL 或不可信 Shell 命令。
- 漏洞报告流程见 `SECURITY.md`，贡献流程见 `CONTRIBUTING.md`。

## 当前范围说明

仓库已经具备可验证的业务边界、持久化 Repository、数据库事务、事件重放、前后端认证适配和本地集成基础设施。真实 LLM/RAG Provider、生产级云基础设施、集中式 Secret Manager、外部 OIDC 租户配置与正式可观测性后端仍属于部署环境或后续产品能力，不应在本地示例中伪装为已完成。
