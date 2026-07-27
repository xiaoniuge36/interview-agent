# Interview Review Practice Design

## Problem

The current product provides a one-way continuation from an AI practice report to a mock interview.
When a mock interview finishes, its report exposes stage scores and next actions, but the user must
manually infer how to turn those findings into another training session. The existing weakness-review
mode uses only historical practice evaluations, so it cannot create a useful first recovery session
for a user whose fresh evidence comes from a mock interview.

## Decision

Add a durable `interview_review` practice mode. A completed mock-interview report can offer an inline
"专项回练" action. Before it creates anything, the action shows the two most relevant low-score
interview stages and asks for confirmation. After confirmation, Product API verifies that the source
session and report belong to the current user, selects up to five published questions whose types map
to the report stages, and creates a normal practice session linked to the source interview.

## Scope

- Add `interview_review` to the existing practice mode enum and persist an optional source interview
  session id on `PracticeSession`.
- Keep the existing practice answer, evaluation, completion, and report flow unchanged after the
  session is created.
- Add a `sourceInterviewSessionId` field to the local practice API contract so the portal can request
  a source-bound session and receive the durable source reference in the returned session.
- Render the action only when the currently displayed interview has a ready report and at least one
  actionable stage score.
- Use the lowest two non-terminal stages, ordered by ascending score, as the training focus. A score
  is actionable when it is below 70. If no stage is below 70, omit the action rather than invent a
  weakness.
- Map interview stages to question types without copying any answer content:

  | Interview stage | Practice question type |
  | --- | --- |
  | `self_intro`, `hr` | `behavioral` |
  | `tech_basics`, `jd_core` | `short_answer` |
  | `project_deep_dive` | `project_deep_dive` |
  | `scenario_design` | `system_design` |

- Ignore `warmup`, `final_evaluation`, and `report_ready`; they are not independent question skills.
- Prefer questions matching both the interview session's target-role category and selected types. If
  fewer than five exist, fill from tenant/public questions with those types; if still fewer than one,
  reject with an explicit no-questions error.

## Boundaries

- The user must explicitly confirm before `POST /practices` creates a session; opening, refreshing, or
  viewing an interview report has no side effect.
- Persist only the source interview session reference. Do not copy transcript text, candidate answers,
  turn feedback, missing points, provider data, or model prompts into the practice session.
- Use the current user's tenant and ownership checks for both source interview and source report.
- Do not alter Agent tool permissions, AI model calls, Admin Console behavior, root configuration, or
  dependencies.
- Existing `smart`, `manual`, and `weakness_review` session selection behavior remains unchanged.

## Data Flow

1. `ReportPanel` receives the loaded `InterviewReport` and current `InterviewSession`.
2. A pure portal model derives at most two display focus items from actionable stage scores.
3. The user opens the inline confirmation card and confirms the existing primary action.
4. The portal posts `{ mode: 'interview_review', sourceInterviewSessionId }` through the existing
   practice creation endpoint.
5. Product API checks source session ownership and report readiness, derives the same stage-to-type
   selection server-side, creates a linked `PracticeSession`, audits the creation, and returns the
   normal session payload.
6. The portal navigates to `/practice?session=<id>` and existing practice lifecycle takes over.

## Errors and Recovery

- The action remains single-flight while the create request is in progress.
- If the report becomes unavailable, the source is unauthorized, no stage is actionable, or no
  matching questions are published, Product API returns a deterministic validation error and the
  portal leaves the report visible with a retryable error notice.
- The action never creates a fallback generic session. A generic session would hide the fact that the
  requested report-driven recovery could not be honored.

## Verification

- Contract and Product API tests cover the new mode, input validation, source ownership, report-ready
  requirement, low-score ordering, stage mapping, role-first selection, fallback selection, and empty
  result rejection.
- Portal tests cover focus derivation, no-actionable-score rendering, confirmation copy, one-click
  prevention, request serialization, successful navigation, and error recovery.
- Run Prisma validation/generation, focused tests, both application lint/typecheck/full test/build,
  Prettier for supported source files, and `git diff --check`.
