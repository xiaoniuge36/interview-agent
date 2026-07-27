# Archived Interview Report Retry Design

## Context

An archived snapshot can restore the `report_ready` session while report loading fails. The UI preserves the session and explains the partial result, but tells users to refresh the entire page. After the previous restore iteration, the controller already exposes a same-session snapshot retry; the report panel does not surface it.

## Approaches Considered

1. **Report-panel retry action (recommended):** pass the existing archive retry into the partial placeholder and reload the full snapshot in place.
2. **Toolbar retry mode:** competes with the toolbar's established “restart interview” meaning once a session exists.
3. **Keep page refresh guidance:** discards local state and is inconsistent with the new recoverable archive lifecycle.

## Design

Extend `ReportPanel` with optional `onRetry` and `retrying` props. When `sessionStatus` is `report_ready` and the report is absent, render a status block with “重新加载本轮复盘” if retry is available. While retrying, disable the button and show progress copy.

`InterviewWorkspace` passes the controller's existing `reloadArchivedInterview` only when the page has an archived session target. The retry reruns the same snapshot flow, preserving its session/report reconciliation and stale-response cleanup.

## Boundaries

- No API, contract, route, dependency, database, or root configuration change.
- Live interviews without an archived URL target retain existing placeholder behavior.
- Successful report rendering and normal interview start/restart behavior remain unchanged.

## Verification

- TDD updates the report placeholder test to require the explicit retry action and progress state.
- Existing Interview snapshot, restore control, sidebar, and state tests remain green.
- Focused tests, lint, typecheck, full Vitest, build, Prettier, and diff checks run before completion.

## Self-review

- Partial recovery no longer requires a full browser refresh.
- The action is placed beside the missing report, not in the session-start toolbar.
- Retry uses the already guarded same-session snapshot lifecycle.
