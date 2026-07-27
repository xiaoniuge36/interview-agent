# Profile Submission Single-flight Design

## Problem

`useProfileForm` relies on a rendered `busy` flag. Two submit events in the same render can both
issue `PUT /profile`, and a request can still publish state, callbacks, or notifications after the
profile screen unmounts.

## Decision

Promote the proven Job submission runner to a profile-feature submission runner and reuse it for
both forms. Keep the existing Job export as a thin compatibility alias so the completed Job tests
continue to protect its contract. Integrate one stable runner into `useProfileForm`; its first valid
submission owns the request, failures unlock retry, and effect cleanup invalidates stale completion
handlers while allowing a later Strict Mode lifecycle to run.

## Boundaries

- The abstraction remains private to `components/profile`.
- Preserve schema validation, API payloads, notifications, and `onChanged` behavior.
- Do not change shared contracts, dependencies, persistence, routing, root configuration, or CI.

## Verification

- RED/GREEN tests cover the promoted runner and retain the existing Job runner suite.
- Run focused profile tests, User Portal ESLint and TypeScript, full Vitest, production build,
  Prettier, and `git diff --check`.
