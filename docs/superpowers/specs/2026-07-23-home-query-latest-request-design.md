# Home Query Latest-request Design

## Context

Home loads the question catalog, Agent recommendations, and training continuation concurrently. Catalog and recommendation retries write state directly, so an older request that settles later can overwrite a newer success, surface a stale error, or clear the latest loading state. Only continuation uses an ad-hoc `active` flag, while the other requests can still publish callbacks after unmount.

## Approaches Considered

1. **Independent latest-request runners (recommended):** give catalog, recommendations, and continuation separate monotonic sequences, apply callbacks only for the latest request in each lane, and invalidate every lane on unmount.
2. **One shared sequence for all Home queries:** an unrelated recommendation retry would invalidate catalog loading and lose valid independent results.
3. **AbortController only:** the API wrappers do not currently expose signals, and response-order guards are still required when cancellation loses a race.

## Design

Add `createLatestHomeQueryRequest()`. Each `run()` captures a new sequence and accepts `load`, `onSuccess`, `onError`, and `onSettled` handlers. Only the current sequence may invoke handlers; `invalidate()` advances the sequence so every in-flight callback becomes stale.

`useQuestionHubQueries` creates three stable runner instances. Catalog and recommendation reload callbacks delegate all response effects to their runner. Recommendation loading is settled only by its latest request. The initial continuation load uses its own runner. The effect cleanup invalidates all three lanes.

## Boundaries

- No API, contract, dependency, route, database, or root configuration change.
- Existing Home error copy, loading indicators, retry callbacks, and request payloads remain unchanged.
- Requests are logically invalidated rather than physically aborted; network cancellation is outside this iteration.

## Verification

- TDD covers reverse-order success, stale errors, latest failure settlement, and cleanup invalidation.
- Home recommendation, continuation, and rendering tests remain green.
- Focused tests, lint, typecheck, full Vitest, build, Prettier, and diff checks run before completion.

## Self-review

- Independent lanes cannot invalidate each other.
- Stale requests cannot mutate data, error, or loading state.
- Unmount invalidates all response callbacks without changing API signatures.
