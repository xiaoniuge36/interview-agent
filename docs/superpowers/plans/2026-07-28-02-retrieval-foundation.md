# Background Job 与 Retrieval 底座 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 建立可重试的 PostgreSQL embedding job、可重建检索投影、tenant-first hybrid API 和固定检索基线。

**Architecture:** 业务表继续是真实来源，BackgroundJob 驱动 RetrievalChunk 投影；RetrievalService 用 raw SQL 执行全文和 pgvector 召回并记录 RetrievalLog。CI 使用固定向量 stub。

**Tech Stack:** NestJS、Prisma、PostgreSQL 16/pgvector、Zod、Jest、Docker E2E。

---

## 文件边界

- Create: packages/contracts/src/schemas/background-job.ts
- Create: packages/contracts/src/schemas/retrieval.ts
- Modify: packages/contracts/src/schemas/ai-usage.ts
- Modify: packages/contracts/src/index.ts
- Create: apps/product-api/prisma/schema/jobs.prisma
- Create: apps/product-api/prisma/schema/retrieval.prisma
- Create: apps/product-api/prisma/schema/migrations/20260728200000_retrieval_foundation/migration.sql
- Create: apps/product-api/src/modules/jobs/job-dispatcher.ts
- Create: apps/product-api/src/modules/jobs/job-repository.ts
- Create: apps/product-api/src/modules/jobs/job-worker.ts
- Create: apps/product-api/src/modules/jobs/jobs.module.ts
- Create: apps/product-api/src/modules/retrieval/embedding-client.ts
- Create: apps/product-api/src/modules/retrieval/retrieval-repository.ts
- Create: apps/product-api/src/modules/retrieval/retrieval.service.ts
- Create: apps/product-api/src/modules/retrieval/retrieval.controller.ts
- Create: apps/product-api/src/modules/retrieval/retrieval.module.ts
- Modify: apps/product-api/src/modules/model-credential/model-provider.client.ts
- Modify: apps/product-api/src/modules/import/import.service.ts
- Modify: apps/product-api/src/modules/content-review/candidate-publication.service.ts
- Modify: apps/product-api/src/common/config/environment.ts
- Modify: apps/product-api/src/app.module.ts
- Create: evals/retrieval/cases.json
- Create: evals/retrieval/run-retrieval-eval.ts

### Task 1: 冻结 Job 与 Retrieval 契约、表和索引

- [ ] Step 1: 写 job 状态与 retrieval hit schema 测试。

  expect(BackgroundJobSchema.parse({ status: "retry_wait", attempts: 2 })).toMatchObject({ status: "retry_wait" });
  expect(() => RetrievalHitSchema.parse({ id: "", score: 2 })).toThrow();

- [ ] Step 2: 定义查询契约。

  export const RetrievalQuerySchema = z.object({
  query: z.string().min(1).max(4000),
  purpose: z.enum(["training", "interview", "report"]),
  limit: z.number().int().min(1).max(20).default(8),
  });

- [ ] Step 3: 创建 BackgroundJob、RetrievalChunk、RetrievalLog migration。

  CREATE INDEX "RetrievalChunk_search_gin" ON "RetrievalChunk" USING GIN ("searchVector");
  CREATE INDEX "RetrievalChunk_embedding_hnsw" ON "RetrievalChunk" USING hnsw ("embedding" vector_cosine_ops) WHERE "status" = "ready";
  CREATE INDEX "RetrievalChunk_scope" ON "RetrievalChunk"("tenantId","entityType","status");

- [ ] Step 4: 验证生成产物。

Run: pnpm contracts:check && pnpm db:validate && pnpm db:generate

Expected: vector 保持 Prisma Unsupported，业务逻辑不直接依赖 Prisma vector 写入。

### Task 2: 实现 PostgreSQL job 领取、退避和 dead-letter

- [ ] Step 1: 写双 worker 互斥领取和租约超时重领的集成测试。

  expect((await Promise.all([workerA.claim(), workerB.claim()])).filter(Boolean)).toHaveLength(1);
  expect(await repository.claimExpired(nowAfterLease)).toMatchObject({ id: job.id, attempts: 2 });

- [ ] Step 2: 用 FOR UPDATE SKIP LOCKED 实现领取。

  WITH next AS (
  SELECT id FROM "BackgroundJob"
  WHERE status IN ("pending","retry_wait") AND "availableAt" <= NOW()
  FOR UPDATE SKIP LOCKED LIMIT 1
  )
  UPDATE "BackgroundJob" SET status="running", "leaseOwner"=$1, "leaseExpiresAt"=$2
  WHERE id IN (SELECT id FROM next) RETURNING *;

- [ ] Step 3: 对 429、timeout、5xx 退避；维度和配置错误进入 dead-letter。

  const retryable = ["MODEL_PROVIDER_RATE_LIMITED", "MODEL_PROVIDER_UNAVAILABLE", "EMBEDDING_TIMEOUT"].includes(code);
  return retryable && job.attempts < job.maxAttempts ? scheduleRetry(job, now) : markDeadLetter(job, code);

- [ ] Step 4: 配置 BACKGROUND_JOB_WORKER_ENABLED，只在显式启用时 poll。

Run: pnpm --filter @interview-agent/product-api exec jest --runInBand job-repository.integration.spec.ts job-worker.spec.ts

Expected: 没有重复领取、无限重试或失去租约。

### Task 3: 实现 embedding 投影

- [ ] Step 1: 为 OpenAI-compatible embedding、429、timeout、维度不匹配写测试。

  await expect(client.embed(connection, ["检索文本"])).resolves.toHaveLength(1);
  await expect(client.embed(badDimensionConnection, ["检索文本"])).rejects.toMatchObject({ code: "EMBEDDING_DIMENSION_INVALID" });

- [ ] Step 2: 添加独立 /embeddings 请求，禁止复用 chat completion body。

  const response = await fetch(baseUrl + "/embeddings", { method: "POST", headers, body: JSON.stringify({ model, input: texts }) });
  const vectors = parseEmbeddingResponse(await response.json());
  if (vectors.some((vector) => vector.length !== 1536)) throw new ModelProviderError("EMBEDDING_DIMENSION_INVALID");

- [ ] Step 3: 以 contentHash、embeddingVersion 和 entity 生成幂等 job，参数化 raw SQL 写 vector。

  await transaction.executeRaw(writeEmbeddingSql({ chunkId, vector, contentHash, version }));

- [ ] Step 4: 导入和发布后 dispatch job，不同步等待 embedding。

Run: pnpm --filter @interview-agent/product-api test -- embedding import candidate-publication

Expected: 内容写入立即完成，重复内容不重复排队。

### Task 4: 实现 hybrid API、日志和 Golden 基线

- [ ] Step 1: 为跨租户拒绝、向量-only 命中、关键词 fallback 写集成测试。

  expect((await retrieval.search(userA, input)).hits).not.toContainEqual(expect.objectContaining({ tenantId: tenantB }));
  expect((await retrieval.search(userA, input)).hits[0].source).toBe("hybrid");

- [ ] Step 2: 在 transaction 中先限定 tenant/entity/status，再执行关键词和向量召回。

  await transaction.executeRaw("SET LOCAL hnsw.iterative_scan = 'strict_order'");
  const hits = mergeRankedHits(await keywordHits(scope), await vectorHits(scope), policy);

- [ ] Step 3: 记录脱敏查询、分数、policyVersion、latency 和 traceId。

  await transaction.retrievalLog.create({ data: retrievalLogRecord(context, input, hits, latencyMs) });

- [ ] Step 4: 新增 12 条固定 case 和离线 eval runner。

Run: pnpm exec tsx evals/retrieval/run-retrieval-eval.ts

Expected: 输出每例 Recall@5、MRR、nDCG，总指标不低于关键词基线。

### Task 5: 完整验证并提交

- [ ] Step 1: 运行 contracts、schema、job/retrieval/embedding 测试和 eval。

Run: pnpm contracts:check && pnpm db:validate && pnpm --filter @interview-agent/product-api test -- jobs retrieval embedding && pnpm exec tsx evals/retrieval/run-retrieval-eval.ts

Expected: 全部通过。

- [ ] Step 2: 提交底座。

  git add packages/contracts apps/product-api evals
  git commit -m "feat(retrieval): 增加异步检索与嵌入底座"
