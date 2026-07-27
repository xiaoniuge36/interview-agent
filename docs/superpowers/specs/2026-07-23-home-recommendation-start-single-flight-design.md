# Home Recommendation Start Single-flight Design

## Context

The Home recommendation card creates a practice session directly from a server recommendation. Its button becomes disabled only after `busyRecommendationId` renders, so rapid or programmatic duplicate calls can create multiple sessions. The current `finally` also clears the busy id after success, reopening the button while client-side navigation may still be replacing the page.

## Approaches Considered

1. **Local exclusive runner plus transition workflow (recommended):** acquire a synchronous per-hook lock, own all start effects, keep the busy id after success, and clear it only on failure.
2. **Reuse the Question Picker runner:** behavior is similar, but importing a picker-private module into Home would invert the feature boundary and would not test Home's success-state semantics.
3. **UI-only disabling:** leaves both the pre-render double-click window and post-success navigation gap open.

## Design

Add `home-recommendation-start.ts` with:

- `createExclusiveHomeRecommendationStartRunner()`, which admits one command owner and resolves `false` for overlapping callers.
- `startHomeRecommendation()`, which sets the current recommendation id, creates the manual practice session with the existing payload, and calls success without clearing the id. On failure it clears the id and reports the error.

`useRecommendationStarter` creates one stable runner and wraps the complete workflow. Existing notifications and `/practice?session=...` navigation remain in the hook callbacks.

## Boundaries

- No API, shared contract, route, dependency, database, or root configuration change.
- Recommendation payload and user-facing copy remain unchanged.
- The lock is scoped to one mounted Home recommendation hook; server-side idempotency is outside this iteration.

## Verification

- TDD covers duplicate suppression, retry/rejection unlock, payload preservation, success transition lock, and failure unlock.
- Existing recommendation rail rendering tests remain green.
- Focused tests, lint, typecheck, full Vitest, build, Prettier, and diff checks run before completion.

## Self-review

- Ownership is acquired synchronously before React can render the disabled button.
- An ignored call performs no state, API, notification, or navigation effect.
- Failure is retryable, while success cannot create another session before navigation.
