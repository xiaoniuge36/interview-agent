-- Persist the revision emitted in CandidateQuestion audit state transitions.

ALTER TABLE "CandidateQuestion"
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
