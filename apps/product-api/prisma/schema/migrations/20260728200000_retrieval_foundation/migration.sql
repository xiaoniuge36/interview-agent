CREATE TYPE "BackgroundJobType" AS ENUM ('embedding');
CREATE TYPE "BackgroundJobStatus" AS ENUM ('pending', 'running', 'retry_wait', 'succeeded', 'dead_letter');
CREATE TYPE "RetrievalChunkStatus" AS ENUM ('pending', 'ready', 'failed');

CREATE TABLE "BackgroundJob" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" "BackgroundJobType" NOT NULL,
  "status" "BackgroundJobStatus" NOT NULL DEFAULT 'pending',
  "dedupeKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseOwner" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BackgroundJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "RetrievalChunk" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "embeddingVersion" TEXT NOT NULL,
  "status" "RetrievalChunkStatus" NOT NULL DEFAULT 'pending',
  "embedding" vector(1536),
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RetrievalChunk_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RetrievalChunk_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "RetrievalLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT,
  "purpose" TEXT NOT NULL,
  "queryHash" TEXT NOT NULL,
  "hitIds" JSONB NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "latencyMs" INTEGER NOT NULL,
  "traceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RetrievalLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RetrievalLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BackgroundJob_tenantId_type_dedupeKey_key" ON "BackgroundJob"("tenantId", "type", "dedupeKey");
CREATE INDEX "BackgroundJob_status_availableAt_idx" ON "BackgroundJob"("status", "availableAt");
CREATE INDEX "BackgroundJob_leaseExpiresAt_idx" ON "BackgroundJob"("leaseExpiresAt");
CREATE INDEX "BackgroundJob_tenantId_createdAt_idx" ON "BackgroundJob"("tenantId", "createdAt");
CREATE UNIQUE INDEX "RetrievalChunk_tenantId_entityType_entityId_embeddingVersion_key" ON "RetrievalChunk"("tenantId", "entityType", "entityId", "embeddingVersion");
CREATE INDEX "RetrievalChunk_scope" ON "RetrievalChunk"("tenantId", "entityType", "status");
CREATE INDEX "RetrievalChunk_tenantId_entityId_idx" ON "RetrievalChunk"("tenantId", "entityId");
CREATE INDEX "RetrievalChunk_search_gin" ON "RetrievalChunk" USING GIN (to_tsvector('simple', "content"));
CREATE INDEX "RetrievalChunk_embedding_hnsw" ON "RetrievalChunk" USING hnsw ("embedding" vector_cosine_ops) WHERE "status" = 'ready';
CREATE INDEX "RetrievalLog_tenantId_purpose_createdAt_idx" ON "RetrievalLog"("tenantId", "purpose", "createdAt");
CREATE INDEX "RetrievalLog_traceId_idx" ON "RetrievalLog"("traceId");
