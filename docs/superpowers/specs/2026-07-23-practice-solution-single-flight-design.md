# Practice Solution Single-flight Design

## Context

The practice coach exposes reference-solution loading from both the active question and completed-review flows. The button is disabled after the player's `busy` state renders, but two calls can enter `revealSolution(itemId)` before that render and send duplicate API requests. Competing responses also clear the shared busy state independently.

## Approaches Considered

1. **Per-player exclusive runner (recommended):** acquire a synchronous lock around the complete solution request and its state effects. Ignore any second reveal while one is in flight.
2. **Share the pending Promise:** avoids duplicate calls but lets every caller observe ownership and encourages duplicate follow-up effects later.
3. **UI-only disabling:** retains the pre-render event window and does not protect programmatic callers.

## Design

Add `createExclusivePracticeSolutionRunner()`. The owner invokes one asynchronous action and resolves `true`; an overlapping call resolves `false` without invoking its action. Fulfillment and rejection both release the lock.

`useRevealPracticeSolution` creates one stable runner for the mounted hook and wraps the existing session check, busy state, API request, solution merge, and error handling. The public callback remains safe for current fire-and-forget callers.

## Boundaries

- No API, shared contract, local-storage schema, dependency, or root configuration change.
- Existing solution data, busy labels, error copy, and notification behavior remain unchanged.
- The runner serializes all reveal requests within one mounted practice player because the player exposes one shared busy state.

## Verification

- TDD covers duplicate/conflicting request suppression, retry after settlement, and rejection unlock.
- Existing practice player and coach tests remain green.
- Focused tests, lint, typecheck, full Vitest, build, Prettier, and diff checks run before completion.

## Self-review

- The lock is acquired synchronously before React can render a disabled button.
- Ignored calls have no busy, API, state, error, or notification effect.
- Every owner settlement releases the lock.
