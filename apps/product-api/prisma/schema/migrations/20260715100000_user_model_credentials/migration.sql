CREATE TABLE "UserModelCredential" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "baseUrl" TEXT,
    "ciphertext" BYTEA NOT NULL,
    "iv" BYTEA NOT NULL,
    "authTag" BYTEA NOT NULL,
    "keyVersion" INTEGER NOT NULL,
    "keyHint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unverified',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lastTestedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserModelCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserModelCredential_tenantId_id_key"
ON "UserModelCredential"("tenantId", "id");

CREATE INDEX "UserModelCredential_tenantId_userId_isDefault_status_idx"
ON "UserModelCredential"("tenantId", "userId", "isDefault", "status");

ALTER TABLE "UserModelCredential"
ADD CONSTRAINT "UserModelCredential_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserModelCredential"
ADD CONSTRAINT "UserModelCredential_tenantId_userId_fkey"
FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
