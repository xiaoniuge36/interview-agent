# Local Auth Single-flight Design

## Problem

The local access form disables submit from `auth.status`, but React does not commit that loading
render synchronously. Rapid valid submits can call login or registration twice. Duplicate
registration is particularly confusing because the first request may create the account while the
second reports a conflict.

## Decision

Create an auth-feature exclusive action runner and keep one instance for the mounted access form.
The first valid submit owns the authentication action. A synchronous duplicate returns `false`
without calling the second action. Settlement always releases the lock, including failure, so an
auth error can be retried. Auth state and errors remain owned by `@interview-agent/auth-client`.

## Boundaries

- Preserve existing validation, local auth payloads, and access modes.
- Do not change auth-client contracts, API behavior, dependencies, routing, or configuration.
- No additional component state is needed; the existing auth loading state remains the visible UI.

## Verification

- RED/GREEN unit tests cover duplicate suppression and retry after rejection.
- Run focused auth tests, User Portal ESLint and TypeScript, full Vitest, production build,
  Prettier, and `git diff --check`.
