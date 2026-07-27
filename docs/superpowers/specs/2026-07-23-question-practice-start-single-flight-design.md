# Question Practice Start Single-flight Design

## Context

The question picker disables buttons after `busyKey` renders, but two clicks can arrive before that render. Recommendation and self-selected entry points can also be triggered close together. Each call currently creates a server session; their `finally` blocks compete over `busyKey`, and navigation can happen more than once.

## Approaches Considered

1. **Exclusive action runner (recommended):** acquire an in-memory lock synchronously before any state or API work. A concurrent call resolves as ignored and cannot mutate state.
2. **Button disabled state only:** useful feedback but not a sufficient concurrency guarantee because React state commits asynchronously.
3. **Server idempotency:** stronger across tabs, but requires API contract and persistence changes beyond this local interaction bug.

## Design

Add `createExclusivePracticeStartRunner()`. Its `run(action)` returns `false` immediately when another action is active. The owning action resolves to `true`; fulfillment and rejection both release the lock, and rejection propagates to its existing error handler.

`usePracticeStarter` creates one stable runner. It moves the whole transition—error reset, busy key, API request, notification, navigation, catch, and finally—inside the exclusive action. This guarantees ignored calls cannot change busy/error state or create sessions.

## Boundaries

- No practice API, schema, shared contract, dependency, or root configuration change.
- Existing notification copy and navigation target remain unchanged.
- The lock is per mounted question picker and intentionally does not deduplicate across tabs.

## Verification

- TDD proves concurrent calls invoke one action, settlement unlocks, and rejection unlocks while propagating.
- Existing question picker tests remain green.
- Focused tests, lint, typecheck, full Vitest, build, and diff checks run before completion.

## Self-review

- The lock is acquired before state mutation.
- Ignored calls cannot clear the active request's busy state.
- Failure and retry behavior are explicit.
