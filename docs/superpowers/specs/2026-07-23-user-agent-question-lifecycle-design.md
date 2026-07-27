# User Agent Question Lifecycle Design

## Context

`useUserQuestion` stores only a resolver. Conversation changes set that resolver to null without rejecting the Promise, so the old Agent can remain suspended. Abort listeners are registered with `{ once: true }` but are not removed when the user answers; a later abort from an old question can clear a newer pending question.

## Approaches Considered

1. **Dedicated pending-answer manager (recommended):** own resolve, reject, signal listener, and visible pending state in one testable lifecycle object. Every terminal path performs the same cleanup.
2. **Add more refs inside the hook:** smaller diff, but lifecycle transitions remain scattered across effects, answer callbacks, and abort callbacks.
3. **Depend on runtime disposal:** does not cover optional/missing signals and does not remove answered-question listeners.

## Design

Add `createPendingAnswerManager(onQuestionChange)`, returning `ask`, `answer`, and `cancel`.

- `ask` cancels any previous pending question, records both Promise callbacks, publishes the new question, and attaches one abort listener.
- `answer` detaches the listener, clears pending state, and resolves exactly once.
- `cancel` detaches the listener, clears pending state, and rejects exactly once.
- An already-aborted signal rejects immediately.

`useUserQuestion` creates one stable manager. It appends the existing activity message before delegating to `ask`. The effect cleanup for each `conversationId` cancels an outstanding question on switch or unmount. `answerQuestion` delegates to the manager.

## Boundaries

- No Page Agent, API, schema, shared contract, dependency, or root configuration change.
- Visible confirmation copy and answer strings remain unchanged.
- Cancellation uses local `Error` reasons; they are consumed by the existing Agent execution lifecycle.

## Verification

- TDD covers answer cleanup, explicit cancellation, signal abort, and already-aborted signals.
- A regression test verifies aborting an answered question cannot clear a later question.
- Focused User Agent tests, lint, typecheck, full Vitest, build, and diff checks run before completion.

## Self-review

- Each Promise has exactly one owner and one cleanup path.
- Listener removal occurs before resolve/reject callbacks can trigger downstream work.
- The manager remains framework-independent and directly testable.
