# User Agent Run Recovery Design

## Problem

User Agent conversations and messages are durable, but an executing request has no durable state.
Closing the drawer correctly cancels local work, yet refreshes, browser crashes, and network loss
cannot distinguish a completed request from an interrupted one or offer a safe retry.

## Decision

Add a `UserPageAgentRun` record scoped to the tenant, current user, and user-agent conversation.
It mirrors the proven Admin Agent lifecycle: create with a client idempotency key, heartbeat while
running or awaiting confirmation, terminal completion, and 90-second stale reconciliation to
`interrupted`. The portal shows a collapsed bounded history and a safe retry card only for terminal
retryable runs.

## Lifecycle

1. Persist the user message, then create a run before calling PageAgent.
2. Write progress and confirmation waits through heartbeats.
3. Complete successful, failed, and stopped runs with immutable terminal states.
4. On drawer close, stop PageAgent and immediately complete the active run as `cancelled`; do not
   append an error message to the conversation.
5. On load, return the newest eight scoped runs after stale reconciliation. A stale run becomes
   `interrupted` and can be safely retried as a new linked run.

## Boundaries

- Do not reuse `AgentRun`: it is an interview-runtime record and lacks User Agent conversation,
  user ownership, heartbeat, and retry relations.
- Do not create practice sessions, submit answers, invoke evaluation, or add Agent write tools.
- Do not add shared contracts, queues, dependencies, or admin-wide User Agent metrics in this phase.
- Sanitize prompt, current step, and error summary before persistence; never return request ids,
  tenant ids, user ids, secrets, or credentials.

## Verification

- Product API tests cover ownership, idempotency, stale reconciliation, terminal state conflicts,
  list order/limit, and sanitization.
- Portal tests cover typed request construction, recovery state, safe retry, and close cancellation.
- Run schema validation/generation, Product API and User Portal lint/typecheck/full test/build,
  Prettier, and `git diff --check`.
