CREATE TYPE "AiInvocationOperation" AS ENUM (
    'model_connection_test',
    'practice_evaluation',
    'interview_next'
);

CREATE TYPE "AiInvocationStatus" AS ENUM ('succeeded', 'failed', 'cancelled');

CREATE TABLE "AiInvocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT,
    "sessionId" TEXT,
    "practiceSessionId" TEXT,
    "practiceItemId" TEXT,
    "operation" "AiInvocationOperation" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "AiInvocationStatus" NOT NULL,
    "traceId" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "cacheReadTokens" INTEGER,
    "reasoningTokens" INTEGER,
    "totalTokens" INTEGER,
    "latencyMs" INTEGER,
    "errorCode" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiInvocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiInvocation_tenantId_userId_createdAt_idx"
ON "AiInvocation"("tenantId", "userId", "createdAt");

CREATE INDEX "AiInvocation_tenantId_provider_model_createdAt_idx"
ON "AiInvocation"("tenantId", "provider", "model", "createdAt");

CREATE INDEX "AiInvocation_tenantId_status_createdAt_idx"
ON "AiInvocation"("tenantId", "status", "createdAt");

CREATE INDEX "AiInvocation_traceId_idx" ON "AiInvocation"("traceId");

ALTER TABLE "AiInvocation"
ADD CONSTRAINT "AiInvocation_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AiInvocation"
ADD CONSTRAINT "AiInvocation_tenantId_userId_fkey"
FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AiInvocation"
ADD CONSTRAINT "AiInvocation_credentialId_fkey"
FOREIGN KEY ("credentialId") REFERENCES "UserModelCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
