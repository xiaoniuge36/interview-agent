# User Agent Question Handoff Design

## Problem

The User Agent can navigate a user to the question picker after analysing training data, but the
destination does not state that it is a deliberate training handoff. The user can therefore miss
the recommended-training entry point or assume a session was created automatically.

## Decision

When the Agent navigates to the `questions` view, it appends the presentation-only query marker
`source=agent`. The question picker reads that marker and displays a short handoff notice above
the recommendation card. The notice says that the recommendation is ready to review and that a
practice session is created only after the user chooses the existing “采用并开始训练” action.

## Boundaries

- The query marker is UI context only and is never sent to or trusted by the API.
- Existing recommendation fetching, self-picking, single-flight creation, and user confirmation
  remain unchanged.
- All non-question Agent navigation targets retain their current paths.
- Do not change shared contracts, schemas, APIs, persistence, dependencies, root configuration,
  Admin Console, or backend modules.

## Verification

- Test that the Agent’s `questions` target contains the handoff marker and other targets do not.
- Test that the question recommendation banner renders the handoff and confirmation copy only
  when the page receives the marker.
- Run the focused User Portal tests, lint, TypeScript, production build, Prettier, and
  `git diff --check`.
