# Practice Session Latest Request Design

## Context

`usePracticeSessionLoader` launches a new restore request when the URL session id changes or the user retries. Every request can call `setState`; an older session's slower success or failure can overwrite the latest session. Effect cleanup does not invalidate work after unmount.

## Approaches Considered

1. **Latest-request coordinator (recommended):** assign a monotonic sequence to each restore and gate success/error callbacks. It preserves fast navigation without API changes.
2. **AbortController:** practice session/report/mastery APIs do not share one signal contract, and cancellation still needs stale-state guards.
3. **Serialize loads:** prevents overlap but makes a slow invalid link delay a newer valid session.

## Design

Add pure `createLatestPracticeSessionRequest()`, exposing `run` and `invalidate`. The runner invokes success/error only for its latest sequence and resolves stale runs silently.

`usePracticeSessionLoader` owns one stable runner. Its load callback constructs the fully restored `PlayerState`—session, drafts, index, report, mastery, and recovery message—inside `load`; `onSuccess` publishes it. `onError` preserves existing player data while ending loading and showing the current recovery error. A missing session id invalidates work and resets state. Effect cleanup invalidates the effect-owned request, while manual reload uses the same coordinator.

## Boundaries

- No practice API, report reconciliation, local-storage schema, shared contract, dependency, or root configuration change.
- Completed-session local state cleanup remains after the session response is known.
- Existing recovery copy and retry behavior remain unchanged.

## Verification

- TDD covers reverse-order success, stale error, latest error, and explicit invalidation.
- Existing local-state, report reconciliation, and player tests remain green.
- Focused tests, lint, typecheck, full Vitest, build, and diff checks run before completion.

## Self-review

- One sequence owns session, report/mastery extras, error, and loading outcome.
- Missing ids and unmount both invalidate pending work.
- Manual retry and URL-driven loading share the same arbitration.
