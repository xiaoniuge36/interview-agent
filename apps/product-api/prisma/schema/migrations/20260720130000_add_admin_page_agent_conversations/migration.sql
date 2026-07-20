CREATE TYPE "AdminPageAgentMessageRole" AS ENUM ('user', 'assistant', 'error');

CREATE TABLE "AdminPageAgentConversation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT '新对话',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminPageAgentConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminPageAgentMessage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" "AdminPageAgentMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "tokenCount" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminPageAgentMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminPageAgentConversation_tenantId_id_key" ON "AdminPageAgentConversation"("tenantId", "id");
CREATE INDEX "AdminPageAgentConversation_tenantId_userId_updatedAt_idx" ON "AdminPageAgentConversation"("tenantId", "userId", "updatedAt");
CREATE INDEX "AdminPageAgentMessage_tenantId_conversationId_createdAt_idx" ON "AdminPageAgentMessage"("tenantId", "conversationId", "createdAt");

ALTER TABLE "AdminPageAgentConversation"
  ADD CONSTRAINT "AdminPageAgentConversation_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminPageAgentConversation"
  ADD CONSTRAINT "AdminPageAgentConversation_tenantId_userId_fkey"
  FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminPageAgentMessage"
  ADD CONSTRAINT "AdminPageAgentMessage_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminPageAgentMessage"
  ADD CONSTRAINT "AdminPageAgentMessage_tenantId_conversationId_fkey"
  FOREIGN KEY ("tenantId", "conversationId") REFERENCES "AdminPageAgentConversation"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
