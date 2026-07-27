CREATE TYPE "UserPageAgentRunStatus" AS ENUM (
  'running',
  'waiting_confirmation',
  'succeeded',
  'failed',
  'cancelled',
  'interrupted'
);

CREATE TABLE "UserPageAgentRun" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "retryOfRunId" TEXT,
  "clientRequestId" TEXT,
  "prompt" TEXT NOT NULL,
  "status" "UserPageAgentRunStatus" NOT NULL DEFAULT 'running',
  "currentStep" TEXT,
  "tokenCount" INTEGER NOT NULL DEFAULT 0,
  "traceId" TEXT NOT NULL,
  "errorCode" TEXT,
  "errorSummary" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "heartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserPageAgentRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPageAgentRun_tenantId_id_key"
  ON "UserPageAgentRun"("tenantId", "id");
CREATE UNIQUE INDEX "UserPageAgentRun_tenantId_userId_clientRequestId_key"
  ON "UserPageAgentRun"("tenantId", "userId", "clientRequestId");
CREATE INDEX "UserPageAgentRun_tenantId_userId_conversationId_startedAt_idx"
  ON "UserPageAgentRun"("tenantId", "userId", "conversationId", "startedAt");
CREATE INDEX "UserPageAgentRun_status_heartbeatAt_idx"
  ON "UserPageAgentRun"("status", "heartbeatAt");
CREATE INDEX "UserPageAgentRun_retryOfRunId_idx"
  ON "UserPageAgentRun"("retryOfRunId");

ALTER TABLE "UserPageAgentRun"
  ADD CONSTRAINT "UserPageAgentRun_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPageAgentRun"
  ADD CONSTRAINT "UserPageAgentRun_tenantId_userId_fkey"
  FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPageAgentRun"
  ADD CONSTRAINT "UserPageAgentRun_tenantId_conversationId_fkey"
  FOREIGN KEY ("tenantId", "conversationId") REFERENCES "UserAgentConversation"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPageAgentRun"
  ADD CONSTRAINT "UserPageAgentRun_retryOfRunId_fkey"
  FOREIGN KEY ("retryOfRunId") REFERENCES "UserPageAgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
