# Archived Interview Retry Design

## Context

Opening `/interview?session=...` restores an archived or in-progress interview. The current hook records the session id before loading and never clears it on failure, so the same mounted page cannot retry that session. The toolbar then falls back to the generic “start interview” action, which can accidentally create a new session instead of recovering the requested one. During initial restore it also labels the disabled button as a fresh start.

## Approaches Considered

1. **Explicit retry nonce plus recovery-aware toolbar (recommended):** expose retry state from the restore hook, rerun the same effect when requested, and give the toolbar deterministic loading/retry/start labels.
2. **Clear `loadedId` only on failure:** makes an effect rerun possible only if another dependency happens to change and still provides no user action.
3. **Force a full page refresh:** works but discards local UI state and hides the recoverable lifecycle inside browser navigation.

## Design

Remove the `loadedId` suppression and let React effect dependencies own request execution. A `retryNonce` increments for an explicit retry. The hook tracks the id of the session whose load failed, so a new route is not mislabeled with an old failure. Active cleanup continues to ignore stale results, and React Strict Mode can safely start a fresh effect after cleanup.

Expose `archivedLoadFailed`, `reloadArchivedInterview`, and `restoredSessionId` from the controller. Add a pure `archivedInterviewControl()` model that returns the toolbar label, disabled state, and start/retry action:

- archived session without data: “正在恢复本轮…” and disabled;
- archived load failure: “重新加载本轮面试” and enabled;
- loaded session: existing restart action;
- no archived target: existing start action.

## Boundaries

- No interview API, shared contract, route format, dependency, database, or root configuration change.
- Existing snapshot/report reconciliation, stream reconnection, and error copy remain unchanged.
- Retry reruns the full snapshot load for the same URL session id.

## Verification

- TDD covers loading, failure retry, normal start, and restart toolbar states.
- Existing snapshot, interview state, toolbar-adjacent, and stream tests remain green.
- Focused tests, lint, typecheck, full Vitest, build, Prettier, and diff checks run before completion.

## Self-review

- A failed restore has a visible same-session recovery path.
- The generic start command cannot replace the requested archive while recovery is pending or failed.
- Stale async results remain ignored through effect cleanup.
