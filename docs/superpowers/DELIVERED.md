# Superpowers 计划交付索引

本索引记录当前计划的执行权威、代码提交和自动化证据。`delivered` 表示仓库内实现与门禁已有证据；不等同于真实云环境、外部身份租户或真实模型供应商已经上线。

## 当前交付主线

| 状态      | 计划 / 设计                                                | 代码证据          | 验收证据                                         |
| --------- | ---------------------------------------------------------- | ----------------- | ------------------------------------------------ |
| delivered | `plans/2026-07-28-00-ux-closeout.md`                       | 主线既有 UI 提交  | Portal/Admin tests 与 build                      |
| delivered | `plans/2026-07-28-01-memory-evidence-recommendations.md`   | `51f9272`         | memory/practice tests、用户 E2E                  |
| delivered | `plans/2026-07-28-02-retrieval-foundation.md`              | `e349d08`         | jobs/retrieval/embedding tests、Retrieval Golden |
| delivered | `plans/2026-07-28-03-rag-consumers.md`                     | `b166470`         | RAG flag/fallback tests、Runtime contract tests  |
| delivered | `plans/2026-07-28-04-runtime-evaluation-observability.md`  | `f470d9b`         | Runtime Pytest、Agent Golden、telemetry tests    |
| delivered | `plans/2026-07-28-05-budget-security-guardrails.md`        | `6fcdaae`         | Product API tests、安全审计、typecheck 与 build  |
| delivered | `plans/2026-07-28-06-training-experience-documentation.md` | 本提交            | Portal/Admin tests、用户 E2E、typecheck 与 build |
| delivered | `specs/2026-07-28-full-capability-delivery-design.md`      | Plan 00–06 实现链 | 本文件与 README 能力矩阵                         |

## 历史计划状态

- `plans/2026-07-14-*.md` 至 `plans/2026-07-27-*.md`：`superseded`。这些文档继续保留为局部设计与决策记录，当前交付判定以 2026-07-28 全能力设计、上述六个分阶段计划和自动化门禁为准。
- `specs/2026-07-15-*.md` 至 `specs/2026-07-27-*.md`：`superseded`。实现细节仍可追溯，但不再单独作为当前完成声明来源。
- `plans/2026-07-28-agent-history-and-icon-redesign.md` 与对应设计：`superseded`。交互成果已并入当前用户端与后台壳层，最终状态由全仓库 UI 回归确认。
- `plans/2026-07-29-learning-center.md`、`plans/2026-07-29-learning-path-v2.md` 与对应设计：`active`，由学习中心独立交付保留，不纳入 Plan 05/06 提交。
- `plans/2026-07-29-objective-question-bank.md` 与对应设计：`active`，由客观题独立交付保留，不纳入 Plan 05/06 提交。

## 已交付与未交付边界

已交付：MemoryEvent/Mastery、异步 embedding、tenant-first hybrid retrieval、三类 RAG 消费者、practice_report Graph、确定性 Golden、可选 Judge 接口、预算/熔断/脱敏、错题与复练体验。

未交付：真实 Provider CI 凭证与稳定性承诺、托管 LLM Judge 服务、生产 OIDC 租户、集中式 Secret Manager、云基础设施、正式 OTLP/Phoenix 后端和生产发布审批。

## 状态更新规则

1. 只有计划指定的测试、构建、安全与 E2E 门禁有新鲜通过证据，才能将 `active` 改为 `delivered`。
2. 被替代文档保留在仓库，不删除；新计划必须在本索引说明替代关系。
3. README 只引用本索引中已有自动化证据的能力，不把可选外部集成写成已上线。
