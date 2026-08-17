# User Theme Preferences Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the C-end user's six-theme selection and motion toggle per account while retaining local first-paint and offline behavior.

**Architecture:** Add a tenant-scoped `UserPreference` record and authenticated `GET/PUT /user-preferences` API. Keep `localStorage` as the synchronous first-paint cache, then reconcile it with the authenticated user's server record and serialize subsequent writes through a latest-value queue.

**Tech Stack:** Prisma/PostgreSQL, NestJS, Zod contracts, React 18/Next.js 15, Vitest/Jest, pnpm.

## Global Constraints

- Server record wins when one exists; otherwise upload the current valid local preference on first authenticated sync.
- Persist both `theme` and `motion`.
- Do not remove `offerpilot:theme-preferences:v1` or `offerpilot:theme-preferences:v2` compatibility.
- Do not block or roll back visual switching when the API is unavailable.
- Enforce `tenantId + userId` ownership and dedicated read/write scopes.
- Generate but do not apply the Prisma migration to any database.
- Preserve all unrelated dirty-worktree changes.
- Do not stage, commit, push, or create a PR in this session.

---

### Task 1: Shared preference contracts and permissions

**Files:**

- Create: `packages/contracts/src/schemas/user-preference.ts`
- Create: `packages/contracts/src/schemas/user-preference.test.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/contracts/src/schemas/context.ts`
- Modify: `packages/contracts/src/contracts.test.ts`
- Modify: `apps/product-api/src/common/context/request-context.ts`

**Interfaces:**

- Produces: `ThemeModeSchema`, `ThemePreferencesSchema`, `UserPreferenceSchema`, `UserPreferencePayloadSchema`, `UpsertUserPreferenceInputSchema` and their inferred types.
- Produces scopes: `preferences:read`, `preferences:write`.

- [ ] **Step 1: Write failing contract tests**

```ts
import {
  ThemePreferencesSchema,
  UpsertUserPreferenceInputSchema,
  UserPreferencePayloadSchema,
} from './user-preference';

it('accepts the six supported themes and motion', () => {
  expect(ThemePreferencesSchema.parse({ theme: 'constructivist', motion: false })).toEqual({
    theme: 'constructivist',
    motion: false,
  });
});

it('rejects unknown themes and client supplied identity fields', () => {
  expect(() => ThemePreferencesSchema.parse({ theme: 'unknown', motion: true })).toThrow();
  expect(() =>
    UpsertUserPreferenceInputSchema.parse({
      theme: 'daylight',
      motion: true,
      userId: 'other-user',
    }),
  ).toThrow();
});

it('supports an absent server preference', () => {
  expect(UserPreferencePayloadSchema.parse({ preferences: null })).toEqual({ preferences: null });
});
```

- [ ] **Step 2: Run the contract test and confirm RED**

Run: `pnpm --filter @interview-agent/contracts test -- user-preference.test.ts`

Expected: FAIL because `./user-preference` does not exist.

- [ ] **Step 3: Add the shared schemas**

```ts
import { z } from 'zod';

export const ThemeModeSchema = z.enum([
  'aurora',
  'terminal',
  'constructivist',
  'daylight',
  'glass',
  'playground',
]);

export const ThemePreferencesSchema = z
  .object({ theme: ThemeModeSchema, motion: z.boolean() })
  .strict();

export const UserPreferenceSchema = ThemePreferencesSchema.extend({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  updatedAt: z.string().datetime(),
});

export const UserPreferencePayloadSchema = z
  .object({ preferences: UserPreferenceSchema.nullable() })
  .strict();

export const UpsertUserPreferenceInputSchema = ThemePreferencesSchema;

export type ThemeMode = z.infer<typeof ThemeModeSchema>;
export type ThemePreferences = z.infer<typeof ThemePreferencesSchema>;
export type UserPreference = z.infer<typeof UserPreferenceSchema>;
export type UserPreferencePayload = z.infer<typeof UserPreferencePayloadSchema>;
export type UpsertUserPreferenceInput = z.infer<typeof UpsertUserPreferenceInputSchema>;
```

Export the file from `packages/contracts/src/index.ts`, add both scopes to `ActionSchema`, assert them in `contracts.test.ts`, and add them to the `user` scope array in `request-context.ts`.

- [ ] **Step 4: Run contract and context tests and confirm GREEN**

Run: `pnpm --filter @interview-agent/contracts test`

Expected: PASS with the new schemas and actions.

Run: `pnpm --filter @interview-agent/product-api test -- request-context policy.service`

Expected: PASS; existing policy ownership behavior remains unchanged.

---

### Task 2: Prisma user preference storage

**Files:**

- Modify: `apps/product-api/prisma/schema/identity.prisma`
- Create: `apps/product-api/prisma/schema/migrations/20260817093000_user_theme_preferences/migration.sql`

**Interfaces:**

- Produces Prisma delegate: `prisma.userPreference`.
- Produces unique owner key: `tenantId_userId`.

- [ ] **Step 1: Add Prisma model and relations**

```prisma
model UserPreference {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String
  theme     String
  motion    Boolean
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])
  user   User   @relation(fields: [tenantId, userId], references: [tenantId, id])

  @@unique([tenantId, userId])
  @@unique([tenantId, id])
}
```

Add `preferences UserPreference[]` to `Tenant` and `preference UserPreference?` to `User`.

- [ ] **Step 2: Add the migration SQL**

```sql
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "motion" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPreference_tenantId_userId_key"
ON "UserPreference"("tenantId", "userId");

CREATE UNIQUE INDEX "UserPreference_tenantId_id_key"
ON "UserPreference"("tenantId", "id");

ALTER TABLE "UserPreference"
ADD CONSTRAINT "UserPreference_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserPreference"
ADD CONSTRAINT "UserPreference_tenantId_userId_fkey"
FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 3: Validate schema without applying migration**

Run from `apps/product-api`: `pnpm exec prisma format --schema prisma/schema`

Expected: schema formats successfully.

Run from `apps/product-api`: `pnpm exec prisma validate --schema prisma/schema`

Expected: `The schema at prisma/schema is valid`.

Do not run `prisma migrate deploy`, `prisma migrate dev`, or any database write command.

---

### Task 3: Authenticated Product API module

**Files:**

- Create: `apps/product-api/src/modules/user-preferences/user-preferences.controller.ts`
- Create: `apps/product-api/src/modules/user-preferences/user-preferences.controller.spec.ts`
- Create: `apps/product-api/src/modules/user-preferences/user-preferences.service.ts`
- Create: `apps/product-api/src/modules/user-preferences/user-preferences.service.spec.ts`
- Create: `apps/product-api/src/modules/user-preferences/user-preferences.module.ts`
- Modify: `apps/product-api/src/app.module.ts`

**Interfaces:**

- Consumes: Task 1 contracts and Task 2 `userPreference` delegate.
- Produces: `GET /user-preferences`, `PUT /user-preferences`.

- [ ] **Step 1: Write failing controller and service tests**

Controller assertions:

```ts
await controller.get({ context } as never);
expect(service.get).toHaveBeenCalledWith(context);

await controller.upsert({ context } as never, { theme: 'glass', motion: false });
expect(service.upsert).toHaveBeenCalledWith(context, { theme: 'glass', motion: false });

expect(() => controller.upsert({ context } as never, { theme: 'unknown', motion: true })).toThrow();
```

Service assertions:

```ts
expect(await service.get(context)).toEqual({ preferences: null });
expect(prisma.userPreference.findUnique).toHaveBeenCalledWith({
  where: { tenantId_userId: { tenantId: 'tenant-1', userId: 'user-1' } },
});

await service.upsert(context, { theme: 'terminal', motion: false });
expect(transaction.userPreference.upsert).toHaveBeenCalledWith({
  where: { tenantId_userId: { tenantId: 'tenant-1', userId: 'user-1' } },
  create: {
    tenantId: 'tenant-1',
    userId: 'user-1',
    theme: 'terminal',
    motion: false,
  },
  update: { theme: 'terminal', motion: false },
});
expect(policy.assert).toHaveBeenCalledWith(context.actor, 'preferences:write', {
  tenantId: 'tenant-1',
  ownerId: 'user-1',
});
expect(audit.record).toHaveBeenCalledWith(
  context,
  expect.objectContaining({ action: 'preferences.upsert', resourceType: 'UserPreference' }),
  transaction,
);
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `pnpm --filter @interview-agent/product-api test -- user-preferences`

Expected: FAIL because the module files do not exist.

- [ ] **Step 3: Implement controller, service and module**

Controller shape:

```ts
@Roles('user')
@Controller('user-preferences')
export class UserPreferencesController {
  constructor(private readonly service: UserPreferencesService) {}

  @Get()
  get(@Req() request: ProductRequest) {
    return this.service.get(request.context);
  }

  @Put()
  upsert(@Req() request: ProductRequest, @Body() body: unknown) {
    return this.service.upsert(request.context, UpsertUserPreferenceInputSchema.parse(body));
  }
}
```

Service behavior:

```ts
async get(context: ProductRequestContext): Promise<UserPreferencePayload> {
  this.assertAccess(context, 'preferences:read');
  const preference = await this.prisma.userPreference.findUnique({
    where: { tenantId_userId: ownerKey(context) },
  });
  return UserPreferencePayloadSchema.parse({
    preferences: preference ? mapPreference(preference) : null,
  });
}

async upsert(
  context: ProductRequestContext,
  input: UpsertUserPreferenceInput,
): Promise<UserPreferencePayload> {
  this.assertAccess(context, 'preferences:write');
  return this.prisma.$transaction(async (transaction) => {
    const preference = await transaction.userPreference.upsert({
      where: { tenantId_userId: ownerKey(context) },
      create: { tenantId: context.tenantId, userId: context.actor.id, ...input },
      update: input,
    });
    await this.audit.record(
      context,
      {
        action: 'preferences.upsert',
        resourceType: 'UserPreference',
        resourceId: preference.id,
        metadata: { theme: preference.theme, motion: preference.motion },
      },
      transaction,
    );
    return UserPreferencePayloadSchema.parse({ preferences: mapPreference(preference) });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
```

Import `UserPreferencesModule` in `AppModule`.

- [ ] **Step 4: Run module tests and confirm GREEN**

Run: `pnpm --filter @interview-agent/product-api test -- user-preferences`

Expected: controller and service suites PASS.

---

### Task 4: User Portal API and deterministic sync queue

**Files:**

- Create: `apps/user-portal/src/lib/user-preferences-api.ts`
- Create: `apps/user-portal/src/lib/user-preferences-api.test.ts`
- Create: `apps/user-portal/src/components/theme/theme-preferences-sync.ts`
- Create: `apps/user-portal/src/components/theme/theme-preferences-sync.test.ts`
- Modify: `apps/user-portal/src/components/theme/theme-preferences.ts`
- Modify: `apps/user-portal/src/components/theme/theme-preferences.test.ts`

**Interfaces:**

- Produces: `getUserPreferences(): Promise<UserPreferencePayload>`.
- Produces: `saveUserPreferences(input): Promise<UserPreferencePayload>`.
- Produces: `createLatestThemePreferenceQueue(save)` with `enqueue` and `reset`.
- Produces: `synchronizeInitialPreferences(local, read, write)`.

- [ ] **Step 1: Write failing API and synchronization tests**

```ts
it('creates authenticated GET and PUT requests', () => {
  expect(createGetUserPreferencesRequest()).toMatchObject({ path: '/user-preferences' });
  expect(createSaveUserPreferencesRequest({ theme: 'glass', motion: false })).toMatchObject({
    path: '/user-preferences',
    init: { method: 'PUT', body: JSON.stringify({ theme: 'glass', motion: false }) },
  });
});

it('uses the server preference when present', async () => {
  const result = await synchronizeInitialPreferences(
    { theme: 'daylight', motion: true },
    async () => ({ preferences: serverPreference('aurora', false) }),
    vi.fn(),
  );
  expect(result).toEqual({ preferences: { theme: 'aurora', motion: false }, source: 'server' });
});

it('uploads the local preference when the server has no record', async () => {
  const write = vi.fn().mockResolvedValue({ preferences: serverPreference('glass', true) });
  const result = await synchronizeInitialPreferences(
    { theme: 'glass', motion: true },
    async () => ({ preferences: null }),
    write,
  );
  expect(write).toHaveBeenCalledWith({ theme: 'glass', motion: true });
  expect(result.preferences).toEqual({ theme: 'glass', motion: true });
});

it('serializes writes and persists only the latest pending value', async () => {
  const calls: ThemePreferences[] = [];
  const first = deferred<void>();
  const queue = createLatestThemePreferenceQueue(async (value) => {
    calls.push(value);
    if (calls.length === 1) await first.promise;
  });
  queue.enqueue({ theme: 'aurora', motion: true });
  queue.enqueue({ theme: 'terminal', motion: true });
  queue.enqueue({ theme: 'glass', motion: false });
  first.resolve();
  await queue.idle();
  expect(calls).toEqual([
    { theme: 'aurora', motion: true },
    { theme: 'glass', motion: false },
  ]);
});
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `pnpm --filter @interview-agent/user-portal test -- user-preferences-api.test.ts theme-preferences-sync.test.ts`

Expected: FAIL because the API and sync modules do not exist.

- [ ] **Step 3: Implement the API wrappers**

```ts
export function createGetUserPreferencesRequest() {
  return { path: '/user-preferences', schema: UserPreferencePayloadSchema } as const;
}

export function createSaveUserPreferencesRequest(input: ThemePreferences) {
  const validated = UpsertUserPreferenceInputSchema.parse(input);
  return {
    path: '/user-preferences',
    schema: UserPreferencePayloadSchema,
    init: { method: 'PUT', body: JSON.stringify(validated) },
  } as const;
}

export function getUserPreferences() {
  return apiRequest(createGetUserPreferencesRequest());
}

export function saveUserPreferences(input: ThemePreferences) {
  return apiRequest(createSaveUserPreferencesRequest(input));
}
```

- [ ] **Step 4: Implement initial reconciliation and latest-value queue**

`synchronizeInitialPreferences` returns validated `{ theme, motion }` only and never exposes server identity fields to the Provider. If `read` or initial `write` rejects, it returns the local preference with `source: 'local-fallback'` and enables later explicit changes to call the queue.

`createLatestThemePreferenceQueue` must:

- keep one request in flight;
- replace intermediate pending values with the latest value;
- stop after a failed request without looping;
- retry the newest value when `enqueue` is called again;
- ignore completions from an older generation after `reset()`;
- expose `idle()` only for deterministic tests.

- [ ] **Step 5: Reuse shared contract types in local parsing**

Replace the duplicated theme tuple/type in `theme-preferences.ts` with `ThemeModeSchema.options`, `ThemePreferencesSchema.safeParse`, and re-exported `ThemeMode`/`ThemePreferences` types. Preserve the legacy theme map and fallback behavior exactly.

- [ ] **Step 6: Run sync and existing local migration tests and confirm GREEN**

Run: `pnpm --filter @interview-agent/user-portal test -- user-preferences-api.test.ts theme-preferences-sync.test.ts theme-preferences.test.ts`

Expected: PASS.

---

### Task 5: Auth-aware ThemePreferencesProvider integration

**Files:**

- Modify: `apps/user-portal/src/components/WebProviders.tsx`
- Modify: `apps/user-portal/src/components/theme/ThemePreferencesProvider.tsx`
- Create: `apps/user-portal/src/components/theme/theme-provider-order.test.tsx`

**Interfaces:**

- Consumes: `useAuth`, Task 4 API and queue.
- Preserves: `useThemePreferences()` public interface.

- [ ] **Step 1: Write failing provider-order and state-transition tests**

Provider order source assertion:

```ts
const source = readFileSync(resolve('src/components/WebProviders.tsx'), 'utf8');
expect(source.indexOf('<AuthProvider')).toBeLessThan(source.indexOf('<ThemePreferencesProvider'));
```

Add pure synchronization assertions in Task 4 for authenticated server-first, null-first-upload, fallback, reset, and latest-value behavior; the React component should remain a thin orchestration layer over those tested units.

- [ ] **Step 2: Run the provider-order test and confirm RED**

Run: `pnpm --filter @interview-agent/user-portal test -- theme-provider-order.test.tsx`

Expected: FAIL because `ThemePreferencesProvider` currently wraps `AuthProvider`.

- [ ] **Step 3: Reorder providers**

```tsx
<AuthProvider client={authClient}>
  <ThemePreferencesProvider>
    <MotionSystemProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </MotionSystemProvider>
  </ThemePreferencesProvider>
</AuthProvider>
```

Keep `RouteChunkRecovery` outside the provider tree.

- [ ] **Step 4: Add authenticated synchronization to ThemePreferencesProvider**

The Provider must:

- initialize and persist local preference exactly as before;
- use `auth.status === 'authenticated'` and `auth.identity?.subject` as the sync identity key;
- increment a generation token and reset the queue on identity changes;
- call initial synchronization once per authenticated identity;
- apply server values without enqueuing a redundant write;
- enqueue only user-triggered `setTheme` and `setMotion` changes after initial reconciliation or fallback is ready;
- keep UI/local state when reads or writes fail;
- ignore results whose generation or identity key is stale.

Public setters remain:

```ts
setTheme: (theme: ThemeMode) => void;
setMotion: (motion: boolean) => void;
```

- [ ] **Step 5: Run User Portal theme tests and confirm GREEN**

Run: `pnpm --filter @interview-agent/user-portal test -- theme-provider-order.test.tsx theme-preferences-sync.test.ts ThemeMenu.test.tsx theme-preferences.test.ts`

Expected: PASS.

---

### Task 6: Cross-layer verification and browser acceptance

**Files:**

- Verify only; do not add generated reports to the repository.
- Preserve: `apps/user-portal/next-env.d.ts` with its existing `.next-dev/types/routes.d.ts` reference after build.

**Interfaces:**

- Verifies all previous tasks as one user flow.

- [ ] **Step 1: Run targeted tests**

Run:

```powershell
pnpm --filter @interview-agent/contracts test
pnpm --filter @interview-agent/product-api test -- user-preferences
pnpm --filter @interview-agent/user-portal test -- user-preferences theme-preferences ThemeMenu theme-provider-order
```

Expected: all targeted suites PASS.

- [ ] **Step 2: Run static gates**

Run:

```powershell
pnpm --filter @interview-agent/contracts typecheck
pnpm --filter @interview-agent/product-api typecheck
pnpm --filter @interview-agent/user-portal typecheck
$env:NODE_ENV='development'; pnpm --filter @interview-agent/user-portal lint
pnpm --filter @interview-agent/product-api lint
```

Expected: all commands exit 0.

- [ ] **Step 3: Run broader regression tests**

Run:

```powershell
pnpm --filter @interview-agent/product-api test
pnpm --filter @interview-agent/user-portal test
```

Expected: all suites PASS. If an existing timing test flakes under parallel load, rerun it alone and then rerun the full suite serially before reporting status.

- [ ] **Step 4: Run User Portal build and restore next-env boundary**

Record the current `apps/user-portal/next-env.d.ts`, run:

```powershell
pnpm --filter @interview-agent/user-portal build
```

Expected: build exits 0. If Next.js rewrites `.next-dev/types/routes.d.ts` to `.next/types/routes.d.ts`, restore only that generated line with `apply_patch`.

- [ ] **Step 5: Browser flow**

Validate:

1. Existing logged-in user with no server preference loads the local theme and causes one initial `PUT`.
2. Select another theme and toggle motion; DOM updates immediately.
3. Reload; server preference is loaded and remains selected.
4. Open another authenticated browser session; the same preference appears.
5. Simulate API failure or stop Product API; local switching still works without a framework overlay.
6. Confirm no relevant app console errors and no horizontal overflow.

- [ ] **Step 6: Final boundary checks**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; existing unrelated dirty files remain untouched; nothing is staged or committed; the Prisma migration remains unapplied.
