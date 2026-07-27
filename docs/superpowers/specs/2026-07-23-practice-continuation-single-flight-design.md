# Practice Continuation Single-flight Design

## Context

The completed-practice page can create a new session from either the latest recommendation or the current report's weaknesses. Both actions rely on a React `starting` state to disable the visible button. Calls made before that state renders can create duplicate sessions. The recommendation path also resets `starting` in `finally`, reopening the button after successful creation but before navigation necessarily replaces the page.

## Approaches Considered

1. **Shared continuation runner plus transition lock (recommended):** synchronously serialize both creation commands within the mounted player, keep the selected action's UI state locked after success, and unlock only on failure.
2. **Separate runners:** closes double-click windows but permits recommendation and weakness creation to compete if invoked programmatically.
3. **UI-only disabling:** retains the pre-render event window and the post-success navigation gap.

## Design

Add a local `practice-continuation` module with:

- `createExclusivePracticeContinuationRunner()`, which admits one owner, returns `false` to overlapping callers, and releases after fulfillment or rejection.
- `startNextRecommendedPractice()`, a testable workflow that locks UI state, fetches the latest recommendation, creates one manual practice session, and invokes navigation success. It resets UI state only when the workflow fails.

`usePracticeCompletionActions` creates one stable continuation runner and passes it to both recommendation and weakness-review hooks. Each complete workflow runs inside the shared lock. The existing weakness-review workflow already keeps its success state locked during navigation.

## Boundaries

- No practice API, route contract, shared contract, dependency, database, or root configuration change.
- Recommendation selection, session payload, notification copy, and route target remain unchanged.
- The lock is scoped to one mounted practice player; server-side idempotency is outside this iteration.

## Verification

- TDD covers overlapping/conflicting command suppression, retry and rejection unlock.
- Workflow tests cover the existing payload, unavailable recommendation, success lock, and failure unlock.
- Focused tests, lint, typecheck, full Vitest, build, Prettier, and diff checks run before completion.

## Self-review

- The runner acquires ownership synchronously before React rendering.
- Both continuation paths share one lock and cannot create competing sessions.
- A successful creation stays visibly locked until route replacement; a failure remains retryable.
