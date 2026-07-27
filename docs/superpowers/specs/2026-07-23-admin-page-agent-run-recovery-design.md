# Admin Page Agent Run Recovery Design

**Date:** 2026-07-23

**Status:** Approved

## Goal

Persist every Admin Page Agent execution as a tenant- and user-scoped run so an interrupted browser or service session can be detected, explained, and safely retried without claiming unsupported browser checkpoint resume.

## Boundaries

- Keep PageAgent execution in the browser because its tools depend on the live DOM.
- Persist run metadata, progress, token totals, trace IDs, and sanitized errors in PostgreSQL.
- Treat missing heartbeats as an interruption and create a new run for retries.
- Do not replay DOM actions or continue from a historical tool step.
- Do not add a queue, remote browser, new dependency, shared contract, or infrastructure change.

## Data Model

`AdminPageAgentRun` belongs to one tenant, user, and conversation. It stores:

- sanitized `prompt`
- `status`: `running`, `waiting_confirmation`, `succeeded`, `failed`, `cancelled`, or `interrupted`
- `currentStep`, `tokenCount`, and the original request `traceId`
- `errorCode` and sanitized `errorSummary`
- `startedAt`, `finishedAt`, `heartbeatAt`, and `updatedAt`
- optional `retryOfRunId`
- optional client-generated `clientRequestId` with a per-user uniqueness constraint

Deleting a conversation cascades to its runs. Deleting an earlier run only clears a retry link.

## State Transitions

```text
running <-> waiting_confirmation
running / waiting_confirmation -> succeeded / failed / cancelled
running / waiting_confirmation -> interrupted (server reconciliation only)
failed / cancelled / interrupted -> new running run linked by retryOfRunId
```

Terminal runs are immutable. Retrying never reopens or reuses a historical run.

## API

- `GET /admin/page-agent/conversations/:conversationId/runs/latest`
- `POST /admin/page-agent/conversations/:conversationId/runs`
- `PATCH /admin/page-agent/runs/:runId/heartbeat`
- `POST /admin/page-agent/runs/:runId/complete`

All operations scope records by `tenantId` and the authenticated actor ID. Reading the latest run reconciles active records whose heartbeat is older than 90 seconds to `interrupted`.

## Browser Integration

The Admin Console creates a run after the user message is durably stored and before calling `PageAgentCore.execute`. A local 15-second heartbeat persists the latest activity, waiting-for-confirmation state, and token count. Terminal results are explicitly completed.

When a conversation opens, the console loads its latest run. A live run owned by another page is polled. Once the server classifies it as interrupted, the drawer shows a recovery card with the sanitized prompt, last known step, and a safe-retry action. Retrying creates a new run linked to the interrupted run.

## Failure Semantics

- If user-message persistence fails, execution does not begin.
- If run creation fails, execution does not begin and the user sees a retryable error.
- If heartbeat or completion persistence fails, the run remains active and is later reconciled as interrupted.
- If the browser or service dies, no automatic DOM step replay occurs.
- Existing conversation messages and completed runs remain available after application restart as long as PostgreSQL is restored.

## Disaster Recovery

This feature provides application-level recovery metadata, not database backup by itself. Production recovery still requires PostgreSQL backups and tested restore procedures (for example, periodic base backups plus WAL/PITR). After database restore and service restart, stale active runs are reconciled to `interrupted`; operators and users can inspect the last step and start a new retry run.

## Verification

- Prisma format, validate, and client generation
- Product API service tests, typecheck, lint, and build
- Admin Console model/API/UI tests, typecheck, lint, and production build
- Manual browser smoke test for normal completion, stale-run recovery card, and safe retry
