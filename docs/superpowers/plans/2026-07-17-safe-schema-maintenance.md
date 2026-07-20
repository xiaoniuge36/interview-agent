# Safe Schema Maintenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve database maintainability without changing Product API contracts or business behavior.

**Architecture:** Preserve existing status values and tenant-scoped data paths. Add only database type/index/FK hardening that is backward-compatible with current application writes. Defer timestamp conversion, soft deletion, and chunk reordering until their data migration policy is explicitly tested.

**Tech Stack:** NestJS, Prisma 6.19, PostgreSQL, PostgreSQL enum types, composite foreign keys, pnpm.

## Global Constraints

- Do not reset, reformat, or overwrite unrelated uncommitted work.
- Do not change HTTP contracts or service behavior.
- Preserve existing `UserModelCredential` values: `unverified`, `verified`, `disabled`, `failed`.
- Keep the pending AI observability migration deployable before the maintenance migration.
- Run schema validation, Prisma generation, targeted Product API tests, typecheck, and migration status after changes.

---

### Task 1: Add a typed model credential status

**Files:**

- Modify: `apps/product-api/prisma/schema/enums.prisma`
- Modify: `apps/product-api/prisma/schema/identity.prisma`
- Create: `apps/product-api/prisma/schema/migrations/20260717110000_model_credential_status_enum/migration.sql`

**Interfaces:**

- Consumes: Existing credential status values used by `packages/contracts` and Product API services.
- Produces: Prisma `CredentialStatus` enum with the same persisted values and a guarded SQL conversion.

- [x] **Step 1: Add the enum to Prisma schema**

Add `CredentialStatus` with exactly `unverified`, `verified`, `disabled`, and `failed`; change only `UserModelCredential.status` to use it with default `unverified`.

- [x] **Step 2: Add a guarded migration**

Before changing the column type, fail the migration if any unexpected status exists. Create the PostgreSQL enum and convert the existing column without changing values.

- [x] **Step 3: Validate the schema**

Run `pnpm db:validate` and `pnpm db:generate`; expected result is a valid Prisma schema and generated client.

### Task 2: Harden AI invocation tenant references

**Files:**

- Modify: `apps/product-api/prisma/schema/interview.prisma`
- Create: `apps/product-api/prisma/schema/migrations/20260717111000_harden_ai_invocation_references/migration.sql`

**Interfaces:**

- Consumes: The pending `AiInvocation` table from `20260717000000_ai_invocation_observability`.
- Produces: A tenant-aware credential FK and query indexes; nullable observability IDs remain nullable and do not alter runtime behavior.

- [x] **Step 1: Make credential relation tenant-aware**

Reference `UserModelCredential` with `(tenantId, credentialId) -> (tenantId, id)` and use `onDelete: Restrict`, because `tenantId` is required and credential history must remain valid.

- [x] **Step 2: Add maintenance indexes**

Add `(tenantId, credentialId, createdAt)` for the composite FK and credential history, plus `(createdAt)` for the existing retention cleanup and platform-wide time-range queries. Do not add unused session/practice indexes before those query paths exist.

- [x] **Step 3: Add the follow-up migration**

Drop only the pending migration's single-column credential FK, add the composite FK, and create the two evidence-backed indexes.

- [x] **Step 4: Validate generated Prisma relations**

Run `pnpm db:validate` and `pnpm db:generate`; expected result is a valid composite relation and generated client.

### Task 3: Verify without changing business behavior

**Files:**

- No application behavior files.

- [x] **Step 1: Run targeted Product API tests**

Run the model credential and AI usage test suites; expected result is zero failures.

- [ ] **Step 2: Run quality gates**

Run Product API typecheck and lint, then inspect `git diff --check`.

Result: Product API typecheck and build passed, and `git diff --check` passed. Product API lint remains blocked by 16 pre-existing errors in unrelated uncommitted admin, AI usage, model provider, and test files; those files were not changed for this maintenance task.

- [x] **Step 3: Check migration state**

Run `pnpm exec prisma migrate status --schema apps/product-api/prisma/schema`; report whether pending migrations remain, without applying them automatically.

Deferred from this plan: global `timestamptz` conversion, `KnowledgeChunk.chunkIndex`, email uniqueness changes, soft deletion, and audit IP/UA fields. Each requires separate data-retention or compatibility decisions.
