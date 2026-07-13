-- CreateTable
CREATE TABLE "LocalCredential" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LocalCredential_userId_key" ON "LocalCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LocalCredential_email_key" ON "LocalCredential"("email");

-- CreateIndex
CREATE INDEX "LocalCredential_tenantId_email_idx" ON "LocalCredential"("tenantId", "email");

-- CreateIndex
CREATE INDEX "LocalCredential_tenantId_userId_idx" ON "LocalCredential"("tenantId", "userId");