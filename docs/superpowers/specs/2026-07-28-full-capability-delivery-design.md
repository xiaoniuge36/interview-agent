# 全能力交付总设计

**日期：** 2026-07-28  
**状态：** 已确认设计，待拆分实施计划  
**适用范围：** `interview-agent` Monorepo  
**目标：** 在不引入爬虫和外部云资源前置条件的情况下，完成仓库内可实现、可本地验证、可由 CI 回归的记忆、检索、Agent 工作流、评测观测、运维安全与训练体验能力。

## 1. 背景

仓库已具备以下稳定基础：

- User Portal、Admin Console、Product API、Agent Runtime 四层边界。
- Schema-first contracts、Prisma 持久化、租户隔离、RBAC、审计和幂等命令。
- 后台导入、审核、发布，用户刷题、逐题评价、报告和模拟面试主链。
- `MemoryEvent`、`MasteryProfile`、`KnowledgeChunk.embedding`、pgvector HNSW 索引等数据基础。
- 隔离 PostgreSQL、Redis、模型替身、两个 Next 应用和 Agent Runtime 的 Playwright E2E 环境。
- 模型凭证加密、Product API 模型网关、Runtime grant、traceId 和 AI 调用统计。

当前主要缺口不是页面数量，而是能力之间尚未形成统一、可解释、可恢复、可评测的闭环：

```text
训练 / 面试结果
  → 可追溯 MemoryEvent
  → 确定性 Mastery 投影
  → 可解释推荐
  → Hybrid Retrieval
  → 受控 Agent 工作流
  → Golden / trace / failure replay
```

## 2. 范围

### 2.1 包含

1. 收口当前 Home Welcome、推荐栏和前后台 Agent 入口改动。
2. 刷题、面试统一产生版本化 `MemoryEvent`。
3. `MasteryProfile` 仅由确定性投影规则更新。
4. 推荐返回结构化 evidence，并修复高分标签被误判为弱项等正确性问题。
5. PostgreSQL Background Job、embedding、全文检索、pgvector、hybrid ranking 和 retrieval log。
6. RAG 接入训练题单、面试追问、报告和下一轮规划。
7. 新增具有真实分支、重试和 checkpoint 价值的 Runtime 工作流。
8. Retrieval、抽题、评分和报告 Golden 数据集，schema gate 与 LLM Judge 趋势评估。
9. API、Runtime、Provider、retrieval 的 trace 关联和 Phoenix/OpenTelemetry 接入。
10. 操作级 token、调用次数、耗时预算，Provider 熔断和半开恢复。
11. 本地与 CI 可验证的 OIDC、CORS、Secret 轮换和生产配置门禁。
12. 错题本、弱项复练、套卷连续性、面试报告到专项复练。
13. README 能力矩阵、验收证据和历史设计归档索引。

### 2.2 不包含

- 爬虫、网页采集、外部平台数据抓取。
- 真实云账号、真实 OIDC 租户、托管 Secret Manager 或生产 Kubernetes 资源创建。
- 商业计费、支付和额度商品化。
- 真实 Provider 作为 CI 强依赖。
- 独立向量数据库。
- 大规模语音面试或 MCP 工具生态铺开。
- 为展示技术而新增没有业务分支价值的 LangGraph。

## 3. 推进方式选择

采用按能力纵切的方案：

```text
Phase 0  收口当前 UX
Phase 1  记忆事件 → 掌握度 → 可解释推荐
Phase 2  Golden 基线 → Background Job → Embedding → Hybrid Retrieval
Phase 3  RAG 接入训练规划、面试追问和报告
Phase 4  Runtime 工作流、评测与失败回放
Phase 5  预算、熔断、安全门禁和正式观测
Phase 6  错题复练、套卷体验、文档治理和总验收
```

未采用基础设施优先，因为它会延迟用户可见价值；未采用功能面同时铺开，因为 contracts、Prisma schema、模型网关和应用入口存在高冲突共享面。

## 4. 系统边界

```text
User Portal / Admin Console
          │ HTTP / SSE
          ▼
Product API
  ├─ 认证、租户、授权、幂等、事务、审计
  ├─ MemoryEvent 持久化与 Mastery 投影
  ├─ Background Job、Embedding、Retrieval 与日志
  ├─ 模型凭证、预算和 Provider 网关
  └─ 签发 grant 调用 Runtime
          │ 内部 HTTP + grant
          ▼
Agent Runtime
  ├─ 面试工作流
  ├─ 训练报告和规划工作流
  ├─ 结构化输出、重试、checkpoint
  └─ 不直接写核心业务表
```

固定不变量：

1. Product API 是唯一业务事实源。
2. Agent Runtime 只返回结构化结果和候选 `MemoryEvent`。
3. UI 不直连数据库、Redis、Runtime 或 Provider。
4. SSE 只读取事件，不推进业务状态。
5. 检索投影可重建，不得反向覆盖业务事实。
6. 权限过滤在向量和关键词召回前生效。
7. 规则推荐始终保留，作为 RAG 失败时的 fallback 和 A/B 基线。

## 5. 记忆与推荐设计

### 5.1 MemoryEvent v1

现有 `delta: Record<string, unknown>` 无法统一表达刷题观测分与面试增量。新事件使用稳定、版本化语义：

```text
MemoryEvent
├─ id
├─ tenantId
├─ userId
├─ schemaVersion            = 1
├─ dedupeKey                唯一幂等键
├─ sourceType               practice | interview
├─ sourceId                 会话或报告 ID
├─ eventType                skill_observation | risk_signal | strength_confirmed | next_action
├─ tag
├─ observedScore            0..100，可为空的非技能事件除外
├─ evidence
├─ confidence               0..1
├─ traceId
└─ createdAt
```

`dedupeKey` 由 `sourceType + sourceId + eventType + tag` 稳定生成；数据库在 `tenantId + userId + dedupeKey` 上建立唯一约束。

### 5.2 Mastery 投影

`masteryProjection(current, event)` 是无 I/O 纯函数，输入当前投影和一条合法事件，输出：

- 新的 `score`。
- `evidenceCount`。
- `lastEvidenceEventId`。
- `lastEvidenceSessionId`。
- `trend: rising | stable | falling`。

第一版沿用可解释的加权平均，不引入复杂衰减算法。低置信度事件通过权重降低影响，所有权重和边界集中在投影模块，禁止在 practice、interview、recommendation 中重复实现。

### 5.3 事务边界

```text
报告完成命令
  → 校验所有评价 / Runtime 输出
  → 生成确定性 MemoryEvent
  → 插入尚不存在的事件
  → 应用 masteryProjection
  → 更新 MasteryProfile
  → 写报告并推进会话状态
  → 写审计记录
  → COMMIT
```

任一步失败，整个事务回滚。重复命令返回已有报告和投影，不重复累加证据。

### 5.4 推荐 evidence

推荐保留 `reason`，新增结构化 evidence：

```text
RecommendationEvidence
├─ type                     memory | mastery | job | profile | recent_practice | retrieval
├─ sourceId
├─ label
├─ detail
├─ score                    可选
└─ observedAt               可选
```

推荐规则必须：

- 只把低于明确阈值的 Mastery 当作弱项。
- 不把分类标签当作技能弱项。
- 优先使用最近低分证据，再使用长期 Mastery。
- 无个性化依据时明确返回 curated 原因。
- 限制候选组合数量，避免逐候选串行查询放大。

## 6. Retrieval 设计

### 6.1 通用检索投影

现有 `KnowledgeChunk` 继续表示导入资产片段；新增 `RetrievalChunk` 统一承载可搜索投影：

```text
RetrievalChunk
├─ id
├─ tenantId
├─ entityType               question | knowledge | jd | memory
├─ entityId
├─ chunkIndex
├─ content
├─ contentHash
├─ embeddingModel
├─ embeddingVersion
├─ embedding                vector(1536)
├─ searchVector             tsvector
├─ metadata
├─ status                   pending | ready | failed | stale
├─ failureCode
├─ embeddedAt
├─ createdAt
└─ updatedAt
```

唯一约束为 `tenantId + entityType + entityId + chunkIndex + contentHash + embeddingVersion`。业务内容更新时，旧投影标记为 `stale`，新投影完成前检索继续使用上一版本或规则 fallback。

### 6.2 Embedding Provider

- embedding 使用独立模型槽位，不复用 interviewer/report chat model。
- 第一版只支持 OpenAI-compatible `/embeddings` 协议。
- 模型配置必须声明 `dimensions = 1536`。
- 响应维度不匹配时拒绝写入并标记配置失败。
- 每次调用进入 `AiInvocation`，operation 为 `embedding`。
- CI 使用固定向量 stub，不调用真实 Provider。

### 6.3 Hybrid Retrieval

```text
请求
  → 鉴权与 tenant/entity/status 过滤
  → PostgreSQL full-text top N
  → pgvector cosine top N
  → 分数归一化
  → weighted merge
  → 去重与业务可见性复核
  → top K
  → RetrievalLog
```

默认权重由版本化 `RetrievalPolicy` 常量管理。Golden 评测决定最终权重，不开放任意用户输入覆盖。HNSW 查询使用当前 pgvector 支持的 iterative scan，并通过固定数据规模的查询计划和 Recall@K 测试验证过滤后的召回率。

### 6.4 RetrievalLog

```text
RetrievalLog
├─ tenantId
├─ userId
├─ traceId
├─ purpose
├─ sanitizedQuery
├─ filters
├─ policyVersion
├─ hitIds
├─ keywordScores
├─ vectorScores
├─ finalScores
├─ latencyMs
└─ createdAt
```

日志不保存密钥、Authorization、完整用户回答或未经清洗的长文本。

## 7. Background Job 设计

第一版使用 PostgreSQL job，避免在尚无实际吞吐数据时引入 BullMQ：

```text
BackgroundJob
├─ id
├─ tenantId
├─ type                     embed | reembed | evaluation
├─ dedupeKey
├─ status                   pending | running | retry_wait | succeeded | dead_letter
├─ payload
├─ attempts
├─ maxAttempts
├─ availableAt
├─ leaseOwner
├─ leaseExpiresAt
├─ errorCode
├─ traceId
├─ createdAt
└─ updatedAt
```

Worker 使用 `FOR UPDATE SKIP LOCKED` 领取任务。租约到期后允许其他 worker 重新领取；429、超时和 Provider 5xx 使用带抖动的指数退避；非法配置和维度错误直接进入 dead-letter。后台提供按权限过滤的失败列表与人工重试动作。

业务模块只依赖 `JobDispatcher`，未来替换 BullMQ 时不改调用方。

## 8. RAG 产品接入

按消费者逐个启用：

### 8.1 训练题单

输入为 JobIntent、Profile、Mastery、近期练习和检索候选。输出题目 ID、推荐 evidence、规则/RAG 来源和 policyVersion。无命中或超时时使用现有规则推荐。

### 8.2 面试追问

Product API 完成鉴权和检索，将有限、带来源的上下文通过 grant 传给 Runtime。Runtime 不接收可越权扩展的自由检索工具，只能使用本次请求附带的候选。

### 8.3 报告与下一轮规划

报告工作流引用本次回答、评价、检索证据和历史 MemoryEvent，生成结构化报告、候选 MemoryEvent 和下一步训练建议。Product API 校验后统一持久化。

每个消费者有独立 feature flag；启用顺序为训练题单、面试追问、报告规划。

## 9. Runtime 工作流

第二个 graph 选择 `practice_report`，因为它包含检索、生成、schema 修复、fallback 和记忆事件输出：

```text
START
  → prepare_context
  → retrieve_evidence
  → synthesize_report
  → validate_schema
      ├─ valid   → emit_memory_events → END
      └─ invalid → repair_once
                      ├─ valid → emit_memory_events → END
                      └─ fail  → deterministic_fallback → END
```

`memoryProjection` 不进入 Runtime。简单线性模型调用保留普通函数，不为技术展示强制建 graph。

## 10. 评测与观测

### 10.1 Golden 数据集

- Retrieval：固定查询、预期问题/资料 ID、租户与权限反例。
- 抽题：来源、标签、rubric、质量分和 schema。
- 评分：回答、预期分数区间、缺失点和必须引用证据。
- 报告：机器可读字段、事实一致性、行动建议和 MemoryEvent。

Retrieval 使用 Recall@K、MRR、nDCG；结构化能力使用 schema pass rate；评分和报告使用规则断言加 LLM Judge 趋势。LLM Judge 不作为唯一 CI gate。

### 10.2 Trace

统一 `traceId` 贯穿：

```text
HTTP request
  → Product API command
  → RetrievalLog
  → AgentRun / Runtime graph
  → Model Gateway
  → AiInvocation
  → MemoryEvent / AuditLog
```

Phoenix/OpenTelemetry 接入后，每一段成为关联 span；数据库记录继续作为业务级回放事实，不能只依赖观测后端。

## 11. 预算、熔断与安全

### 11.1 预算

按 operation 定义：

- 最大输入字符数。
- 最大输出 token。
- 单次调用超时。
- 单任务最大调用次数。
- 单任务最大总 token。

预算耗尽返回稳定错误码，保留已保存答案和已完成步骤，不生成半成品报告。

### 11.2 熔断

按 provider + model + operation 统计连续失败：

```text
closed
  → 达到失败阈值 → open
  → 冷却结束     → half_open
  → 探测成功     → closed
  → 探测失败     → open
```

测试使用可控时钟，不依赖真实等待。

### 11.3 安全门禁

- 生产配置拒绝 development auth、空 CORS、示例 Secret 和共享 OIDC client。
- Secret 轮换支持当前密钥和上一密钥的短暂双读，所有新写入只用当前密钥。
- 日志、RetrievalLog、AiInvocation 和错误响应执行敏感信息清洗。
- Runtime grant 固定 tenant、user、operation、traceId、过期时间和允许资源。
- RAG 返回结果再次经过 Product API 业务可见性校验。

## 12. 用户体验闭环

### 12.1 错题本

错题来自低分 EvaluationResult 和对应 MemoryEvent，不复制题目正文。题目下架后保留历史记录，但不可创建新训练。

### 12.2 弱项复练

从结构化 evidence 生成题单，展示弱项分数、证据来源、题目数量和预计时间。用户始终可以拒绝推荐并自主选题。

### 12.3 套卷连续性

首页统一展示未完成训练、最近报告、推荐下一轮和面试复练入口，避免多个页面各自计算下一步。

### 12.4 管理看板

展示 job 成功率、dead-letter、embedding 覆盖率、retrieval latency、schema pass rate、fallback rate 和预算拒绝次数，不展示原始答案、密钥或完整 prompt。

## 13. 失败恢复

| 场景                       | 行为                                   |
| -------------------------- | -------------------------------------- |
| 训练/面试重复完成          | 返回已有结果，不重复应用 MemoryEvent   |
| Mastery 并发冲突           | Serializable transaction 有限重试      |
| Embedding 429/超时         | 指数退避后重试                         |
| Embedding 维度错误         | dead-letter 并禁用该模型配置           |
| 内容更新未完成重嵌入       | 排除 stale，新版本不可用时规则降级     |
| Hybrid 无命中              | 使用规则推荐                           |
| Runtime 超时或 schema 非法 | 有限重试、一次 repair、确定性 fallback |
| 预算耗尽                   | 中止新模型调用，保留用户已保存数据     |
| RetrievalLog 写失败        | 不阻断用户主流程，记录结构化告警       |
| LLM Judge 不可用           | 继续运行确定性测试和 schema gate       |

## 14. 测试策略

### 14.1 Unit

- MemoryEvent schema、dedupeKey、masteryProjection。
- 推荐阈值、evidence、候选上限。
- ranking、归一化、retry、lease、budget、circuit breaker。
- Runtime graph 节点和条件路由。

### 14.2 Database Integration

- 报告、事件、Mastery、审计同事务。
- 重复完成幂等和并发证据不丢失。
- job 抢占、超时释放、退避、dead-letter。
- tenant-first hybrid query 和跨租户反例。
- 内容更新触发 stale/re-embed。

### 14.3 E2E

- 后台导入、审核发布、用户检索消费。
- 刷题完成、MemoryEvent、Mastery、下一轮推荐变化。
- 面试结束、报告、记忆、弱项复练。
- RAG 无命中规则降级。
- 模型非法或预算耗尽时答案不丢失。
- 页面刷新后恢复运行和历史。

### 14.4 CI

- CI 使用模型和 embedding stub。
- contracts generation、Prisma validate/generate、lint、typecheck、unit、integration、build、安全扫描和 E2E 保持现有门禁。
- Golden 指标保存机器可读结果，低于冻结基线时失败。
- 完整 E2E 继续使用隔离 PostgreSQL、Redis 和 Playwright Chromium。

## 15. 计划拆分与依赖

```text
Plan 00  当前 UX 收口
   ↓
Plan 01  MemoryEvent 与可解释推荐
   ↓
Plan 02  Background Job 与 Retrieval 底座
   ↓
Plan 03  RAG 产品纵切
   ├──────────────┐
   ↓              ↓
Plan 04  Runtime 与评测观测
   └──────────────┘
   ↓
Plan 05  预算、熔断与安全门禁
   ↓
Plan 06  完整体验、文档和总验收
```

### 15.1 并行 lanes

共享基础阶段串行：

```text
Lane S: contracts → Prisma schema → migration → generated schemas
```

基础冻结后：

```text
Plan 01
Lane A: Product API memory/practice
Lane B: Product API interview + Runtime event output
Lane C: User Portal evidence UI
Lane D: integration fixtures

Plan 02
Lane A: BackgroundJob worker
Lane B: Embedding Provider
Lane C: Retrieval Golden fixtures
Lane S: Hybrid repository and migration integration

Plan 03
Lane A: training recommendation RAG
Lane B: interview follow-up RAG
Lane C: source and fallback UI

Plan 04
Lane A: practice_report graph
Lane B: Golden/eval runner
Lane C: OpenTelemetry/Phoenix
```

RAG 消费者可以并行实现，但必须按训练题单、面试追问、报告规划的顺序启用。

### 15.2 单一所有权

以下位置由整合任务单一修改：

- `packages/contracts` 公共导出和共享 schema。
- Prisma schema 与 migrations。
- `package.json`、`pnpm-lock.yaml`、`uv.lock`。
- 根 CI、环境模板、Docker Compose。
- Nest `AppModule`、FastAPI `main.py` 等入口。
- Playwright runner 和最终 E2E 编排。

## 16. 分阶段验收

### Phase 0

- 当前相关测试、lint、typecheck、build 通过。
- 无 half-feature，工作区完成可审阅收口。

### Phase 1

- 刷题和面试均生成幂等 MemoryEvent。
- Mastery 只能通过统一投影更新。
- 推荐返回真实 evidence，不把高分标签称为弱项。
- 重复和并发集成测试通过。
- Playwright 验证下一轮推荐变化。

### Phase 2

- RetrievalChunk 具备租户、来源、模型版本和内容哈希。
- embedding job 可重试、可超时释放、可人工重跑。
- Hybrid API 权限过滤前置并记录 RetrievalLog。
- Golden 检索指标不低于纯关键词基线。

### Phase 3

- 三个消费者逐个达到来源可见、可降级和可关闭。
- 固定样例能对比规则与 RAG。
- Runtime 不直接写业务表。

### Phase 4

- 新 graph 具有可验证分支、retry、repair 和 checkpoint。
- 抽题、评分、报告均有 Golden fixture。
- schema fail、fallback 和质量指标可统计。
- trace 可关联检索、Runtime、Provider 和持久化结果。

### Phase 5

- operation 级预算和熔断生效。
- Phoenix 显示跨服务关联 span。
- 生产配置测试拒绝危险默认值。
- Secret 双密钥轮换测试通过。

### Phase 6

- 错题本、弱项复练和套卷共享统一证据。
- 完整演示覆盖资产、训练、面试、记忆和下一轮推荐。
- `pnpm verify`、`pnpm test:e2e` 和 Runtime coverage 全部通过。
- README 声明与实际测试证据一致。

## 17. 主要风险与控制

| 风险                                 | 控制                                                      |
| ------------------------------------ | --------------------------------------------------------- |
| shared contract 频繁变更造成跨端返工 | 每阶段先冻结 contract，单一所有权修改                     |
| MemoryEvent 重复导致 Mastery 漂移    | 稳定 dedupeKey、唯一约束、同事务投影                      |
| RAG 看似命中但质量低                 | Golden 先行、规则基线、分消费者 feature flag              |
| HNSW 过滤后召回不足                  | tenant-first 查询、iterative scan、Recall@K 回归          |
| embedding 模型切换污染索引           | model/version/contentHash、stale 与重嵌入                 |
| graph 为技术展示而膨胀               | 只有真实分支、恢复或 checkpoint 价值才使用 graph          |
| job 系统过早复杂化                   | PostgreSQL job + JobDispatcher，BullMQ 仅在证据充分时替换 |
| 可观测性记录敏感数据                 | 结构化清洗、preview 限长、禁止保存密钥和完整答案          |
| 全量范围导致长期不可演示             | 每个 Plan 独立验收，主分支始终保持可演示                  |

## 18. 最终完成定义

在干净环境中，固定样例能够稳定完成：

```text
后台导入资料
  → 候选题审核发布
  → embedding 与 hybrid retrieval
  → 用户岗位训练题单
  → 刷题评价与报告
  → MemoryEvent 与 Mastery 更新
  → 可解释下一轮推荐
  → RAG 模拟面试与报告
  → 弱项复练
  → 管理后台查看质量、成本、失败和 trace
```

所有路径具备租户隔离、结构化契约、失败恢复、确定性 fallback、Golden 指标和本地/CI 验证证据。仓库文档不得把外部云部署或未执行的真实 Provider 验证描述为已交付。
