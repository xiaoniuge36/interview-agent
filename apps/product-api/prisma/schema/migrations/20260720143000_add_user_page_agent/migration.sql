ALTER TYPE "AiInvocationOperation" ADD VALUE IF NOT EXISTS 'user_page_agent';

CREATE TYPE "UserAgentMessageRole" AS ENUM ('user', 'assistant', 'error');

CREATE TABLE "UserAgentConversation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT '新对话',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserAgentConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserAgentMessage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" "UserAgentMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "tokenCount" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAgentMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserAgentConversation_tenantId_id_key" ON "UserAgentConversation"("tenantId", "id");
CREATE INDEX "UserAgentConversation_tenantId_userId_updatedAt_idx" ON "UserAgentConversation"("tenantId", "userId", "updatedAt");
CREATE INDEX "UserAgentMessage_tenantId_conversationId_createdAt_idx" ON "UserAgentMessage"("tenantId", "conversationId", "createdAt");

ALTER TABLE "UserAgentConversation"
  ADD CONSTRAINT "UserAgentConversation_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserAgentConversation"
  ADD CONSTRAINT "UserAgentConversation_tenantId_userId_fkey"
  FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserAgentMessage"
  ADD CONSTRAINT "UserAgentMessage_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserAgentMessage"
  ADD CONSTRAINT "UserAgentMessage_tenantId_conversationId_fkey"
  FOREIGN KEY ("tenantId", "conversationId") REFERENCES "UserAgentConversation"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
