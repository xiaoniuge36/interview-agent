CREATE TABLE "UserLearningProgress" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedSlugs" TEXT[],
    "lastOpenedSlug" TEXT,
    "verificationByCourse" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserLearningProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserLearningProgress_tenantId_userId_key"
ON "UserLearningProgress"("tenantId", "userId");

CREATE UNIQUE INDEX "UserLearningProgress_tenantId_id_key"
ON "UserLearningProgress"("tenantId", "id");

ALTER TABLE "UserLearningProgress"
ADD CONSTRAINT "UserLearningProgress_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserLearningProgress"
ADD CONSTRAINT "UserLearningProgress_tenantId_userId_fkey"
FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
