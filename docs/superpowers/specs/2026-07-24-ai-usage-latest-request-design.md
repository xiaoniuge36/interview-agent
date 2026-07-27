# AI Usage Latest-request Design

## Problem

AI usage summary aborts the prior period fetch on cleanup, but it trusts abort as the only ownership
signal. A transport can still resolve after cancellation, letting the prior period overwrite the
newly selected period.

## Decision

Add a settings-feature request manager that combines an AbortController with a monotonic sequence.
Only the current non-aborted run may publish ready or error state. Effect cleanup invalidates the
sequence and aborts the physical request; the next period creates a new lifecycle.

## Boundaries

- Preserve periods, loading copy, error copy, API calls, and summary presentation.
- Use the existing optional signal accepted by `getAiUsageSummary`.
- Do not change APIs, contracts, dependencies, routing, or root configuration.

## Verification

- RED/GREEN tests cover stale resolve after abort, current error, and cleanup invalidation.
- Run focused settings tests, User Portal lint, TypeScript, full Vitest, build, Prettier, and
  `git diff --check`.
