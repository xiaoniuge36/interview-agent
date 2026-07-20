-- Keep model credential status values aligned with the public contract while enforcing them in PostgreSQL.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "UserModelCredential"
    WHERE "status" NOT IN ('unverified', 'verified', 'disabled', 'failed')
  ) THEN
    RAISE EXCEPTION 'UserModelCredential contains an unsupported status value';
  END IF;
END $$;

CREATE TYPE "CredentialStatus" AS ENUM ('unverified', 'verified', 'disabled', 'failed');

ALTER TABLE "UserModelCredential"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "CredentialStatus" USING "status"::"CredentialStatus",
  ALTER COLUMN "status" SET DEFAULT 'unverified';
