# 贡献指南

## 环境准备

推荐使用以下版本：

- Node.js 20–24（CI 基准 22）
- pnpm 10.33.0
- Python 3.11–3.12（CI 基准 3.12）
- uv 0.11.6
- Docker Engine 与 Docker Compose v2

初始化依赖：

```powershell
Copy-Item .env.example .env
pnpm install --frozen-lockfile
uv sync --project apps/agent-runtime --frozen --extra dev
pnpm db:generate
```

启动本地基础设施：

```powershell
pnpm infra:up
```

开发服务可分别运行 `pnpm dev:user-portal`、`pnpm dev:admin-console`、`pnpm dev:product-api` 与 `pnpm dev:agent-runtime`，或使用 `pnpm dev:local` 一键启动。

## 分支与提交规范

- 禁止向 `main` 直接推送，功能分支命名使用 `feat/*`、`fix/*`、`refactor/*` 或 `chore/*`。
- 通过 Pull Request 合并，评审通过且质量门禁全部绿灯后方可合入。
- 提交信息使用 `<type>(scope): <summary>` 格式，摘要使用祈使句、首字母小写、不超过 50 字符。
- 单个提交保持原子性：一个提交只做一件事，重构与行为变更分开提交。

## 代码规范

- 遵循 SOLID、DRY、高内聚低耦合与 YAGNI。
- 函数不超过 50 行，文件不超过 300 行，嵌套不超过 3 层。
- 位置参数不超过 3 个，圈复杂度不超过 10，禁止未命名魔法数字。
- TypeScript 全部启用严格模式；Python 必须通过 Ruff 与 mypy strict 检查。
- 跨端 DTO、事件与枚举统一定义在 `packages/contracts`，并同步生成 Runtime Schema。
- Product API 是唯一业务事实源；Agent Runtime 不得直接写入业务数据。

## 数据与配置变更

- Prisma Schema 变更必须附带迁移文件，迁移需要可回滚并通过集成验证。
- 破坏性字段调整需要先提供兼容窗口，再删除旧字段。
- 契约变更需要同步更新生成物（Runtime Schema）并通过契约检查。
- 新增环境变量必须同步 `.env.example`、相关文档与 Docker/Compose 配置及 README。

## 测试要求

- Bug 修复必须先补失败用例，再实现修复。
- 新功能需要覆盖正常路径、边界条件与失败路径。
- 集成边界（数据库、外部服务）优先使用真实依赖或受控替身验证。
- 不允许为通过 CI 而跳过、弱化或删除既有断言；确因行为变更调整用例时需在 PR 中说明。

## 质量门禁

提交 Pull Request 前必须依次通过以下命令：

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

也可以使用聚合命令 `pnpm verify` 一次执行以上门禁（不包含 E2E）。

端到端验收需要 Docker 与 Playwright Chromium，单独运行：

```powershell
pnpm test:e2e
```

确定性评测门禁（Schema/Golden 与检索指标）：

```powershell
pnpm test:evals
pnpm test:retrieval-eval
```

数据库集成测试需要可用的 pgvector PostgreSQL：先执行 `pnpm db:migrate:deploy`，再以 `RUN_DATABASE_INTEGRATION=true` 运行测试。涉及镜像变更时执行 `pnpm infra:build` 验证镜像构建。

## Pull Request

PR 描述需要包含变更动机、实现要点、验证结果与风险评估；按仓库 PR 模板填写验证清单。CI 全绿且 Code Owner 通过评审后方可合并。

安全漏洞不要通过公开 Issue 或 PR 披露，请按 [SECURITY.md](SECURITY.md) 的流程报告。
