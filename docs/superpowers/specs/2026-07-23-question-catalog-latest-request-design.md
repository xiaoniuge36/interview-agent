# Question Catalog Latest Request Design

## Context

`useCatalog` starts a new `getQuestionCatalog` request whenever URL filters or pagination change, but every response updates the same state. A slower request for an older query can overwrite a newer result, show a stale error, or clear the newest loading state.

## Approaches Considered

1. **Latest-request coordinator (recommended):** sequence requests locally and allow only the newest success, error, and settlement callbacks. It needs no API change.
2. **AbortController:** the catalog API currently has no signal parameter; extending it would widen scope while still requiring stale settlement guards.
3. **Debounce all filters:** reduces requests but delays deliberate filter and pagination actions and cannot eliminate every reverse-order response.

## Design

Add a pure `createLatestQuestionRequestRunner()` beside the question picker. It exposes `run` and `invalidate`. Each `run` gets `load`, `onSuccess`, `onError`, and `onSettled`; only the latest sequence may invoke callbacks. `invalidate` is used by effect cleanup so unmounted or superseded loads cannot set state.

`useCatalog` owns one stable runner. Its `load` function starts visible loading/error reset synchronously, then delegates the API request. The effect calls `load` and invalidates its sequence on cleanup. A manual retry uses the same runner and therefore supersedes any prior request.

## Boundaries

- No catalog API, schema, shared contract, dependency, or root configuration change.
- Query parsing, selected questions, recommendations, and practice creation are unchanged.
- The previous catalog remains visible while a new query loads, matching current behavior.

## Verification

- TDD covers reverse-order success, stale rejection, latest rejection, and explicit invalidation.
- Existing question picker model/component tests remain green.
- Focused question tests, lint, typecheck, full Vitest, build, and diff checks run before completion.

## Self-review

- Success, error, and loading ownership all use the same sequence.
- Manual retry and effect-driven loads share one arbitration mechanism.
- Scope is limited to catalog request settlement.
