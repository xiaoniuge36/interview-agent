ALTER TYPE "MemoryEventType" ADD VALUE IF NOT EXISTS 'skill_observation';

CREATE TYPE "MemorySourceType" AS ENUM ('practice', 'interview');
CREATE TYPE "MasteryTrend" AS ENUM ('rising', 'stable', 'falling');

ALTER TABLE "MemoryEvent"
  ADD COLUMN "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "dedupeKey" TEXT,
  ADD COLUMN "sourceType" "MemorySourceType",
  ADD COLUMN "tag" TEXT,
  ADD COLUMN "observedScore" DOUBLE PRECISION,
  ADD COLUMN "traceId" TEXT;

ALTER TABLE "MasteryProfile"
  ADD COLUMN "weightedEvidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "lastEvidenceEventId" TEXT,
  ADD COLUMN "trend" "MasteryTrend" NOT NULL DEFAULT 'stable';

CREATE UNIQUE INDEX "MemoryEvent_tenantId_userId_dedupeKey_key"
  ON "MemoryEvent"("tenantId", "userId", "dedupeKey");
