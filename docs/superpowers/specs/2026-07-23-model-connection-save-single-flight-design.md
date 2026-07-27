# Model Connection Save Single-flight Design

## Context

The model connection editor disables submit after React renders `busy`, but rapid form submissions can enter twice before that render and create or update the same credential multiple times. The cancel button also remains enabled during save, allowing the editor to unmount while the request later invokes success/error state effects.

## Approaches Considered

1. **Per-editor exclusive runner plus busy cancellation lock (recommended):** synchronously own validation and the complete save workflow, ignore overlapping submissions, and disable cancel while owned.
2. **Share one pending Promise:** avoids duplicate API calls but lets every submit caller behave as an owner and does not address cancellation.
3. **UI-only disabling:** retains the pre-render submit window.

## Design

Add `createExclusiveModelConnectionSaveRunner()`. One caller owns the asynchronous action and resolves `true`; overlapping callers resolve `false` without invoking validation, API, notification, or parent callbacks. Fulfillment and rejection release the runner.

`useConnectionEditor` creates one stable runner. Every submit still calls `preventDefault()` and then executes validation, busy state, create/update request, parent `onSaved`, notifications, error state, and settlement inside the runner. `EditorActions` disables cancel whenever save is busy, matching the submit lock.

## Boundaries

- No credential API, shared contract, dependency, database, or root configuration change.
- Existing validation, payload construction, notification copy, and saved callback remain unchanged.
- The lock is per mounted editor; server-side idempotency is outside this iteration.

## Verification

- TDD covers duplicate suppression, retry after settlement, and rejection unlock.
- Existing connection form, credential card, readiness, and credential action tests remain green.
- Focused tests, lint, typecheck, full Vitest, build, Prettier, and diff checks run before completion.

## Self-review

- Validation and every save effect have one owner.
- Ignored submits cannot create duplicate credentials.
- Users cannot cancel the editor while a save request owns it.
