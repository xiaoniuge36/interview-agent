CREATE TYPE "AdminPageAgentRunStatus" AS ENUM (
  'running',
  'waiting_confirmation',
  'succeeded',
  'failed',
  'cancelled',
  'interrupted'
);

CREATE TABLE "AdminPageAgentRun" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "retryOfRunId" TEXT,
  "clientRequestId" TEXT,
  "prompt" TEXT NOT NULL,
  "status" "AdminPageAgentRunStatus" NOT NULL DEFAULT 'running',
  "currentStep" TEXT,
  "tokenCount" INTEGER NOT NULL DEFAULT 0,
  "traceId" TEXT NOT NULL,
  "errorCode" TEXT,
  "errorSummary" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "heartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminPageAgentRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminPageAgentRun_tenantId_id_key"
  ON "AdminPageAgentRun"("tenantId", "id");
CREATE UNIQUE INDEX "AdminPageAgentRun_tenantId_userId_clientRequestId_key"
  ON "AdminPageAgentRun"("tenantId", "userId", "clientRequestId");
CREATE INDEX "AdminPageAgentRun_tenantId_userId_conversationId_startedAt_idx"
  ON "AdminPageAgentRun"("tenantId", "userId", "conversationId", "startedAt");
CREATE INDEX "AdminPageAgentRun_status_heartbeatAt_idx"
  ON "AdminPageAgentRun"("status", "heartbeatAt");
CREATE INDEX "AdminPageAgentRun_retryOfRunId_idx"
  ON "AdminPageAgentRun"("retryOfRunId");

ALTER TABLE "AdminPageAgentRun"
  ADD CONSTRAINT "AdminPageAgentRun_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminPageAgentRun"
  ADD CONSTRAINT "AdminPageAgentRun_tenantId_userId_fkey"
  FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminPageAgentRun"
  ADD CONSTRAINT "AdminPageAgentRun_tenantId_conversationId_fkey"
  FOREIGN KEY ("tenantId", "conversationId") REFERENCES "AdminPageAgentConversation"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminPageAgentRun"
  ADD CONSTRAINT "AdminPageAgentRun_retryOfRunId_fkey"
  FOREIGN KEY ("retryOfRunId") REFERENCES "AdminPageAgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
