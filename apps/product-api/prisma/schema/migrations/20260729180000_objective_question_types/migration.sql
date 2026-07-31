-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE 'single_choice';
ALTER TYPE "QuestionType" ADD VALUE 'multiple_choice';

-- AlterTable
ALTER TABLE "Question"
  ADD COLUMN "options" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "correctOptionIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "CandidateQuestion"
  ADD COLUMN "options" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "correctOptionIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
