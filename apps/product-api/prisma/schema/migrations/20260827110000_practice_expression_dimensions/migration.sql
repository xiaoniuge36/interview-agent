-- 表达力四维评分与 AI 高分示范答案（存量行保持 NULL，由 contracts 层归一为空值）
ALTER TABLE "EvaluationResult" ADD COLUMN "dimensionScores" JSONB;
ALTER TABLE "EvaluationResult" ADD COLUMN "improvedAnswer" TEXT;
