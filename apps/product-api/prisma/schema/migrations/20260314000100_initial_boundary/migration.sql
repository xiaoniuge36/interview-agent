-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "ActorRole" AS ENUM ('user', 'question_reviewer', 'admin', 'support', 'agent_runtime');

-- CreateEnum
CREATE TYPE "JobIntentStatus" AS ENUM ('draft', 'analyzing', 'ready', 'archived');

-- CreateEnum
CREATE TYPE "InterviewStage" AS ENUM ('warmup', 'self_intro', 'tech_basics', 'jd_core', 'project_deep_dive', 'scenario_design', 'hr', 'final_evaluation', 'report_ready', 'memory_updated');

-- CreateEnum
CREATE TYPE "InterviewSessionStatus" AS ENUM ('created', 'running', 'waiting_user', 'generating_report', 'report_ready', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "InterviewTurnRole" AS ENUM ('interviewer', 'candidate', 'system');

-- CreateEnum
CREATE TYPE "QuestionDifficulty" AS ENUM ('intro', 'easy', 'medium', 'hard', 'expert');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('short_answer', 'coding', 'system_design', 'project_deep_dive', 'behavioral');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('draft', 'published', 'disabled', 'archived');

-- CreateEnum
CREATE TYPE "MemoryEventType" AS ENUM ('skill_delta', 'risk_signal', 'strength_confirmed', 'next_action');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "ActorRole" NOT NULL DEFAULT 'user',
    "email" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "yearsOfExperience" INTEGER NOT NULL,
    "techStacks" TEXT[],
    "resumeSummary" TEXT NOT NULL,
    "projectExperiences" TEXT[],
    "currentLevel" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "riskSignals" TEXT[],
    "skillMap" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobIntent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "jdText" TEXT NOT NULL,
    "companyContext" TEXT,
    "communicationText" TEXT,
    "status" "JobIntentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobIntentId" TEXT NOT NULL,
    "skillWeights" JSONB NOT NULL,
    "interviewFocus" TEXT[],
    "riskSignals" TEXT[],
    "prepAdvice" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobIntentId" TEXT,
    "status" "InterviewSessionStatus" NOT NULL DEFAULT 'created',
    "stage" "InterviewStage" NOT NULL DEFAULT 'warmup',
    "version" INTEGER NOT NULL DEFAULT 0,
    "eventSequence" INTEGER NOT NULL DEFAULT 0,
    "workflowRunId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewTurn" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "commandId" TEXT NOT NULL,
    "role" "InterviewTurnRole" NOT NULL,
    "stage" "InterviewStage" NOT NULL,
    "content" TEXT NOT NULL,
    "structuredPayload" JSONB,
    "traceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "overall" JSONB NOT NULL,
    "stageScores" JSONB NOT NULL,
    "turnFeedback" JSONB NOT NULL,
    "projectDiagnosis" TEXT[],
    "nextActions" TEXT[],
    "memoryEvents" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "MemoryEventType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "delta" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'tenant',
    "title" TEXT NOT NULL,
    "stem" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "difficulty" "QuestionDifficulty" NOT NULL,
    "tags" TEXT[],
    "answer" TEXT NOT NULL,
    "rubric" JSONB NOT NULL,
    "sourceRefs" TEXT[],
    "status" "QuestionStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewCommand" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expectedVersion" INTEGER,
    "status" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "traceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "InterviewCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "commandId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "traceId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" "ActorRole" NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "stateTransition" JSONB,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "User_tenantId_role_idx" ON "User"("tenantId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_id_key" ON "User"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_tenantId_userId_key" ON "UserProfile"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_tenantId_id_key" ON "UserProfile"("tenantId", "id");

-- CreateIndex
CREATE INDEX "ProfileSnapshot_tenantId_profileId_createdAt_idx" ON "ProfileSnapshot"("tenantId", "profileId", "createdAt");

-- CreateIndex
CREATE INDEX "JobIntent_tenantId_userId_status_updatedAt_idx" ON "JobIntent"("tenantId", "userId", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobIntent_tenantId_id_key" ON "JobIntent"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "JobProfile_tenantId_jobIntentId_key" ON "JobProfile"("tenantId", "jobIntentId");

-- CreateIndex
CREATE INDEX "InterviewSession_tenantId_userId_status_updatedAt_idx" ON "InterviewSession"("tenantId", "userId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "InterviewSession_tenantId_jobIntentId_idx" ON "InterviewSession"("tenantId", "jobIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewSession_tenantId_id_key" ON "InterviewSession"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewSession_tenantId_workflowRunId_key" ON "InterviewSession"("tenantId", "workflowRunId");

-- CreateIndex
CREATE INDEX "InterviewTurn_tenantId_sessionId_createdAt_idx" ON "InterviewTurn"("tenantId", "sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "InterviewTurn_traceId_idx" ON "InterviewTurn"("traceId");

-- CreateIndex
CREATE INDEX "InterviewReport_tenantId_createdAt_idx" ON "InterviewReport"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewReport_tenantId_sessionId_key" ON "InterviewReport"("tenantId", "sessionId");

-- CreateIndex
CREATE INDEX "MemoryEvent_tenantId_userId_eventType_createdAt_idx" ON "MemoryEvent"("tenantId", "userId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "MemoryEvent_sourceId_idx" ON "MemoryEvent"("sourceId");

-- CreateIndex
CREATE INDEX "Question_tenantId_visibility_status_difficulty_idx" ON "Question"("tenantId", "visibility", "status", "difficulty");

-- CreateIndex
CREATE INDEX "KnowledgeAsset_tenantId_status_idx" ON "KnowledgeAsset"("tenantId", "status");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_assetId_idx" ON "KnowledgeChunk"("assetId");

-- CreateIndex
CREATE INDEX "InterviewCommand_tenantId_sessionId_createdAt_idx" ON "InterviewCommand"("tenantId", "sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "InterviewCommand_traceId_idx" ON "InterviewCommand"("traceId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewCommand_tenantId_id_key" ON "InterviewCommand"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewCommand_tenantId_sessionId_actorId_idempotencyKey_key" ON "InterviewCommand"("tenantId", "sessionId", "actorId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "InterviewEvent_tenantId_sessionId_occurredAt_idx" ON "InterviewEvent"("tenantId", "sessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "InterviewEvent_traceId_idx" ON "InterviewEvent"("traceId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewEvent_tenantId_sessionId_sequence_key" ON "InterviewEvent"("tenantId", "sessionId", "sequence");

-- CreateIndex
CREATE INDEX "AgentRun_tenantId_status_updatedAt_idx" ON "AgentRun"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "AgentRun_traceId_idx" ON "AgentRun"("traceId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_action_createdAt_idx" ON "AuditLog"("tenantId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_traceId_idx" ON "AuditLog"("traceId");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_tenantId_userId_fkey" FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileSnapshot" ADD CONSTRAINT "ProfileSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileSnapshot" ADD CONSTRAINT "ProfileSnapshot_tenantId_profileId_fkey" FOREIGN KEY ("tenantId", "profileId") REFERENCES "UserProfile"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobIntent" ADD CONSTRAINT "JobIntent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobIntent" ADD CONSTRAINT "JobIntent_tenantId_userId_fkey" FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobProfile" ADD CONSTRAINT "JobProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobProfile" ADD CONSTRAINT "JobProfile_tenantId_jobIntentId_fkey" FOREIGN KEY ("tenantId", "jobIntentId") REFERENCES "JobIntent"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_tenantId_userId_fkey" FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_tenantId_jobIntentId_fkey" FOREIGN KEY ("tenantId", "jobIntentId") REFERENCES "JobIntent"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewTurn" ADD CONSTRAINT "InterviewTurn_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewTurn" ADD CONSTRAINT "InterviewTurn_tenantId_sessionId_fkey" FOREIGN KEY ("tenantId", "sessionId") REFERENCES "InterviewSession"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewTurn" ADD CONSTRAINT "InterviewTurn_tenantId_commandId_fkey" FOREIGN KEY ("tenantId", "commandId") REFERENCES "InterviewCommand"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewReport" ADD CONSTRAINT "InterviewReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewReport" ADD CONSTRAINT "InterviewReport_tenantId_sessionId_fkey" FOREIGN KEY ("tenantId", "sessionId") REFERENCES "InterviewSession"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryEvent" ADD CONSTRAINT "MemoryEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryEvent" ADD CONSTRAINT "MemoryEvent_tenantId_userId_fkey" FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeAsset" ADD CONSTRAINT "KnowledgeAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "KnowledgeAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewCommand" ADD CONSTRAINT "InterviewCommand_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewCommand" ADD CONSTRAINT "InterviewCommand_tenantId_sessionId_fkey" FOREIGN KEY ("tenantId", "sessionId") REFERENCES "InterviewSession"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewEvent" ADD CONSTRAINT "InterviewEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewEvent" ADD CONSTRAINT "InterviewEvent_tenantId_sessionId_fkey" FOREIGN KEY ("tenantId", "sessionId") REFERENCES "InterviewSession"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewEvent" ADD CONSTRAINT "InterviewEvent_tenantId_commandId_fkey" FOREIGN KEY ("tenantId", "commandId") REFERENCES "InterviewCommand"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_tenantId_sessionId_fkey" FOREIGN KEY ("tenantId", "sessionId") REFERENCES "InterviewSession"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
