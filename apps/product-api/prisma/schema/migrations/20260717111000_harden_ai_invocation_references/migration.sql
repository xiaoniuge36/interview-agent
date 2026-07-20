-- Preserve AI invocation history and enforce tenant-aware credential references.

ALTER TABLE "AiInvocation"
  DROP CONSTRAINT "AiInvocation_credentialId_fkey";

CREATE INDEX "AiInvocation_tenantId_credentialId_createdAt_idx"
  ON "AiInvocation"("tenantId", "credentialId", "createdAt");

CREATE INDEX "AiInvocation_createdAt_idx"
  ON "AiInvocation"("createdAt");

ALTER TABLE "AiInvocation"
  ADD CONSTRAINT "AiInvocation_tenantId_credentialId_fkey"
  FOREIGN KEY ("tenantId", "credentialId")
  REFERENCES "UserModelCredential"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
