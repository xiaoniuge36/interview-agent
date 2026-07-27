# User Agent Create/Selection Order Design

## Context

Creation currently invalidates older selections, but its own completion is unconditional. If the user starts creation and then selects an existing conversation, the later selection gets a newer sequence; nevertheless the older creation response can still replace active state and clear the newer selection's loading flag.

## Approaches Considered

1. **Shared activation token (recommended):** creation receives a token from the same monotonic coordinator used by selection and checks it at each UI settlement point.
2. **Disable the history list during creation:** avoids the click race but removes useful navigation and does not protect programmatic selection.
3. **Abort creation when selection starts:** API cancellation is not available and the server may still create the conversation.

## Design

Extend the latest-selection coordinator:

- `invalidate()` increments the sequence and returns the issued token.
- `isCurrent(token)` checks whether a token remains the latest activation.

Creation captures the token before entering loading. On success, it always inserts the server-created summary so the new conversation is not orphaned from the UI. It only sets active id/payload when its token is current. A stale failure remains silent. The `finally` block clears loading only for a current token, leaving a newer selection responsible for its own settlement.

## Boundaries

- No API cancellation, schema, shared contract, dependency, or root configuration change.
- Single-flight behavior from the previous iteration remains unchanged.
- A stale successful create still resolves with its conversation object, even though it does not become active.

## Verification

- TDD proves issued tokens are current until a later `run` or `invalidate` advances the sequence.
- Existing reverse-order selection and explicit invalidation tests remain green.
- Focused User Agent tests, lint, typecheck, full Vitest, build, and diff checks run before completion.

## Self-review

- Both create-before-select and select-before-create races now use one ordering source.
- Loading ownership follows the latest token.
- Server-created data remains discoverable even when its activation is stale.
