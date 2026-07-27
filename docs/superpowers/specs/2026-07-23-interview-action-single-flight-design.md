# Interview Action Single-flight Design

## Context

Interview start and answer buttons become disabled only after reducer state commits. Two events can enter before that render: duplicate start creates multiple sessions; duplicate answer submits the same session version twice and can produce stream/version conflicts. Start and answer can also overlap through programmatic calls.

## Approaches Considered

1. **Shared hook-level exclusive runner (recommended):** one synchronous lock wraps both commands, ensuring only one interview mutation owns reducer, stream, and notification effects.
2. **Separate locks per action:** prevents duplicate start or answer but still permits a start and answer to overlap.
3. **UI disabled state only:** communicates busy state but is not a concurrency primitive.

## Design

Add `createExclusiveInterviewActionRunner()`, matching the established exclusive semantics: the owning async action returns `true`, a concurrent call returns `false` without invoking its action, and `finally` releases the lock on fulfillment or rejection.

`useInterviewActions` creates one stable runner and wraps both `executeStart` and `executeAnswer`. Existing command functions retain validation, error handling, reducer events, stream callbacks, notifications, and navigation. Since the runner acquires before invoking either function, ignored calls emit no state or external effects.

## Boundaries

- No interview API, schema, shared contract, dependency, or root configuration change.
- Existing command-level error handling and notifications remain unchanged.
- The lock is per mounted interview controller and does not replace server version checks.

## Verification

- TDD covers concurrent suppression, cross-action exclusion, success unlock, and rejection unlock.
- Existing interview state, presentation, snapshot, and component tests remain green.
- Focused tests, lint, typecheck, full Vitest, build, and diff checks run before completion.

## Self-review

- Start and answer share the same ownership domain.
- Ignored commands cannot dispatch busy or stream effects.
- Server-side optimistic concurrency remains the second line of defense.
