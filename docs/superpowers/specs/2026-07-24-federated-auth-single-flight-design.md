# Federated Auth Single-flight Design

## Problem

The local sign-in form now synchronously rejects duplicate submits, but the federated sign-in button
still invokes `auth.signIn()` directly. Before React commits the auth loading transition, two fast
clicks can start two OIDC redirect attempts.

## Decision

Reuse the auth-feature exclusive runner in `FederatedAccessScreen`. Its first click owns the sign-in
operation; a same-render duplicate is ignored. Disable the button whenever auth status is loading so
the visible state matches the existing access transition. Auth-client continues to own redirects and
error state.

## Boundaries

- Do not change auth-client contracts, OIDC configuration, redirects, API behavior, or routing.
- Reuse the existing `access-action-single-flight` helper; do not add another mutation abstraction.
- Keep the UI change local to the federated access screen.

## Verification

- RED/GREEN component test verifies the loading state disables the federated action.
- Re-run the existing auth runner tests, then User Portal lint, typecheck, full Vitest, build,
  Prettier, and `git diff --check`.
