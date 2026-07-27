# Session Sign-out Single-flight Design

## Problem

The top bar and Settings account panel can both show sign-out controls. Each directly calls
`auth.signOut()`, so rapid cross-entry interaction can trigger duplicate local session clearing or
OIDC sign-out redirects before the auth loading render takes effect.

## Decision

Expose a User Portal auth-feature module-level sign-out action that wraps the existing exclusive
runner. Both UI entry points call this same instance, so only the first physical sign-out runs across
the whole page bundle. Auth-client still owns session mutation, redirect, and error state.

## Boundaries

- Reuse the existing access action runner; no change to auth-client or its public context.
- Scope the singleton strictly to user-portal sign-out actions.
- Preserve current button appearance, labels, and development-mode visibility rules.

## Verification

- RED/GREEN test proves duplicate calls across consumers execute only one action and unlock after it
  settles.
- Run focused shell/settings/auth tests, User Portal lint, TypeScript, full Vitest, build, Prettier,
  and `git diff --check`.
