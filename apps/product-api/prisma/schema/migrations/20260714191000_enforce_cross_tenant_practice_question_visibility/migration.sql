-- Preserve the existing rule: cross-tenant practice items may only use public, published questions.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "PracticeSessionItem" AS item
    JOIN "Question" AS question
      ON question."tenantId" = item."questionTenantId"
      AND question.id = item."questionId"
    WHERE item."tenantId" <> question."tenantId"
      AND (question."visibility" <> 'public' OR question."status" <> 'published')
  ) THEN
    RAISE EXCEPTION 'PracticeSessionItem references a non-public question from another tenant';
  END IF;
END $$;

CREATE FUNCTION "validate_practice_session_item_question_visibility"()
RETURNS TRIGGER AS $$
DECLARE
  question_visibility "QuestionVisibility";
  question_status "QuestionStatus";
BEGIN
  IF NEW."tenantId" = NEW."questionTenantId" THEN
    RETURN NEW;
  END IF;

  SELECT question."visibility", question."status"
    INTO question_visibility, question_status
    FROM "Question" AS question
    WHERE question."tenantId" = NEW."questionTenantId"
      AND question.id = NEW."questionId"
    FOR SHARE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF question_visibility <> 'public' OR question_status <> 'published' THEN
    RAISE EXCEPTION 'PracticeSessionItem cannot reference a non-public question from another tenant'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "validate_question_cross_tenant_practice_visibility"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."visibility" = 'public' AND NEW."status" = 'published' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "PracticeSessionItem" AS item
    WHERE item."questionTenantId" = OLD."tenantId"
      AND item."questionId" = OLD.id
      AND item."tenantId" <> OLD."tenantId"
  ) THEN
    RAISE EXCEPTION 'Question with cross-tenant practice references must remain public and published'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PracticeSessionItem_enforce_cross_tenant_question_visibility"
BEFORE INSERT OR UPDATE OF "tenantId", "questionTenantId", "questionId"
ON "PracticeSessionItem"
FOR EACH ROW
EXECUTE FUNCTION "validate_practice_session_item_question_visibility"();

CREATE TRIGGER "Question_enforce_cross_tenant_practice_visibility"
BEFORE UPDATE OF "tenantId", "visibility", "status"
ON "Question"
FOR EACH ROW
EXECUTE FUNCTION "validate_question_cross_tenant_practice_visibility"();
