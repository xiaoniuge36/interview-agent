# Practice Completion Single-flight Design

## Context

The completion bar exposes AI report submission and self-study completion side by side. Both rely on `busy` after React state commits. Two clicks can enter before that render, sending incompatible completion commands for the same session and competing over final session/report state.

## Approaches Considered

1. **Shared completion action lock (recommended):** one synchronous exclusive runner wraps both mutations before either can set busy or call the API.
2. **Separate locks:** prevents duplicate calls of each kind but still permits AI and self-study completion to overlap.
3. **UI-only disabling:** communicates progress but does not close the pre-render event window.

## Design

Add `createExclusivePracticeCompletionRunner()`, returning a runner with established exclusive semantics: active action returns `true`, a concurrent action returns `false` without invoking its callback, and `finally` releases after fulfillment or rejection.

`usePracticeCompletionActions` owns one stable runner and passes it to AI report and self-study hooks. Each action places its existing validation, busy transition, API/reconciliation call, local-state cleanup, notifications, error handling, and final state update inside the runner. Recommendation and weakness-review actions are outside this mutation domain and remain unchanged.

## Boundaries

- No practice API, report reconciliation, schema, shared contract, dependency, or root configuration change.
- Existing completion copy, notifications, local cleanup, and result semantics remain unchanged.
- The lock covers only mutually exclusive session completion mutations.

## Verification

- TDD covers duplicate suppression, cross-action exclusion, success unlock, and rejection unlock.
- Existing completion bar, report reconciliation, and practice player tests remain green.
- Focused tests, lint, typecheck, full Vitest, build, and diff checks run before completion.

## Self-review

- Both incompatible mutations share one ownership domain.
- Ignored calls cannot set/clear busy or call external systems.
- Retry remains available after any settlement.
