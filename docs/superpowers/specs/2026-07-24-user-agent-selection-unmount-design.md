# User Agent Selection Unmount Safety Design

## Problem

`useUserAgentConversations` keeps a latest-only runner for conversation detail selection, but it
does not invalidate that runner when the hook unmounts. A request that has already started can
therefore publish after its owner leaves the page.

## Decision

Register an unmount cleanup that invalidates the existing selection runner. Keep the runner's
monotonic ownership behavior and request API unchanged; cleanup simply makes every in-flight
selection stale.

## Boundaries

- Preserve selection, creation, error, and loading behavior while mounted.
- Do not add dependencies or change APIs, contracts, routes, schemas, configuration, or other apps.

## Verification

- RED/GREEN unit test exercises the cleanup against a deferred selection request.
- Run focused tests, User Portal lint, TypeScript, full Vitest, production build, Prettier, and
  `git diff --check`.
