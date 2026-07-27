# Job Submission Single-flight Design

## Problem

`useJobIntentForm` disables its buttons through React state, but two submit events can run before
the busy render lands. Both currently call `createJobIntent`, which can create duplicate job intents
and repeat the save/start handoff. A request that settles after unmount can also publish callbacks,
notifications, and state updates into an abandoned screen.

## Decision

Add a job-local synchronous submission runner. The first valid submission owns the physical request
and its action. Submissions received while it is active reuse the same promise and do not invoke
their handlers. Failure releases the lock so the user can retry. Cleanup advances a lifecycle
generation and suppresses success, error, and settlement handlers from any request still in flight.
Future runs use the new generation, so React Strict Mode's cleanup/setup probe does not make the
remounted hook unusable.

The hook creates one runner for its mounted lifetime, routes busy/action state through runner
handlers, and invalidates it from an effect cleanup. Schema validation remains outside the lock so an
invalid attempt never occupies it.

## Boundaries

- Do not change the workspace API, contracts, persistence, dependencies, or routing behavior.
- Preserve `submit` as an async form handler and preserve save versus save-and-start semantics.
- Keep the helper inside the profile feature; do not introduce a cross-feature abstraction.

## Verification

- RED/GREEN unit tests cover synchronous deduplication, retry after failure, and invalidation.
- Run focused profile/job tests, User Portal ESLint and TypeScript, full Vitest, production build,
  Prettier, and `git diff --check`.
