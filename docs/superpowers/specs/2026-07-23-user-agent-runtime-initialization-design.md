# User Agent Runtime Initialization Design

## Context

`useUserAgentRuntime` starts `createUserAgentRuntime(...).then(...)` without a rejection handler. Provider, configuration, or runtime construction failures become unhandled Promise rejections. The drawer keeps `agentReady=false` but provides no actionable error. A previous initialization can also settle after its effect is disposed.

## Approaches Considered

1. **Lifecycle settlement helper (recommended):** centralize ready, disposed, and error branches in a pure async helper that never rejects. It is deterministic and directly testable.
2. **Inline `.catch` only:** fixes the unhandled rejection but leaves stale success/failure semantics split across chained callbacks.
3. **Global error boundary:** React error boundaries do not catch arbitrary rejected Promises and would be too broad for a local initialization failure.

## Design

Add generic `runRuntimeCreation`, accepting `create`, `isDisposed`, `onReady`, `onDispose`, `onError`, and `fallbackMessage` callbacks.

- Current success calls `onReady`.
- Disposed success calls `onDispose` so the created runtime releases resources.
- Current failure calls `onError` with the Error message or localized fallback.
- Disposed failure is ignored.
- Every branch resolves to a boolean and never produces an unhandled rejection.

`useUserAgentRuntime` owns `error: string | null`, clears it when a new initialization begins and during cleanup, and returns it to the widget. The drawer error precedence is conversation error, then runtime initialization error, then model configuration error.

## Boundaries

- No Page Agent library, API, schema, shared contract, dependency, or root configuration change.
- Existing runtime status, activity, steps, token, and disposal behavior remain unchanged.
- Retry occurs through the existing effect dependencies when configuration, conversation, page context, or question handler changes.

## Verification

- TDD covers current success, disposed success, current Error/non-Error failure, and disposed failure.
- Focused User Agent tests, lint, typecheck, full Vitest, build, and diff checks run before completion.

## Self-review

- All Promise branches are explicit and terminate without rejection.
- Stale lifecycle state is checked at settlement time.
- Error copy and UI precedence are deterministic.
