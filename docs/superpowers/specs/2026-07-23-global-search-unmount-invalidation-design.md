# Global Search Unmount Invalidation Design

## Problem

Global search already ignores stale responses when the query changes, but cleanup only clears the
debounce timer. If the timer fired and the catalog request is still in flight when the component
unmounts, its completion still passes the last version check and attempts to publish state.

## Decision

Extract a tiny feature-local request lifecycle with `next`, `invalidate`, and `isCurrent`. Each
effect gets a new version; cleanup invalidates that version even after the timer has fired. The
existing query debounce, result ordering, and error copy remain unchanged.

## Boundaries

- Do not change the catalog API, debounce timing, search result model, dependencies, or routing.
- Keep the change local to the search feature.
- Preserve the existing public hook state and retry contract.

## Verification

- RED/GREEN tests cover latest ownership and invalidation.
- Run focused search tests, User Portal ESLint and TypeScript, full Vitest, production build,
  Prettier, and `git diff --check`.
