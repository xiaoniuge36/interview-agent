# Question Practice Start Transition Lock Design

## Context

The Question Picker already uses a synchronous exclusive runner, so overlapping selection and recommendation commands cannot create sessions while one request is in flight. However, the command clears `busyKey` in `finally`. After a successful response, the runner and UI both unlock before `router.push()` necessarily replaces the page, allowing another session to be created during the navigation gap.

## Approaches Considered

1. **Testable start workflow with success lock (recommended):** keep the existing runner, extract busy-state ownership and session creation, retain `busyKey` on success, and clear it only on failure.
2. **Keep busy clearing in the hook but delay it:** timing-based behavior is brittle and still races slow navigation.
3. **Never release the runner after success:** prevents the gap but complicates runner retry semantics and makes failure/success ownership less explicit.

## Design

Extend `practice-start-single-flight.ts` with `startQuestionPractice()` and the local `PracticeStartInput` type. The workflow sets `busyKey`, creates the existing manual practice session, and invokes success with its id. Success retains the key so all Question Picker start controls remain disabled while navigation takes over. Failure clears the key and passes the error to the hook.

`usePracticeStarter` retains its stable exclusive runner, but delegates the complete state/API workflow. Notification copy, failure copy, payload, and route target remain in their existing hook boundary.

## Boundaries

- No API, route, shared contract, dependency, database, or root configuration change.
- Existing runner semantics and current selection/recommendation mutual exclusion remain unchanged.
- The transition lock is scoped to one mounted Question Picker hook.

## Verification

- TDD covers payload preservation, success lock, session id forwarding, and failure unlock.
- Existing runner, picker model, recommendation banner, and latest-request tests remain green.
- Focused tests, lint, typecheck, full Vitest, build, Prettier, and diff checks run before completion.

## Self-review

- The runner still owns the pre-render concurrency window.
- The workflow now owns the post-response navigation window.
- Failed starts remain immediately retryable.
