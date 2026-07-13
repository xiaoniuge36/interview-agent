-- CreateEnum
CREATE TYPE "ImportTaskStatus" AS ENUM ('received', 'processing', 'review', 'published', 'failed');

-- CreateEnum
CREATE TYPE "PracticeSessionStatus" AS ENUM ('created', 'in_progress', 'submitted', 'report_ready', 'cancelled');

-- CreateEnum
CREATE TYPE "PracticeItemStatus" AS ENUM ('pending', 'answered', 'evaluated');

-- CreateEnum
CREATE TYPE "PracticeMode" AS ENUM ('smart', 'manual', 'weakness_review');

-- AlterTable
ALTER TABLE "CandidateQuestion"
  ADD COLUMN "answer" TEXT,
  ADD COLUMN "difficulty" "QuestionDifficulty",
  ADD COLUMN "importTaskId" TEXT,
  ADD COLUMN "publishedQuestionId" TEXT,
  ADD COLUMN "reviewNotes" TEXT,
  ADD COLUMN "rubric" JSONB,
  ADD COLUMN "stem" TEXT,
  ADD COLUMN "type" "QuestionType";

-- Backfill legacy candidate records so review data remains usable after the richer schema is enabled.
UPDATE "CandidateQuestion"
SET
  "stem" = "title",
  "type" = 'short_answer',
  "difficulty" = 'medium',
  "answer" = 'Legacy candidate requires an approved answer before publication.',
  "rubric" = '[{"point":"Cover the core concept","score":10,"description":"Explain the primary concept in the candidate question."}]'::jsonb
WHERE "stem" IS NULL;

ALTER TABLE "CandidateQuestion"
  ALTER COLUMN "answer" SET NOT NULL,
  ALTER COLUMN "difficulty" SET NOT NULL,
  ALTER COLUMN "rubric" SET NOT NULL,
  ALTER COLUMN "stem" SET NOT NULL,
  ALTER COLUMN "type" SET NOT NULL;

-- CreateTable
CREATE TABLE "ImportTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ImportTaskStatus" NOT NULL DEFAULT 'received',
    "candidateCount" INTEGER NOT NULL DEFAULT 0,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobIntentId" TEXT,
    "mode" "PracticeMode" NOT NULL DEFAULT 'smart',
    "title" TEXT NOT NULL,
    "status" "PracticeSessionStatus" NOT NULL DEFAULT 'created',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "reportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeSessionItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "PracticeItemStatus" NOT NULL DEFAULT 'pending',
    "answer" TEXT,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeSessionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationResult" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionItemId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT NOT NULL,
    "missingPoints" TEXT[],
    "rubricScores" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "nextActions" TEXT[],
    "reportMarkdown" TEXT NOT NULL,
    "structuredData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasteryProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "lastEvidenceSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasteryProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportTask_tenantId_status_createdAt_idx" ON "ImportTask"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ImportTask_assetId_idx" ON "ImportTask"("assetId");

-- CreateIndex
CREATE INDEX "PracticeSession_tenantId_userId_status_updatedAt_idx" ON "PracticeSession"("tenantId", "userId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "PracticeSession_tenantId_jobIntentId_idx" ON "PracticeSession"("tenantId", "jobIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeSession_tenantId_id_key" ON "PracticeSession"("tenantId", "id");

-- CreateIndex
CREATE INDEX "PracticeSessionItem_tenantId_sessionId_status_idx" ON "PracticeSessionItem"("tenantId", "sessionId", "status");

-- CreateIndex
CREATE INDEX "PracticeSessionItem_tenantId_questionId_idx" ON "PracticeSessionItem"("tenantId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeSessionItem_sessionId_sequence_key" ON "PracticeSessionItem"("sessionId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationResult_sessionItemId_key" ON "EvaluationResult"("sessionItemId");

-- CreateIndex
CREATE INDEX "EvaluationResult_tenantId_createdAt_idx" ON "EvaluationResult"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeReport_sessionId_key" ON "PracticeReport"("sessionId");

-- CreateIndex
CREATE INDEX "PracticeReport_tenantId_createdAt_idx" ON "PracticeReport"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "MasteryProfile_tenantId_userId_updatedAt_idx" ON "MasteryProfile"("tenantId", "userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MasteryProfile_tenantId_userId_tag_key" ON "MasteryProfile"("tenantId", "userId", "tag");

-- CreateIndex
CREATE INDEX "CandidateQuestion_tenantId_publishedQuestionId_idx" ON "CandidateQuestion"("tenantId", "publishedQuestionId");

-- CreateIndex
CREATE INDEX "CandidateQuestion_importTaskId_idx" ON "CandidateQuestion"("importTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "Question_tenantId_id_key" ON "Question"("tenantId", "id");

-- AddForeignKey
ALTER TABLE "ImportTask" ADD CONSTRAINT "ImportTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportTask" ADD CONSTRAINT "ImportTask_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "KnowledgeAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateQuestion" ADD CONSTRAINT "CandidateQuestion_importTaskId_fkey" FOREIGN KEY ("importTaskId") REFERENCES "ImportTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_tenantId_userId_fkey" FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_tenantId_jobIntentId_fkey" FOREIGN KEY ("tenantId", "jobIntentId") REFERENCES "JobIntent"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSessionItem" ADD CONSTRAINT "PracticeSessionItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSessionItem" ADD CONSTRAINT "PracticeSessionItem_tenantId_sessionId_fkey" FOREIGN KEY ("tenantId", "sessionId") REFERENCES "PracticeSession"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSessionItem" ADD CONSTRAINT "PracticeSessionItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationResult" ADD CONSTRAINT "EvaluationResult_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationResult" ADD CONSTRAINT "EvaluationResult_sessionItemId_fkey" FOREIGN KEY ("sessionItemId") REFERENCES "PracticeSessionItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeReport" ADD CONSTRAINT "PracticeReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeReport" ADD CONSTRAINT "PracticeReport_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasteryProfile" ADD CONSTRAINT "MasteryProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasteryProfile" ADD CONSTRAINT "MasteryProfile_tenantId_userId_fkey" FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
