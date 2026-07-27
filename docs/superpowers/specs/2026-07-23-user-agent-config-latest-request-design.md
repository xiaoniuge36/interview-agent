# User Agent Config Latest-request Design

## Problem

`useUserAgentConfig` launches a request on mount without cleanup or request ownership. React Strict
Mode can run the effect twice, allowing the older response or error to overwrite the newer state.
Unmount also leaves the fetch running and permits abandoned completion handlers.

## Decision

Add a user-agent-local latest request manager. Every run aborts the previous controller and owns a
monotonic sequence. Only the current, non-aborted run may publish success, error, or settlement.
Effect cleanup invalidates the sequence and aborts the physical request. A later Strict Mode setup
can start a fresh generation normally.

The hook preserves existing visible behavior: reload sets loading, success updates config and clears
error, failure keeps the prior config and reports a message, and current settlement clears loading.

## Boundaries

- Reuse the existing optional `AbortSignal` accepted by `getUserPageAgentConfig`.
- Keep the helper inside the user-agent feature.
- Do not change API contracts, runtime creation, dependencies, routing, or configuration.

## Verification

- RED/GREEN tests cover supersession, current errors, and unmount invalidation.
- Run focused user-agent tests, User Portal ESLint and TypeScript, full Vitest, production build,
  Prettier, and `git diff --check`.
