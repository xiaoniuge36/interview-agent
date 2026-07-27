# Model Credential List Latest-request Design

## Context

The model connection panel refreshes credentials on mount and after credential test/remove actions. Every refresh writes list, error, and loading state directly. If an older request settles after a newer refresh, it can restore stale credentials, surface an obsolete error, or clear the latest loading indicator. In-flight callbacks are also not invalidated when the panel unmounts.

## Approaches Considered

1. **Latest-request runner (recommended):** assign each refresh a monotonic sequence, publish only the latest handlers, and invalidate on unmount.
2. **Exclusive refresh:** prevents overlap but makes a user/action refresh wait for an older potentially stale request instead of superseding it.
3. **AbortController only:** the API wrapper does not expose a signal and a response-order guard is still needed when cancellation races settlement.

## Design

Add `createLatestCredentialListRequest()`. Each run captures the newest sequence and owns `load`, `onSuccess`, `onError`, and `onSettled`. Stale runs resolve `false` without invoking any handlers. `invalidate()` advances the sequence so unmounted panels ignore all in-flight callbacks.

`useConnections` creates one stable request runner. `refresh()` sets loading and delegates every response effect through the runner. The mount effect invokes refresh and returns `invalidate` as cleanup. Its existing `Promise<boolean>` contract remains unchanged for credential action reconciliation.

## Boundaries

- No credential API, shared contract, dependency, database, or root configuration change.
- Existing loading/error copy, credentials array semantics, and refresh return contract remain unchanged.
- Requests are logically invalidated rather than physically cancelled.

## Verification

- TDD covers reverse-order success, stale error suppression, latest failure settlement, and cleanup invalidation.
- Existing credential action, card, readiness, and connection tests remain green.
- Focused tests, lint, typecheck, full Vitest, build, Prettier, and diff checks run before completion.

## Self-review

- Older refreshes cannot overwrite newer list/error/loading state.
- Credential action reconciliation still receives a truthful latest refresh boolean.
- Unmount prevents every pending response callback.
