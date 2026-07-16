ALTER TYPE "ActorRole" ADD VALUE IF NOT EXISTS 'platform_admin';

CREATE TYPE "AccountStatus" AS ENUM ('active', 'disabled');

ALTER TABLE "User"
  ADD COLUMN "status" "AccountStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN "disabledAt" TIMESTAMP(3),
  ADD COLUMN "disabledByUserId" TEXT,
  ADD COLUMN "lastSignedInAt" TIMESTAMP(3);

CREATE INDEX "User_status_createdAt_idx" ON "User"("status", "createdAt");
CREATE INDEX "User_lastSignedInAt_idx" ON "User"("lastSignedInAt");
