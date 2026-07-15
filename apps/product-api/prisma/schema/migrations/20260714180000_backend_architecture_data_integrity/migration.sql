-- Enforce tenant-aware references without changing Product API contracts.

ALTER TABLE "KnowledgeChunk" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "PracticeSessionItem" ADD COLUMN "questionTenantId" TEXT;

UPDATE "KnowledgeChunk" AS chunk
SET "tenantId" = asset."tenantId"
FROM "KnowledgeAsset" AS asset
WHERE asset.id = chunk."assetId";

UPDATE "PracticeSessionItem" AS item
SET "questionTenantId" = question."tenantId"
FROM "Question" AS question
WHERE question.id = item."questionId";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "KnowledgeChunk" WHERE "tenantId" IS NULL) THEN
    RAISE EXCEPTION 'KnowledgeChunk tenant backfill failed';
  END IF;

  IF EXISTS (SELECT 1 FROM "PracticeSessionItem" WHERE "questionTenantId" IS NULL) THEN
    RAISE EXCEPTION 'PracticeSessionItem question tenant backfill failed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "PracticeSessionItem" AS item
    JOIN "Question" AS question ON question.id = item."questionId"
    WHERE item."tenantId" <> question."tenantId"
      AND (question."visibility" <> 'public' OR question."status" <> 'published')
  ) THEN
    RAISE EXCEPTION 'PracticeSessionItem references a non-public question from another tenant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "ImportTask" AS task
    LEFT JOIN "KnowledgeAsset" AS asset
      ON asset.id = task."assetId" AND asset."tenantId" = task."tenantId"
    WHERE asset.id IS NULL
  ) THEN
    RAISE EXCEPTION 'ImportTask has an asset from another tenant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CandidateQuestion" AS candidate
    LEFT JOIN "ImportTask" AS task
      ON task.id = candidate."importTaskId" AND task."tenantId" = candidate."tenantId"
    WHERE candidate."importTaskId" IS NOT NULL AND task.id IS NULL
  ) THEN
    RAISE EXCEPTION 'CandidateQuestion has an import task from another tenant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CandidateQuestion" AS candidate
    LEFT JOIN "Question" AS question
      ON question.id = candidate."publishedQuestionId" AND question."tenantId" = candidate."tenantId"
    WHERE candidate."publishedQuestionId" IS NOT NULL AND question.id IS NULL
  ) THEN
    RAISE EXCEPTION 'CandidateQuestion has a published question from another tenant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "EvaluationResult" AS result
    LEFT JOIN "PracticeSessionItem" AS item
      ON item.id = result."sessionItemId" AND item."tenantId" = result."tenantId"
    WHERE item.id IS NULL
  ) THEN
    RAISE EXCEPTION 'EvaluationResult has a session item from another tenant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "PracticeReport" AS report
    LEFT JOIN "PracticeSession" AS session
      ON session.id = report."sessionId" AND session."tenantId" = report."tenantId"
    WHERE session.id IS NULL
  ) THEN
    RAISE EXCEPTION 'PracticeReport has a session from another tenant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "LocalCredential" AS credential
    LEFT JOIN "User" AS user_record
      ON user_record.id = credential."userId" AND user_record."tenantId" = credential."tenantId"
    WHERE user_record.id IS NULL
  ) THEN
    RAISE EXCEPTION 'LocalCredential has a user from another tenant';
  END IF;
END $$;

ALTER TABLE "KnowledgeChunk" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "PracticeSessionItem" ALTER COLUMN "questionTenantId" SET NOT NULL;

CREATE UNIQUE INDEX "KnowledgeAsset_tenantId_id_key" ON "KnowledgeAsset"("tenantId", "id");
CREATE UNIQUE INDEX "ImportTask_tenantId_id_key" ON "ImportTask"("tenantId", "id");
CREATE UNIQUE INDEX "PracticeSessionItem_tenantId_id_key" ON "PracticeSessionItem"("tenantId", "id");
CREATE UNIQUE INDEX "EvaluationResult_tenantId_sessionItemId_key" ON "EvaluationResult"("tenantId", "sessionItemId");
CREATE UNIQUE INDEX "PracticeReport_tenantId_sessionId_key" ON "PracticeReport"("tenantId", "sessionId");
CREATE UNIQUE INDEX "LocalCredential_tenantId_userId_key" ON "LocalCredential"("tenantId", "userId");

DROP INDEX "KnowledgeChunk_assetId_idx";
DROP INDEX "ImportTask_assetId_idx";
DROP INDEX "CandidateQuestion_importTaskId_idx";
DROP INDEX "EvaluationResult_sessionItemId_key";
DROP INDEX "PracticeReport_sessionId_key";
DROP INDEX "LocalCredential_userId_key";
DROP INDEX "LocalCredential_tenantId_userId_idx";

CREATE INDEX "KnowledgeChunk_tenantId_assetId_idx" ON "KnowledgeChunk"("tenantId", "assetId");
CREATE INDEX "ImportTask_tenantId_assetId_idx" ON "ImportTask"("tenantId", "assetId");
CREATE INDEX "ImportTask_tenantId_updatedAt_idx" ON "ImportTask"("tenantId", "updatedAt");
CREATE INDEX "CandidateQuestion_tenantId_createdAt_idx" ON "CandidateQuestion"("tenantId", "createdAt");
CREATE INDEX "CandidateQuestion_tenantId_importTaskId_idx" ON "CandidateQuestion"("tenantId", "importTaskId");
CREATE INDEX "Question_tenantId_updatedAt_idx" ON "Question"("tenantId", "updatedAt");
CREATE INDEX "PracticeSessionItem_questionTenantId_questionId_idx" ON "PracticeSessionItem"("questionTenantId", "questionId");

ALTER TABLE "KnowledgeChunk" DROP CONSTRAINT "KnowledgeChunk_assetId_fkey";
ALTER TABLE "ImportTask" DROP CONSTRAINT "ImportTask_assetId_fkey";
ALTER TABLE "CandidateQuestion" DROP CONSTRAINT "CandidateQuestion_importTaskId_fkey";
ALTER TABLE "PracticeSessionItem" DROP CONSTRAINT "PracticeSessionItem_questionId_fkey";
ALTER TABLE "EvaluationResult" DROP CONSTRAINT "EvaluationResult_sessionItemId_fkey";
ALTER TABLE "PracticeReport" DROP CONSTRAINT "PracticeReport_sessionId_fkey";

ALTER TABLE "KnowledgeChunk"
  ADD CONSTRAINT "KnowledgeChunk_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeChunk"
  ADD CONSTRAINT "KnowledgeChunk_tenantId_assetId_fkey"
  FOREIGN KEY ("tenantId", "assetId") REFERENCES "KnowledgeAsset"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportTask"
  ADD CONSTRAINT "ImportTask_tenantId_assetId_fkey"
  FOREIGN KEY ("tenantId", "assetId") REFERENCES "KnowledgeAsset"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CandidateQuestion"
  ADD CONSTRAINT "CandidateQuestion_tenantId_importTaskId_fkey"
  FOREIGN KEY ("tenantId", "importTaskId") REFERENCES "ImportTask"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CandidateQuestion"
  ADD CONSTRAINT "CandidateQuestion_tenantId_publishedQuestionId_fkey"
  FOREIGN KEY ("tenantId", "publishedQuestionId") REFERENCES "Question"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PracticeSessionItem"
  ADD CONSTRAINT "PracticeSessionItem_questionTenantId_questionId_fkey"
  FOREIGN KEY ("questionTenantId", "questionId") REFERENCES "Question"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EvaluationResult"
  ADD CONSTRAINT "EvaluationResult_tenantId_sessionItemId_fkey"
  FOREIGN KEY ("tenantId", "sessionItemId") REFERENCES "PracticeSessionItem"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PracticeReport"
  ADD CONSTRAINT "PracticeReport_tenantId_sessionId_fkey"
  FOREIGN KEY ("tenantId", "sessionId") REFERENCES "PracticeSession"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LocalCredential"
  ADD CONSTRAINT "LocalCredential_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LocalCredential"
  ADD CONSTRAINT "LocalCredential_tenantId_userId_fkey"
  FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
