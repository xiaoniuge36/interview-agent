# User Agent Drawer Close Cancellation Design

## Problem

The User Agent drawer currently closes by hiding its UI only. If PageAgentCore is running, it can
continue working after the user has dismissed the assistant. PageAgentCore reports a cooperative
stop as `Task aborted`; the current conversation code turns that voluntary cancellation into a
persisted error message.

There is also a pre-run window: a submitted user message is persisted before `agent.execute()`
starts. Closing in that window cannot stop an idle agent, so the request could start after the
drawer is gone.

## Decision

Use the existing `stop()` capability whenever the drawer closes. Interpret a completed execution
whose runtime status is `stopped` as an in-memory activity message, rather than a persisted error.
Pair this with a monotonic submission lifecycle: closing invalidates the current submission before
requesting runtime stop, so a task that is still waiting to persist cannot start later. Genuine
unsuccessful results remain persisted errors.

## Boundaries

- Preserve the existing explicit Stop button and all normal success/error persistence.
- Do not change conversation APIs, persisted message roles, contracts, schemas, dependencies, or
  other applications.
- Closing is immediate; it requests cancellation before hiding the drawer and does not await an
  asynchronous runtime settle in the click handler.
- A user message whose persistence request was already sent is not retracted; cancellation only
  prevents later agent execution and suppresses stale UI/error publication.
- The local stopped activity may publish after cancellation only when its original conversation is
  still active; switching conversations continues to suppress every stale result.

## Verification

- RED/GREEN tests cover close ordering, submission invalidation, stopped-result presentation, and
  genuine failure mapping.
- Run focused tests, User Portal lint, TypeScript, full Vitest, production build, Prettier, and
  `git diff --check`.
