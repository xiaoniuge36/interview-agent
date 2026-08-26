## 变更说明

- 变更动机：
- 实现要点：
- 关联 Issue／需求：

## 变更类型

- [ ] `feat` 新功能
- [ ] `fix` 缺陷修复
- [ ] `refactor` 重构（无行为变更）
- [ ] `test` 测试补充
- [ ] `docs` 文档更新
- [ ] `chore` 构建／工程配置

## 验证清单

在本地依次执行并全部通过（可用 `pnpm verify` 聚合执行，不含 E2E）：

```text
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

- [ ] 上述质量门禁全部通过
- [ ] 涉及端到端行为时已运行 `pnpm test:e2e`
- [ ] 涉及评测逻辑时已运行 `pnpm test:evals` 与 `pnpm test:retrieval-eval`
- [ ] Docker / Compose 变更已通过 `pnpm infra:config`（必要时 `pnpm infra:build`）
- [ ] 手工冒烟验证（Smoke Test）已完成并在描述中说明

## 数据与契约

- [ ] Prisma Schema 变更附带迁移文件，且迁移可回滚
- [ ] 契约（`packages/contracts`）变更已重新生成 Runtime Schema 并通过 `pnpm contracts:check`
- [ ] 新增环境变量已同步 `.env.example`、Compose 与 README

## 安全检查

- [ ] 未提交任何密钥、令牌、真实凭证或用户数据
- [ ] 对外接口具备认证、授权、租户隔离与输入校验
- [ ] 未放宽 CORS、限流或错误处理策略
- [ ] 依赖变更已通过 `pnpm security:audit`

## 风险与回滚

- 影响范围：
- 潜在风险与监控指标：
- 回滚方案（配置开关／回滚迁移／回退镜像）：
- 需要通知的干系人：
