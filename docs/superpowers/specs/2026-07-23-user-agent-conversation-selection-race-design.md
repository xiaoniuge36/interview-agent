# User Agent Conversation Selection Race Design

## Context

`useSelectConversation` currently applies every completed request. If a user selects conversation A and then B, A can resolve last and overwrite B's content while `activeId` still points to B. The same stale request can also clear B's loading state or show A's error.

## Approaches Considered

1. **Monotonic request sequence (recommended):** each selection gets a sequence number and may update state only while it remains the newest request. This is local, deterministic, and needs no API change.
2. **AbortController:** cancel the prior request when a new selection starts. The current conversation API does not expose a signal parameter, so this would expand the API contract for little additional value.
3. **Serialize selections:** block navigation until the current request finishes. This prevents races but makes a slow request trap the user on the wrong conversation.

## Design

Add a small pure selection runner beside the conversation hook. It owns a monotonically increasing sequence and exposes one `run` operation. A run receives `load`, `onSuccess`, `onError`, and `onSettled` callbacks. Only the latest run may invoke state callbacks; stale success and stale failure both settle silently.

`useSelectConversation` starts the visible transition immediately by setting the selected id, clearing the prior conversation payload, clearing any prior error, and setting loading. It then delegates the request to the runner. A latest success installs the loaded conversation; a latest failure writes the existing localized error; latest settlement clears loading.

The change is intentionally limited to rapid history selection. It does not modify server APIs, persistence, shared contracts, dependencies, or root configuration.

## Error and Loading Semantics

- A stale success cannot replace the newest conversation.
- A stale rejection cannot replace the newest error state.
- A stale settlement cannot clear the newest request's loading state.
- The previous conversation body is cleared as soon as a different id is selected, so the new title is never paired with old messages while loading.

## Verification

- TDD test two deferred selections completed in reverse order; only the newest callbacks may run.
- Test a stale rejection after a newer success; no stale error may surface.
- Test a latest rejection; error and settled callbacks both run once.
- Run user-agent focused tests, ESLint, TypeScript, full User Portal Vitest, Next.js build, and `git diff --check`.

## Self-review

- No placeholders or API ambiguity.
- Scope is one local race condition and one hook integration.
- The sequence runner and hook callback types are defined in the implementation plan.
