# Workspace Latest-request Design

## Context

Workspace data uses an in-flight Promise cache so repeated reloads share one network request. Each reload caller still attaches its own state writes, and the hook has no unmount invalidation. A shared Promise can therefore invoke multiple handlers, while an unmounted workspace can still receive ready/error state updates.

## Approaches Considered

1. **Latest handler runner around the shared loader (recommended):** keep request deduplication, give the newest reload sole state ownership, and invalidate callbacks on unmount.
2. **Abort the underlying request:** the workspace API does not expose an AbortSignal and deduplicated callers still need deterministic ownership.
3. **Remove Promise sharing:** creates duplicate workspace requests without solving stale or unmounted handlers.

## Design

Add `createLatestWorkspaceRequest()`. Each run captures a monotonic sequence and owns `load`, `onSuccess`, and `onError`. Only the newest sequence may publish handlers. `invalidate()` advances the sequence so in-flight results become inert.

`useWorkspaceData` keeps its existing `createWorkspaceLoader()` instance and creates one request runner. `reload()` sets loading, then delegates the shared Promise through the latest runner. The effect always returns `invalidate`, including when mount loading is disabled.

## Boundaries

- No workspace API, shared contract, dependency, route, database, or root configuration change.
- Existing in-flight Promise sharing, state shapes, profile update, and job insertion remain unchanged.
- Network work is logically invalidated rather than physically aborted.

## Verification

- Existing tests retain request sharing coverage.
- TDD adds latest-handler success/error and invalidate coverage.
- Focused tests, lint, typecheck, full Vitest, build, Prettier, and diff checks run before completion.

## Self-review

- One physical Promise may have multiple reload callers, but only the latest caller publishes state.
- Unmount prevents both ready and error callbacks.
- Later reloads remain possible after settlement.
