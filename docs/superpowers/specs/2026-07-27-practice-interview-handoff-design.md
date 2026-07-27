# Practice-to-Interview Handoff Design

## Problem

After a user completes an AI practice report, the completion page offers another question set or
weakness review but has no direct route to a mock interview. The route exists in the training
archive, but it is detached from the moment when the new training evidence is most actionable.

## Decision

Show a secondary link on an AI-completed practice result: “用模拟面试检验本轮提升”. It navigates
to the existing `/interview` entry page. Starting an interview remains a separate user action there:
the user chooses a job and presses the existing start button.

## Boundaries

- Render the link only when a full AI practice report is ready; self-study completion does not
  claim to have evidence ready for interview validation.
- Keep weakness review and next-recommendation actions as the primary continuation actions.
- Do not preselect a job, create an interview, submit an answer, invoke a model, or transfer
  practice-answer content into the interview request.
- Do not change APIs, persistence, contracts, schemas, dependencies, root configuration, backend,
  or Admin Console modules.

## Verification

- Test that an AI-completed practice result renders the mock-interview validation link.
- Test that self-study completion does not render it.
- Run focused User Portal tests, lint, TypeScript, full Vitest, production build, Prettier, and
  `git diff --check`.
