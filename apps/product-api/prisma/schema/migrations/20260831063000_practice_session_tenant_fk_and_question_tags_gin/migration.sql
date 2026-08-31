-- 复合外键上线前置空跨租户误关联的历史引用，避免约束创建失败
UPDATE "PracticeSession" AS ps
SET "sourceInterviewSessionId" = NULL
WHERE ps."sourceInterviewSessionId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "InterviewSession" AS i
    WHERE i."id" = ps."sourceInterviewSessionId"
      AND i."tenantId" = ps."tenantId"
  );

-- DropForeignKey
ALTER TABLE "PracticeSession" DROP CONSTRAINT "PracticeSession_sourceInterviewSessionId_fkey";

-- CreateIndex
CREATE INDEX "Question_tags_idx" ON "Question" USING GIN ("tags" array_ops);

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_tenantId_sourceInterviewSessionId_fkey" FOREIGN KEY ("tenantId", "sourceInterviewSessionId") REFERENCES "InterviewSession"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
