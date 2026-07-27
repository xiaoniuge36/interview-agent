# User Agent Execution Scope Design

## Context

An Agent execution captures conversation A's id but shares one React `setMessages` function across renders. After the user switches to B, A's late result or persistence error can append to B's visible transcript. The runtime is disposed on conversation change, but its promise can still settle.

## Approaches Considered

1. **Settlement-time conversation scope (recommended):** compare the current conversation ref with the source id before every visible transcript effect. This handles promises that settle after disposal without changing the runtime library.
2. **Disable all navigation while running:** prevents the race but traps users in a slow or stuck execution and does not protect programmatic changes.
3. **Rely only on runtime disposal:** disposal is necessary but cannot guarantee an already settling promise will never run continuation code.

## Design

Add a pure `isCurrentConversationEffect(currentId, sourceId)` predicate. A valid effect requires a non-null source id equal to the current id.

`useUserAgentConversation` keeps the latest conversation id in a ref. Each submit captures its source id and an `isCurrent` closure. After the initial user-message persistence, a stale submit does not start Agent execution. After Agent success, the result is appended visibly only while current; the result is still persisted to its source conversation so returning to that history retains the completed response. An execution rejection after switching is treated as cancellation and is neither displayed nor persisted. Persistence failures append an error only while their source remains current.

## Boundaries

- No Page Agent, API, schema, shared contract, dependency, or root configuration change.
- The original user message is still persisted before execution starts.
- Pending confirmation lifecycle is a separate concern and remains outside this iteration.

## Verification

- TDD covers matching ids, mismatched ids, and null source/current ids.
- Focused User Agent tests, lint, typecheck, full Vitest, build, and diff checks run before completion.

## Self-review

- Visible effects and persistence effects have explicit, different stale semantics.
- The predicate reads current state through a ref rather than a captured render value.
- Scope is limited to transcript and persistence side effects of an execution.
