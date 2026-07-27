# Model Credential Action Single-flight Design

## Context

Each credential card exposes test, edit, and remove actions. Test and remove share a React `busy` state, but calls can enter before the disabled state renders. Duplicate tests can issue repeated provider calls, while a test and remove can compete and reconcile the list in an unpredictable order. Remove confirmation also currently happens before any synchronous ownership guard.

## Approaches Considered

1. **Shared per-card exclusive runner (recommended):** acquire one synchronous lock for both test and remove, including remove confirmation and all state/API/reconciliation effects.
2. **Separate runners:** prevents duplicates of each action but still lets test and remove race each other.
3. **UI-only disabling:** retains the pre-render event window and does not protect programmatic callers.

## Design

Add `createExclusiveCredentialActionRunner()` beside the existing credential action reconciliation model. The first action owns the runner and resolves `true`; overlapping test or remove calls resolve `false` without invoking their action. Settlement and rejection release the lock.

`useCredentialActions` creates one stable runner. Both public handlers await the runner around their complete workflows. Remove confirmation happens inside the owned action, so an ignored duplicate does not show a second prompt. Extract test/remove workflows into small functions to preserve the 50-line function limit.

## Boundaries

- No credential API, shared contract, dependency, database, or root configuration change.
- Existing notifications, confirmation copy, reconciliation outcomes, and retry behavior remain unchanged.
- Edit remains disabled by the shared busy state but is not an asynchronous credential command.

## Verification

- TDD covers duplicate/conflicting suppression, retry after settlement, and rejection unlock.
- Existing reconciliation and credential card rendering tests remain green.
- Focused tests, lint, typecheck, full Vitest, build, Prettier, and diff checks run before completion.

## Self-review

- Test and remove cannot overlap on one mounted card.
- Ignored remove calls do not display confirmation.
- Every owned action settlement releases the runner for a later retry.
