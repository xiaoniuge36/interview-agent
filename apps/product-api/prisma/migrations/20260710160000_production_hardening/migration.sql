-- Production hardening: identity provisioning, typed state, telemetry and governance data.

CREATE TYPE "AuditResult" AS ENUM ('success', 'failure');
CREATE TYPE "QuestionVisibility" AS ENUM ('public', 'tenant');
CREATE TYPE "InterviewCommandType" AS ENUM ('start', 'advance', 'answer');
CREATE TYPE "InterviewCommandStatus" AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE "InterviewEventType" AS ENUM ('workflow_started', 'stage_changed', 'token', 'turn_completed', 'report_ready', 'error');
CREATE TYPE "AgentRunType" AS ENUM ('mock_interview');
CREATE TYPE "AgentRunStatus" AS ENUM ('running', 'succeeded', 'failed', 'fallback');
CREATE TYPE "CandidateReviewStatus" AS ENUM ('pending', 'needs_edit', 'approved', 'rejected');
CREATE TYPE "ModelProfileStatus" AS ENUM ('active', 'standby', 'disabled');
CREATE TYPE "ModelBudget" AS ENUM ('low', 'medium', 'high');
CREATE TYPE "KnowledgeSourceType" AS ENUM ('upload', 'url', 'repository', 'fixture');
CREATE TYPE "KnowledgeAssetStatus" AS ENUM ('received', 'processing', 'review', 'published', 'failed');

ALTER TABLE "User" ADD COLUMN "subject" TEXT;
UPDATE "User" SET "subject" = "id" WHERE "subject" IS NULL;
ALTER TABLE "User" ALTER COLUMN "subject" SET NOT NULL;
CREATE UNIQUE INDEX "User_tenantId_subject_key" ON "User"("tenantId", "subject");

ALTER TABLE "UserProfile"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "AuditLog"
  ALTER COLUMN "result" TYPE "AuditResult"
  USING (CASE WHEN "result" = 'failure' THEN 'failure' ELSE 'success' END)::"AuditResult";

ALTER TABLE "Question" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE "Question"
  ALTER COLUMN "visibility" TYPE "QuestionVisibility"
  USING (CASE WHEN "visibility" = 'public' THEN 'public' ELSE 'tenant' END)::"QuestionVisibility";
ALTER TABLE "Question" ALTER COLUMN "visibility" SET DEFAULT 'tenant';

ALTER TABLE "KnowledgeAsset" ALTER COLUMN "sourceType" TYPE "KnowledgeSourceType"
  USING (CASE
    WHEN "sourceType" IN ('upload', 'url', 'repository', 'fixture') THEN "sourceType"
    ELSE 'upload'
  END)::"KnowledgeSourceType";
ALTER TABLE "KnowledgeAsset" ALTER COLUMN "status" TYPE "KnowledgeAssetStatus"
  USING (CASE
    WHEN "status" IN ('received', 'processing', 'review', 'published', 'failed') THEN "status"
    ELSE 'received'
  END)::"KnowledgeAssetStatus";
ALTER TABLE "KnowledgeAsset" ALTER COLUMN "status" SET DEFAULT 'received';

ALTER TABLE "InterviewCommand" ALTER COLUMN "type" TYPE "InterviewCommandType"
  USING (CASE
    WHEN "type" IN ('start', 'advance', 'answer') THEN "type"
    ELSE 'advance'
  END)::"InterviewCommandType";
ALTER TABLE "InterviewCommand" ALTER COLUMN "status" TYPE "InterviewCommandStatus"
  USING (CASE
    WHEN "status" IN ('pending', 'completed', 'failed') THEN "status"
    ELSE 'failed'
  END)::"InterviewCommandStatus";
ALTER TABLE "InterviewCommand"
  ALTER COLUMN "status" SET DEFAULT 'pending',
  ALTER COLUMN "result" DROP NOT NULL,
  ADD COLUMN "errorCode" TEXT;
DROP INDEX "InterviewCommand_tenantId_sessionId_actorId_idempotencyKey_key";
CREATE UNIQUE INDEX "InterviewCommand_tenantId_actorId_idempotencyKey_key"
  ON "InterviewCommand"("tenantId", "actorId", "idempotencyKey");

ALTER TABLE "InterviewEvent" ALTER COLUMN "type" TYPE "InterviewEventType"
  USING (CASE
    WHEN "type" IN ('workflow_started', 'stage_changed', 'token', 'turn_completed', 'report_ready', 'error') THEN "type"
    ELSE 'error'
  END)::"InterviewEventType";

ALTER TABLE "AgentRun" ALTER COLUMN "type" TYPE "AgentRunType"
  USING 'mock_interview'::"AgentRunType";
ALTER TABLE "AgentRun" ALTER COLUMN "status" TYPE "AgentRunStatus"
  USING (CASE
    WHEN "status" IN ('running', 'succeeded', 'failed', 'fallback') THEN "status"
    ELSE 'failed'
  END)::"AgentRunStatus";
ALTER TABLE "AgentRun" ALTER COLUMN "stage" TYPE "InterviewStage"
  USING (CASE
    WHEN "stage" IN ('warmup', 'self_intro', 'tech_basics', 'jd_core', 'project_deep_dive', 'scenario_design', 'hr', 'final_evaluation', 'report_ready', 'memory_updated') THEN "stage"
    ELSE 'warmup'
  END)::"InterviewStage";
ALTER TABLE "AgentRun"
  ADD COLUMN "latencyMs" INTEGER,
  ADD COLUMN "schemaValid" BOOLEAN,
  ADD COLUMN "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "CandidateQuestion" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" "CandidateReviewStatus" NOT NULL DEFAULT 'pending',
  "qualityScore" DOUBLE PRECISION NOT NULL,
  "tags" TEXT[],
  "sourceRefs" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CandidateQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModelProfile" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "status" "ModelProfileStatus" NOT NULL DEFAULT 'standby',
  "budget" "ModelBudget" NOT NULL DEFAULT 'medium',
  "schemaMode" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ModelProfile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CandidateQuestion_tenantId_status_createdAt_idx"
  ON "CandidateQuestion"("tenantId", "status", "createdAt");
CREATE UNIQUE INDEX "ModelProfile_tenantId_provider_model_purpose_key"
  ON "ModelProfile"("tenantId", "provider", "model", "purpose");
CREATE INDEX "ModelProfile_tenantId_status_purpose_idx"
  ON "ModelProfile"("tenantId", "status", "purpose");
CREATE INDEX "KnowledgeChunk_embedding_hnsw_idx"
  ON "KnowledgeChunk" USING hnsw ("embedding" vector_cosine_ops);

ALTER TABLE "CandidateQuestion" ADD CONSTRAINT "CandidateQuestion_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ModelProfile" ADD CONSTRAINT "ModelProfile_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Durable command execution leases and command-scoped runtime telemetry.
ALTER TABLE "InterviewCommand"
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "leaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "InterviewCommand_tenantId_status_leaseExpiresAt_idx"
  ON "InterviewCommand"("tenantId", "status", "leaseExpiresAt");

ALTER TABLE "AgentRun" ADD COLUMN "commandId" TEXT;
CREATE INDEX "AgentRun_tenantId_commandId_createdAt_idx"
  ON "AgentRun"("tenantId", "commandId", "createdAt");
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_tenantId_commandId_fkey"
  FOREIGN KEY ("tenantId", "commandId") REFERENCES "InterviewCommand"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
