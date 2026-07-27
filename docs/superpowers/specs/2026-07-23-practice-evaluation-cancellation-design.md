# Practice Evaluation Cancellation Design

## Context

Starting evaluation B aborts evaluation A. A's `catch` currently calls `setActionError`, clearing B's busy/AI-operation state and showing a false failure notification. If the underlying request resolves despite abort, A also applies feedback and reports success after it has been superseded.

## Approaches Considered

1. **Current-controller settlement guard (recommended):** require both controller identity and a non-aborted signal before applying success or failure. This covers replacement and unmount cancellation.
2. **Check `signal.aborted` only:** handles normal abort, but identity also protects against a custom transport that replaces the active controller without synchronously updating signal state.
3. **Ignore only AbortError by name:** brittle across fetch implementations and does not prevent stale success.

## Design

Add pure `isCurrentPracticeEvaluation(activeController, candidateController)`. It returns true only when both references are identical and the candidate signal is not aborted.

`useEvaluatePracticeItem` checks this predicate after the stream Promise resolves and at the start of `catch`. A stale/aborted result returns silently: no feedback state, no success/error notification, and no busy reset. The currently active evaluation retains existing success and failure behavior. The existing `finally` identity check continues releasing only its own controller ref.

## Boundaries

- No evaluation API, stream protocol, schema, shared contract, dependency, or root configuration change.
- Starting a new evaluation continues aborting the prior controller.
- Current non-abort failures keep existing error copy and notification behavior.

## Verification

- TDD covers current live, current aborted, superseded live, and null-active cases.
- Existing practice player model, UI, report, and feedback tests remain green.
- Focused tests, lint, typecheck, full Vitest, build, and diff checks run before completion.

## Self-review

- Both success and failure settlements use the same predicate.
- Cancellation cannot clear or notify over a newer evaluation.
- Controller cleanup ownership remains unchanged.
