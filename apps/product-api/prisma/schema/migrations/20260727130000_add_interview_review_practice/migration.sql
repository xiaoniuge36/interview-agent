ALTER TYPE "PracticeMode" ADD VALUE 'interview_review';

ALTER TABLE "PracticeSession"
  ADD COLUMN "sourceInterviewSessionId" TEXT;

CREATE INDEX "PracticeSession_tenantId_sourceInterviewSessionId_idx"
  ON "PracticeSession"("tenantId", "sourceInterviewSessionId");

ALTER TABLE "PracticeSession"
  ADD CONSTRAINT "PracticeSession_sourceInterviewSessionId_fkey"
  FOREIGN KEY ("sourceInterviewSessionId") REFERENCES "InterviewSession"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
