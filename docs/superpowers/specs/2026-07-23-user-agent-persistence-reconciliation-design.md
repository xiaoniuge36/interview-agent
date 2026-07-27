# User Agent Persistence Reconciliation Design

## Context

`usePersistMessages` always calls `setActiveConversation(next)` after an append request succeeds. If conversation A's save finishes after the user has selected B, A replaces B's active payload. The summaries update is still desirable, but the active pane update is stale.

## Approaches Considered

1. **Functional state reconciliation (recommended):** compare the returned conversation id with the current active payload inside the React state setter. This observes current state at settlement time and needs no extra lifecycle state.
2. **Capture `activeId` in the callback:** simple, but the async caller retains the callback from request start, so the captured id can itself be stale.
3. **Abort old append requests:** requires extending the API client and still needs reconciliation for responses that cannot be cancelled in time.

## Design

Add a pure `reconcilePersistedConversation(current, persisted)` function. It returns `persisted` only when `current?.id === persisted.id`; otherwise it returns `current` unchanged. `usePersistMessages` uses it through the functional `setActiveConversation` form. Summary upsert remains unconditional so the history list reflects the saved message count and preview even when that conversation is no longer open.

## Boundaries

- No API, schema, shared contract, dependency, or root configuration change.
- The persistence request and error behavior do not change.
- Agent execution cancellation and late local transcript writes are separate concerns and remain outside this iteration.

## Verification

- TDD covers matching active conversation, different active conversation, and no active conversation.
- Focused User Agent tests, lint, typecheck, full Vitest, build, and diff checks run before completion.

## Self-review

- The settlement-time comparison avoids stale closure state.
- Summary and active-pane semantics are explicitly separated.
- Scope is one deterministic state reconciliation bug.
