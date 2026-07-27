# Admin Agent Run History Design

## Problem

Admin Agent runs are already persisted, protected by tenant and operator scope, and recoverable when
their heartbeats time out. The API exposes only the latest run for a conversation, so an operator
cannot review the recent execution sequence or see whether a recovery was retried from an earlier
run.

## Decision

Add a read-only, fixed-size history response to the existing conversation-runs route. It returns at
most eight newest runs for the current operator and conversation, after applying the existing stale
active-run reconciliation. The Admin Agent drawer displays the entries in a collapsed history
section with a localized status, last known step, and retry-origin indicator.

## Boundaries

- Reuse `AdminPageAgentRun`; do not add Prisma fields, migrations, queues, or new permissions.
- Scope every read by tenant, operator, and selected conversation.
- Reuse existing prompt/step/error sanitization and never expose client request IDs or identities.
- History is observational: it does not resume a run or grant new execute/retry capabilities.
- Keep the existing latest-run recovery card and its safe retry behavior unchanged.

## Verification

- Product API test verifies scope, descending order, fixed limit, and stale reconciliation on history reads.
- Admin Console API test verifies the encoded history path and array response schema.
- Drawer test verifies an interrupted/retried history entry is visible.
- Run Product API and Admin Console focused tests, lint, TypeScript, full test suites, builds,
  Prettier, and `git diff --check`.
