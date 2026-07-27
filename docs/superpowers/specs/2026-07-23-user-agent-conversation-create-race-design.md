# User Agent Conversation Creation Race Design

## Context

The New Conversation button remains clickable while `createUserAgentConversation` is pending. Repeated clicks can create multiple empty server conversations. A history selection started before creation can also resolve after the new conversation and replace its payload.

## Approaches Considered

1. **Single-flight creation plus selection invalidation (recommended):** concurrent create calls share one promise, and creation invalidates every older selection token. This closes both races locally.
2. **UI-only disabled button:** reduces accidental double clicks but does not protect programmatic calls, bootstrap calls, or a stale selection response.
3. **Server idempotency key:** strongest distributed guarantee, but it changes API and persistence contracts and is disproportionate for this local interaction bug.

## Design

Add a generic, pure `createSingleFlightRunner<T>()`. While one action is pending, every call returns the same promise without invoking another action. Fulfillment and rejection both release the lock so a later create remains possible.

Extend the existing latest-selection coordinator from a bare function to `{ run, invalidate }`. `invalidate` increments the same sequence without starting a new load, making all outstanding selection callbacks stale.

`useCreateConversation` receives both helpers. On the first create call it invalidates selection, clears the prior active id and payload, clears the prior error, and enters loading. It runs the API through single-flight, then installs the created summary/conversation. Concurrent callers await the same result. The single owner clears loading in `finally`; failures use the existing error channel and return `null`.

## Boundaries

- No server API, schema, shared type, dependency, or root configuration change.
- Existing bootstrap and delete fallback behavior continue using `createConversation`.
- This is in-memory single-flight per mounted widget, not cross-tab idempotency.

## Verification

- TDD proves two concurrent single-flight calls invoke the action once and unlock after fulfillment.
- TDD proves rejection also unlocks.
- TDD proves explicit invalidation suppresses an outstanding selection's success and settlement callbacks.
- Run focused User Agent tests, lint, typecheck, full Vitest, build, and diff checks.

## Self-review

- No placeholders or shared-contract changes.
- The failure and retry semantics are explicit.
- The solution remains local to the User Agent conversation hooks.
