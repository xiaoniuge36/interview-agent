-- CreateIndex
CREATE INDEX "PracticeSessionItem_tenantId_questionId_createdAt_idx" ON "PracticeSessionItem"("tenantId", "questionId", "createdAt");

-- CreateIndex
CREATE INDEX "PracticeSessionItem_tenantId_updatedAt_idx" ON "PracticeSessionItem"("tenantId", "updatedAt");

-- CreateIndex
CREATE INDEX "EvaluationResult_tenantId_score_createdAt_idx" ON "EvaluationResult"("tenantId", "score", "createdAt");

-- CreateIndex
CREATE INDEX "MasteryProfile_tenantId_userId_score_idx" ON "MasteryProfile"("tenantId", "userId", "score");
