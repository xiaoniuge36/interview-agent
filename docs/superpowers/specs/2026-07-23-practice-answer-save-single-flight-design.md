# Practice Answer Save Single-flight Design

## Context

The answer step exposes save-only, save-and-next, and save-and-feedback paths. Before `busy` renders, two paths can call `save(itemId)` concurrently, duplicating the API request and notification. Both can return true and trigger competing navigation/step transitions.

## Approaches Considered

1. **Exclusive save runner (recommended):** acquire a synchronous per-hook lock around validation, state, API, cleanup, notification, and boolean result. Ignored saves return false.
2. **Share one pending Promise:** avoids duplicate API calls but every caller receives true and can still run its own follow-up navigation.
3. **UI-only disabling:** leaves the pre-render event window open.

## Design

Add `createExclusivePracticeSaveRunner()`. The owner executes an action returning `boolean` and receives that result. A concurrent caller resolves `false` without invoking the action. Fulfillment and rejection both release the lock.

`useSavePracticeAnswer` creates one stable runner and places its existing session/answer validation, busy state, API request, local draft cleanup, player state update, notifications, and error handling inside the action. Existing navigation helpers already advance only when `save` resolves true, so ignored calls cannot navigate.

## Boundaries

- No practice API, local-storage schema, shared contract, dependency, or root configuration change.
- Existing validation/error copy and saved-answer semantics remain unchanged.
- The lock covers save only; evaluation retains its replace-and-abort behavior.

## Verification

- TDD covers concurrent false result, owned true/false forwarding, success retry, and rejection unlock.
- Existing practice question/action/player tests remain green.
- Focused tests, lint, typecheck, full Vitest, build, and diff checks run before completion.

## Self-review

- Ignored saves cannot produce downstream navigation because they resolve false.
- Validation and all effects are owned by the lock holder.
- Retry remains possible after every settlement.
