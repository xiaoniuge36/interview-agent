# Reports Weakness Review Single-flight Design

## Context

The Reports page starts a weakness-review practice session through `WeaknessReviewAction`. Its domain workflow already keeps the loading state locked after success and unlocks after failure, but the component relies on React rendering to disable the button. Two calls can enter before that render and create duplicate sessions.

## Approaches Considered

1. **Domain-level exclusive runner (recommended):** add a synchronous runner beside the existing weakness workflow and create one stable instance in the Reports action.
2. **Component-local boolean ref:** closes the race but leaves concurrency semantics untested and hidden inside rendering code.
3. **Reuse a player-private continuation runner:** matches behavior but crosses an unrelated feature boundary.

## Design

Add `createExclusiveWeaknessReviewRunner()` to `weakness-review.ts`. The first caller owns the async action and resolves `true`; overlapping callers resolve `false` without invoking the action. Fulfillment and rejection release the runner.

`WeaknessReviewAction` creates one runner per mounted component and executes the complete existing `startWeaknessReview()` workflow inside it. The domain workflow continues to keep `starting` true after success while navigation takes over and resets it on failure.

## Boundaries

- No practice API, shared contract, route, dependency, database, or root configuration change.
- Existing weakness selection, notifications, button copy, and navigation remain unchanged.
- The runner is per mounted Reports action; server-side idempotency is outside this iteration.

## Verification

- TDD covers duplicate suppression, settlement retry, rejection propagation, and rejection unlock.
- Existing weakness workflow and Reports button tests remain green.
- Focused tests, lint, typecheck, full Vitest, build, Prettier, and diff checks run before completion.

## Self-review

- The runner acquires ownership before React can render the disabled state.
- Ignored callers produce no state, API, notification, or navigation effect.
- Existing success-transition and failure-retry semantics remain intact.
