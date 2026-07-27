# Question Recommendation Latest-request Design

## Problem

Question catalog loading already owns latest-request state, but `useRecommendations` directly awaits
recommendations. A retry, Strict Mode lifecycle, or unmount can allow an older recommendation result
or error to publish after the current request.

## Decision

Add a question-feature recommendation request adapter. It wraps the existing generic latest request
runner and maps the API response to the screen's single recommendation (`items[0] ?? null`). The hook
owns one adapter, routes loading/error/success through its handlers, and invalidates it on cleanup.

## Boundaries

- Reuse `createLatestQuestionRequestRunner`; do not duplicate concurrency machinery.
- Preserve recommendation loading, error text, retry callback, and display behavior.
- Do not change APIs, contracts, dependencies, routing, or root configuration.

## Verification

- RED/GREEN tests cover latest-only publication, empty recommendation, and invalidation.
- Run focused question tests, User Portal lint, TypeScript, full Vitest, build, Prettier, and
  `git diff --check`.
