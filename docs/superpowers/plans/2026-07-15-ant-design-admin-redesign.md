# Ant Design 高密度后台改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `apps/admin-console` 改造成实际使用 Ant Design 的高密度传统管理后台，同时保持现有 Hash 导航、认证、API、审核与发布行为不变。

**Architecture:** 以 `ConfigProvider` 包裹既有 `AuthProvider`，使用 `Layout/Sider/Header/Content` 取代手写后台壳。业务页继续从 `useAdminDashboard` 读取数据，统一通过受控 `Table`、`Pagination`、`Drawer`、`Form` 和 `SectionState` 展示；Ant Design `Table` 一律关闭内置分页。

**Tech Stack:** Next.js 15、React 18、TypeScript、Ant Design 6.5.1、`@ant-design/icons` 6.3.2、Vitest、pnpm。

---

## 执行约束

- 当前工作树含有用户的未提交改动。只修改 `apps/admin-console`、本设计文件与本计划文件；不暂存、提交、重置或覆盖其他应用、API、数据库、共享契约与根配置。
- 用户已授权新增 `antd`、`@ant-design/icons` 及对应 lockfile 改动。
- 保持 `#overview/#imports/#questions/#content/#models/#runtime/#audit`、`LEGACY_HASHES`、`useAdminDashboard` 并行加载、`SectionState`、导入/审核/发布 API 语义不变。
- 页面测试不新增额外的 React 渲染测试依赖；对可抽出的业务规则做 Vitest 单测，其余通过 TypeScript、构建和浏览器验证覆盖。

## 文件结构与职责

| 文件 | 职责 |
| --- | --- |
| `apps/admin-console/package.json` | 声明 Ant Design 与图标库。 |
| `pnpm-lock.yaml` | 锁定新增依赖树。 |
| `src/components/AdminProviders.tsx` | 将中文 locale 与高密度 AntD theme 接入认证 Provider。 |
| `src/components/admin-theme.ts`（新建） | 唯一维护 Admin 端 `ConfigProvider` token。 |
| `src/components/admin-navigation.ts` | 保持 Hash 视图并导出 `Menu` 所需导航分组。 |
| `src/components/AdminShell.tsx`、`src/components/admin-shell/*` | 真实 `Layout/Sider/Header/Menu/Breadcrumb` 壳。 |
| `src/components/dashboard/AdminTableControls.tsx` | 受控 AntD 搜索、筛选和分页。 |
| `src/components/dashboard/AdminDrawer.tsx` | 对既有 props 的 AntD `Drawer` 适配器。 |
| `src/components/dashboard/SectionState.tsx` | `Spin/Empty/Result/Alert` 状态映射。 |
| `src/components/dashboard/*` | 各模块的高密度 `Card/Table/Form/Drawer` 页面。 |
| `src/components/auth/AdminAccess.tsx` | 管理员本地 / OIDC 访问页的 AntD 表单与状态。 |
| `src/app/styles/antd-admin.css`（新建） | 仅保留壳、密度、响应式和少量业务布局 CSS。 |
| `src/app/globals.css` | 先加载 AntD reset，再加载后台覆盖样式。 |

### Task 1: 安装依赖并接入主题 Provider

**Files:**

- Modify: `apps/admin-console/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/admin-console/src/components/admin-theme.ts`
- Modify: `apps/admin-console/src/components/AdminProviders.tsx`
- Modify: `apps/admin-console/src/app/globals.css`

- [ ] **Step 1: 记录当前后台包的基线依赖与类型检查结果**

Run:

```powershell
pnpm --filter @interview-agent/admin-console typecheck
```

Expected: exits `0` before the dependency change, or records the exact pre-existing failure without modifying unrelated files.

- [ ] **Step 2: 安装经确认的 React 18 兼容 Ant Design 依赖**

Run:

```powershell
pnpm --filter @interview-agent/admin-console add antd@^6.5.1 @ant-design/icons@^6.3.2
```

Expected: only `apps/admin-console/package.json` and `pnpm-lock.yaml` change outside already tracked admin work.

- [ ] **Step 3: 新建唯一的高密度主题 token 源**

Create `apps/admin-console/src/components/admin-theme.ts`:

```ts
import type { ThemeConfig } from 'antd';

export const adminAntdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1677ff',
    colorInfo: '#1677ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    borderRadius: 6,
    controlHeight: 32,
    fontSize: 13,
  },
  components: {
    Layout: { siderBg: '#001529', headerBg: '#ffffff', bodyBg: '#f5f5f5' },
    Menu: { darkItemBg: '#001529', darkItemSelectedBg: '#1677ff', itemHeight: 40 },
    Table: { cellPaddingBlock: 10, cellPaddingInline: 12, headerBg: '#fafafa' },
    Card: { bodyPadding: 16, headerHeight: 46 },
  },
};
```

- [ ] **Step 4: 将 `ConfigProvider` 与中文 locale 放在认证 Provider 外层**

Replace the body of `AdminProviders` with:

```tsx
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { adminAntdTheme } from './admin-theme';

export function AdminProviders({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider locale={zhCN} theme={adminAntdTheme} componentSize="middle">
      <AuthProvider client={authClient}>{children}</AuthProvider>
    </ConfigProvider>
  );
}
```

- [ ] **Step 5: 在全局样式最前端加载 AntD reset，并保留现有样式导入**

Ensure `apps/admin-console/src/app/globals.css` starts with:

```css
@import 'antd/dist/reset.css';
@import './styles/tokens.css';
```

Do not remove an existing stylesheet until the component no longer renders its selectors.

- [ ] **Step 6: 验证 Provider 与依赖解析**

Run:

```powershell
pnpm --filter @interview-agent/admin-console typecheck
```

Expected: exits `0` and reports no missing `antd` or icon module.

### Task 2: 将 Hash 导航和后台壳迁移到 `Layout/Menu/Breadcrumb`

**Files:**

- Modify: `apps/admin-console/src/components/admin-navigation.ts`
- Test: `apps/admin-console/src/components/admin-navigation.test.ts`
- Modify: `apps/admin-console/src/components/AdminShell.tsx`
- Modify: `apps/admin-console/src/components/admin-shell/AdminSidebar.tsx`
- Modify: `apps/admin-console/src/components/admin-shell/AdminHeader.tsx`

- [ ] **Step 1: 为导航分组写失败测试，确认菜单不会遗漏任何 Hash 视图**

Append to `admin-navigation.test.ts`:

```ts
import { ADMIN_NAV_GROUPS, ADMIN_VIEW_IDS } from './admin-navigation';

it('groups every hash view once for the management menu', () => {
  expect(ADMIN_NAV_GROUPS.flatMap((group) => group.items.map((item) => item.id))).toEqual(
    expect.arrayContaining([...ADMIN_VIEW_IDS]),
  );
  expect(new Set(ADMIN_NAV_GROUPS.flatMap((group) => group.items.map((item) => item.id))).size).toBe(
    ADMIN_VIEW_IDS.length,
  );
});
```

- [ ] **Step 2: 运行测试确认新导出尚不存在**

Run:

```powershell
pnpm --filter @interview-agent/admin-console test -- admin-navigation.test.ts
```

Expected: FAIL because `ADMIN_NAV_GROUPS` is not exported.

- [ ] **Step 3: 在导航模块导出稳定的菜单分组，不改现有 Hash 函数**

Add after `ADMIN_NAV_ITEMS` in `admin-navigation.ts`:

```ts
export type AdminNavigationGroup = {
  key: 'overview' | 'content' | 'observability';
  label: string;
  items: readonly AdminNavigationItem[];
};

export const ADMIN_NAV_GROUPS: readonly AdminNavigationGroup[] = [
  { key: 'overview', label: '运营总览', items: ADMIN_NAV_ITEMS.filter((item) => item.id === 'overview') },
  { key: 'content', label: '内容治理', items: ADMIN_NAV_ITEMS.filter((item) => ['imports', 'questions', 'content'].includes(item.id)) },
  { key: 'observability', label: '系统观测', items: ADMIN_NAV_ITEMS.filter((item) => ['models', 'runtime', 'audit'].includes(item.id)) },
];
```

- [ ] **Step 4: 用 AntD `Layout` 替换壳容器，但继续渲染既有 children**

Implement the core of `AdminShell.tsx` as:

```tsx
import { Layout } from 'antd';

const { Content, Sider } = Layout;

return (
  <Layout className="admin-layout-shell" hasSider>
    <Sider breakpoint="lg" collapsed={sidebar.collapsed} collapsible collapsedWidth={64} trigger={null}>
      <AdminSidebar {...sidebarProps} />
    </Sider>
    <Layout>
      <AdminHeader {...headerProps} />
      <Content className="admin-layout-content" id="main-content" tabIndex={-1}>
        {props.children}
      </Content>
    </Layout>
  </Layout>
);
```

Keep the skip link, `localStorage` key and existing collapse callback unchanged.

- [ ] **Step 5: 用 `Menu` 及实际图标实现侧栏，不在组件内重算分组**

Build `MenuProps['items']` from `ADMIN_NAV_GROUPS`; each leaf uses the existing view id as `key` and calls `onViewChange(key as AdminView)`:

```tsx
<Menu
  theme="dark"
  mode="inline"
  selectedKeys={[props.activeView]}
  items={menuItems}
  onClick={({ key }) => props.onViewChange(key as AdminView)}
/>
```

Map the seven known icon names to `AppstoreOutlined`, `CloudUploadOutlined`, `DatabaseOutlined`, `FileSearchOutlined`, `HddOutlined`, `RadarChartOutlined`, and `AuditOutlined`. Use `MenuFoldOutlined` / `MenuUnfoldOutlined` for the persistent collapse button.

- [ ] **Step 6: 使用 `Header`、`Breadcrumb`、`Input.Search`、`Avatar` 与 AntD Buttons 重写顶栏**

Keep `findNavigationMatches`, `formatUpdatedAt`, refresh and sign-out behavior. The search results remain controlled by the existing `query` state; replace raw elements with:

```tsx
<Input.Search allowClear placeholder="搜索功能 / 模块…" value={query} onChange={(event) => setQuery(event.target.value)} />
<Breadcrumb items={[{ title: '治理控制台' }, { title: activeItem.label }]} />
<Avatar size="small">{initial(displayName)}</Avatar>
<Button icon={<ReloadOutlined />} loading={isRefreshing} onClick={onRefresh}>刷新</Button>
```

- [ ] **Step 7: 运行导航测试确认 Hash 行为与菜单分组均通过**

Run:

```powershell
pnpm --filter @interview-agent/admin-console test -- admin-navigation.test.ts
```

Expected: PASS with the existing deep-link/legacy-hash assertions plus the new grouping assertion.

### Task 3: 将共享抽屉、表格控件和状态提示迁移到 AntD

**Files:**

- Modify: `apps/admin-console/src/components/dashboard/AdminTableControls.tsx`
- Modify: `apps/admin-console/src/components/dashboard/AdminDrawer.tsx`
- Test: `apps/admin-console/src/components/dashboard/AdminDrawer.test.ts`
- Modify: `apps/admin-console/src/components/dashboard/SectionState.tsx`

- [ ] **Step 1: 保持抽屉 Escape 规则的回归测试**

The existing test must remain equivalent to:

```ts
expect(isDrawerCloseKey('Escape')).toBe(true);
expect(isDrawerCloseKey('Enter')).toBe(false);
```

Run:

```powershell
pnpm --filter @interview-agent/admin-console test -- AdminDrawer.test.ts
```

Expected: PASS before replacing the implementation.

- [ ] **Step 2: 用 `Drawer` 适配既有 `AdminDrawerProps`**

Preserve `isDrawerCloseKey` for the test, and replace custom portal markup with:

```tsx
import { Drawer } from 'antd';

export function AdminDrawer({ children, description, onClose, open, title }: AdminDrawerProps) {
  return (
    <Drawer
      destroyOnHidden
      keyboard={isDrawerCloseKey('Escape')}
      onClose={onClose}
      open={open}
      size="large"
      title={<><div>{title}</div>{description ? <Typography.Text type="secondary">{description}</Typography.Text> : null}</>}
    >
      {children}
    </Drawer>
  );
}
```

Import `Typography` with `Drawer`. Do not set a custom container; this keeps mask, focus and Escape behavior managed by AntD.

- [ ] **Step 3: 将筛选栏改为受控 AntD 控件**

`AdminTableToolbar` must use `Input.Search` and `Select`, calling the same `onQueryChange`/`filter.onChange` callbacks:

```tsx
<Input.Search
  allowClear
  placeholder={props.searchLabel}
  value={props.query}
  onChange={(event) => props.onQueryChange(event.target.value)}
/>
<Select
  aria-label={filter.label}
  options={filter.options}
  value={filter.value}
  onChange={filter.onChange}
/>
```

Every consuming `Table` must use `pagination={false}`.

- [ ] **Step 4: 使用真实总条数实现唯一的受控 AntD 分页**

Use the real item count with a page size derived from current pagination:

```tsx
<Pagination
  current={props.page}
  pageSize={Math.max(1, Math.ceil(props.total / props.pageCount))}
  showSizeChanger={false}
  showTotal={(total) => `共 ${total} 条`}
  total={props.total}
  onChange={props.onChange}
/>
```

This makes AntD expose exactly `pageCount` pages while preserving the source total. Guard `pageCount === 0` by returning `null` before rendering.

- [ ] **Step 5: 映射 `SectionState` 到 AntD 反馈组件**

Use the following branches while preserving existing text and request IDs:

```tsx
if (state.status === 'loading') return <Spin tip={loadingMessage ?? '正在加载数据'} />;
if (state.status === 'forbidden') return <Result status="403" title={title} subTitle={description} />;
return <Alert type="error" showIcon message="数据加载失败" description={<>{error.message}{error.requestId ? <Typography.Text code>requestId: {error.requestId}</Typography.Text> : null}</>} />;
```

Use `<Empty description="暂无数据" />` only in pages that receive a ready but empty data array; do not turn `forbidden` into an empty state.

- [ ] **Step 6: 验证共享逻辑没有回归**

Run:

```powershell
pnpm --filter @interview-agent/admin-console test -- AdminDrawer.test.ts admin-records.test.ts review-workbench-state.test.ts
pnpm --filter @interview-agent/admin-console typecheck
```

Expected: all specified Vitest files and typecheck PASS.

### Task 4: 重建高密度总览与导入流水线

**Files:**

- Modify: `apps/admin-console/src/components/dashboard/AdminOverview.tsx`
- Modify: `apps/admin-console/src/components/dashboard/DashboardStats.tsx`
- Modify: `apps/admin-console/src/components/dashboard/ImportPipeline.tsx`

- [ ] **Step 1: 保留总览数据计算作为回归基线**

Run:

```powershell
pnpm --filter @interview-agent/admin-console test -- useAdminDashboard.test.ts
```

Expected: PASS; this proves dashboard section loading and partial-failure behavior before visual replacement.

- [ ] **Step 2: 将告警、关键数字、待办和最近运行替换为紧凑 AntD 组件**

Use `Alert` for pending/healthy queue, `Statistic` inside compact `Card`s, and `List` or a `Table` for recent runs. Preserve the existing `pendingCandidates`, `failedImports`, `runStatus` helpers and all navigation callbacks:

```tsx
<Alert
  showIcon
  type={pending > 0 ? 'warning' : 'success'}
  message={pending > 0 ? `有 ${pending} 道候选题待审核` : '治理队列健康'}
  action={<Button size="small" onClick={() => onNavigate(pending > 0 ? 'content' : 'runtime')}>查看</Button>}
/>
```

- [ ] **Step 3: 将指标网格映射为 `Row/Col + Statistic`**

Replace each custom statistic article with:

```tsx
<Col key={item.key} xs={12} sm={8} xl={4}>
  <Card size="small"><Statistic title={item.label} value={state.data.stats[item.key]} suffix={suffixFor(item.unit)} /></Card>
</Col>
```

Keep `formatValue` only where a string representation is still required outside `Statistic`.

- [ ] **Step 4: 使用 `Steps` 展示导入阶段，不改变阶段统计来源**

Build `items` only from `state.data.importPipeline`:

```tsx
<Steps
  size="small"
  responsive
  items={state.data.importPipeline.map((step) => ({
    title: PIPELINE_LABELS[step.stage],
    description: `${step.count} 条`,
    status: step.stage === 'failed' ? 'error' : step.stage === 'published' ? 'finish' : 'process',
  }))}
/>
```

- [ ] **Step 5: 验证总览状态数据仍通过**

Run:

```powershell
pnpm --filter @interview-agent/admin-console test -- useAdminDashboard.test.ts
pnpm --filter @interview-agent/admin-console typecheck
```

Expected: PASS.

### Task 5: 迁移资料导入和候选题审核表单

**Files:**

- Modify: `apps/admin-console/src/components/dashboard/ImportCenter.tsx`
- Modify: `apps/admin-console/src/components/dashboard/training-content/MarkdownImportForm.tsx`
- Modify: `apps/admin-console/src/components/dashboard/TrainingContentWorkbench.tsx`
- Modify: `apps/admin-console/src/components/dashboard/CandidateReviewQueue.tsx`
- Modify: `apps/admin-console/src/components/dashboard/training-content/CandidateEditor.tsx`
- Modify: `apps/admin-console/src/components/dashboard/training-content/CandidateForm.tsx`
- Modify: `apps/admin-console/src/components/dashboard/training-content/training-utils.ts`
- Create: `apps/admin-console/src/components/dashboard/training-content/training-utils.test.ts`

- [ ] **Step 1: 为发布门禁写失败测试**

Create `training-utils.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { canPublishCandidate } from './training-utils';

describe('canPublishCandidate', () => {
  it('only allows approved candidate questions to be published', () => {
    expect(canPublishCandidate('approved')).toBe(true);
    expect(canPublishCandidate('pending')).toBe(false);
    expect(canPublishCandidate('needs_edit')).toBe(false);
    expect(canPublishCandidate('rejected')).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认门禁函数尚不存在**

Run:

```powershell
pnpm --filter @interview-agent/admin-console test -- training-utils.test.ts
```

Expected: FAIL because `canPublishCandidate` is not exported.

- [ ] **Step 3: 在工具模块实现唯一的发布门禁**

Add to `training-utils.ts`:

```ts
export function canPublishCandidate(status: CandidateReview['status']): boolean {
  return status === 'approved';
}
```

Update the publish button condition in `CandidateForm` to:

```tsx
disabled={props.saving || !canPublishCandidate(props.detail.status)}
```

- [ ] **Step 4: 用 AntD `Form`、`Input`、`Input.TextArea`、`Select` 和 `Button` 重写导入表单**

Keep `useMarkdownImport` as the only mutation owner. Its rendered fields must stay controlled by existing `title` and `markdown` state:

```tsx
<Form layout="vertical" onFinish={() => void form.submit()}>
  <Form.Item label="资料标题" required>
    <Input value={form.title} onChange={(event) => form.setTitle(event.target.value)} />
  </Form.Item>
  <Form.Item label="Markdown 内容" required>
    <Input.TextArea rows={10} value={form.markdown} onChange={(event) => form.setMarkdown(event.target.value)} />
  </Form.Item>
  <Button htmlType="submit" type="primary" loading={form.isSubmitting}>导入并生成候选题</Button>
</Form>
```

Refactor `submit` to accept no DOM event before using `onFinish`; it must still call `importMarkdown`, clear the title, call `onChanged()` and then `onCompleted?.()` on success.

- [ ] **Step 5: 将审核表单转换为受控 AntD fields，不把 mutation 移入 Form**

Use the existing `detail` object and `props.onChange` to update fields. The status field is:

```tsx
<Form.Item label="审核状态">
  <Select
    value={props.detail.status}
    onChange={(status) => form.change('status', status as CandidateQuestionDetail['status'])}
    options={[
      { value: 'pending', label: '待审核' },
      { value: 'needs_edit', label: '需修改' },
      { value: 'approved', label: '已通过' },
      { value: 'rejected', label: '已拒绝' },
    ]}
  />
</Form.Item>
```

Keep `CandidateEditor` as the owner of detail fetching and `updateCandidate`/`publishCandidate` execution. Replace plain messages with `Alert` and loading text with `Spin`.

- [ ] **Step 6: 将审核与导入队列换为 AntD 表格，同时保持明确行操作**

Each queue uses `Table` with `pagination={false}`, `size="middle"`, a stable `rowKey`, and `scroll={{ x: 760 }}`. The candidate action is exactly:

```tsx
render: (_, candidate) => <Button type="link" size="small" onClick={() => props.onReview(candidate.id)}>审核</Button>
```

Do not add `rowSelection`, double-click opening, or implicit first-row selection.

- [ ] **Step 7: 验证审核选择与发布门禁**

Run:

```powershell
pnpm --filter @interview-agent/admin-console test -- training-utils.test.ts review-workbench-state.test.ts admin-records.test.ts
pnpm --filter @interview-agent/admin-console typecheck
```

Expected: PASS; opening still requires an explicit id, a missing candidate closes the drawer, and non-approved content cannot publish.

### Task 6: 将正式题库、模型、运行与审计统一为受控 AntD Tables

**Files:**

- Modify: `apps/admin-console/src/components/dashboard/QuestionAssetsTable.tsx`
- Modify: `apps/admin-console/src/components/dashboard/QuestionReviewPanels.tsx`
- Modify: `apps/admin-console/src/components/dashboard/ModelGovernance.tsx`
- Modify: `apps/admin-console/src/components/dashboard/RuntimeObservability.tsx`
- Modify: `apps/admin-console/src/components/dashboard/AuditLogPanel.tsx`
- Test: `apps/admin-console/src/components/dashboard/admin-records.test.ts`

- [ ] **Step 1: 运行既有筛选与页码测试作为受控表格的基线**

Run:

```powershell
pnpm --filter @interview-agent/admin-console test -- admin-records.test.ts
```

Expected: PASS; all current filter predicates, page clamping and page range assertions remain green before Table markup changes.

- [ ] **Step 2: 为所有数据表使用统一的 AntD Table 约束**

For each `Table<T>` use this baseline:

```tsx
<Table<T>
  columns={columns}
  dataSource={table.pagination.items}
  pagination={false}
  rowKey="id"
  size="middle"
  scroll={{ x: 900 }}
/>
<AdminPagination {...table.pagination} onChange={table.setPage} />
```

Do not pass a pre-sliced `items` array to a Table with its default pagination enabled.

- [ ] **Step 3: 定义题库列并保留状态、难度和可见范围筛选**

The question columns must include title/tags, type, difficulty, visibility and status. Use `Tag` for status and preserve labels:

```tsx
{ title: '状态', dataIndex: 'status', width: 112, render: (status) => <Tag color={status === 'disabled' ? 'error' : status === 'published' ? 'success' : 'default'}>{statusLabel(status)}</Tag> }
```

Keep `filterQuestions`, `status`, `difficulty`, `query`, `setPage(1)` on every filter change and `paginateRecords` unchanged.

- [ ] **Step 4: 定义模型、运行和审计的密集列**

Use `Typography.Text copyable={{ text: value }}` only for trace ids and do not mutate the displayed value. Status mappings are:

```tsx
const runColor = { running: 'processing', succeeded: 'success', failed: 'error', fallback: 'warning' } as const;
const resultColor = { success: 'success', failure: 'error' } as const;
```

Model rows show provider/model, purpose, budget, schema mode and status; run rows show stage, schema/latency, trace and updated time; audit rows show action/trace, resource, actor, result and time.

- [ ] **Step 5: 使用一致空态，保留局部失败分支**

When `items.length === 0` after a ready-state filter, render:

```tsx
<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的记录" />
```

Do not bypass `SectionFeedback` when the section is loading, forbidden or failed.

- [ ] **Step 6: 回归验证所有表格的业务规则**

Run:

```powershell
pnpm --filter @interview-agent/admin-console test -- admin-records.test.ts
pnpm --filter @interview-agent/admin-console typecheck
```

Expected: PASS, with no new network request or contract test changes.

### Task 7: 将管理员访问页改为 AntD 登录表单

**Files:**

- Modify: `apps/admin-console/src/components/auth/AdminAccess.tsx`
- Create: `apps/admin-console/src/components/auth/AdminAccess.test.ts`

- [ ] **Step 1: 为角色门禁写失败测试**

Create `AdminAccess.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { canAccessConsole } from './AdminAccess';

describe('canAccessConsole', () => {
  it('allows only management roles into the console', () => {
    expect(canAccessConsole('admin')).toBe(true);
    expect(canAccessConsole('question_reviewer')).toBe(true);
    expect(canAccessConsole('candidate')).toBe(false);
    expect(canAccessConsole(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认当前角色门禁保持行为**

Run:

```powershell
pnpm --filter @interview-agent/admin-console test -- AdminAccess.test.ts
```

Expected: PASS before UI migration; the test protects the existing exported pure helper.

- [ ] **Step 3: 使用 AntD `Layout/Card/Form/Input/Alert/Button` 重写本地与 OIDC 视图**

Keep `AdminAccess` authentication branching and `useLocalAdminSignIn` as state owners. Render local credentials through:

```tsx
<Form layout="vertical" onFinish={() => void access.submit()} requiredMark={false}>
  <Form.Item label="邮箱" required><Input autoComplete="username" type="email" value={access.credentials.email} onChange={(event) => access.setCredentials((current) => ({ ...current, email: event.target.value }))} /></Form.Item>
  <Form.Item label="密码" required><Input.Password autoComplete="current-password" value={access.credentials.password} onChange={(event) => access.setCredentials((current) => ({ ...current, password: event.target.value }))} /></Form.Item>
  {error ? <Alert type="error" showIcon message={error} /> : null}
  <Button block htmlType="submit" type="primary" loading={access.isSubmitting}>安全登录</Button>
</Form>
```

Refactor `submit` to receive no submit event before using `onFinish`; it must call the same `auth.signInWithPassword(credentials)` and keep the `finally` loading reset. The OIDC button continues to call `auth.signIn()`.

- [ ] **Step 4: 验证角色门禁与编译**

Run:

```powershell
pnpm --filter @interview-agent/admin-console test -- AdminAccess.test.ts
pnpm --filter @interview-agent/admin-console typecheck
```

Expected: PASS.

### Task 8: 添加最小高密度样式并清理已弃用的后台仿制规则

**Files:**

- Create: `apps/admin-console/src/app/styles/antd-admin.css`
- Modify: `apps/admin-console/src/app/globals.css`
- Modify: `apps/admin-console/src/app/styles/governance-shell.css`
- Modify: `apps/admin-console/src/app/styles/dashboard.css`
- Modify: `apps/admin-console/src/app/styles/management-tables.css`
- Modify: `apps/admin-console/src/app/styles/states.css`
- Modify: `apps/admin-console/src/app/styles/responsive.css`

- [ ] **Step 1: 创建只负责布局、密度和响应式的 AntD 覆盖层**

Create `antd-admin.css` with the base rules:

```css
.admin-layout-shell { min-height: 100vh; background: #f5f5f5; }
.admin-layout-content { min-width: 0; padding: 16px 20px 28px; }
.admin-page { display: grid; gap: 12px; max-width: 1680px; margin: 0 auto; }
.admin-dense-card > .ant-card-body { padding: 14px 16px; }
.admin-table-card .ant-table-wrapper { overflow: hidden; }
.admin-table-card .ant-table-thead > tr > th { white-space: nowrap; }
.admin-table-card .ant-table-tbody > tr > td { vertical-align: middle; }
.admin-table-toolbar { display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; }
@media (max-width: 768px) {
  .admin-layout-content { padding: 12px; }
  .admin-table-toolbar { align-items: stretch; flex-direction: column; }
}
```

- [ ] **Step 2: 将新增样式放在全部旧后台样式之后，确保 AntD 高密度规则优先**

Append exactly one import to `globals.css`:

```css
@import './styles/antd-admin.css';
```

- [ ] **Step 3: 仅移除已经没有调用方的自定义规则**

After each component is switched, remove the selectors for raw `.admin-drawer-*`, `.table-toolbar`, `.toolbar-search`, `.toolbar-select`, `.table-pagination*`, `.data-table*`, `.section-state*`, `.console-sidebar`, `.console-topbar`, and old raw form fields only if `rg` finds no remaining JSX class usage:

```powershell
rg -n "admin-drawer|table-toolbar|toolbar-search|toolbar-select|table-pagination|data-table|section-state" apps/admin-console/src
```

Keep rules used by non-migrated admin components; do not alter User Portal CSS.

- [ ] **Step 4: 验证 CSS 导入、lint 和生产构建**

Run:

```powershell
pnpm --filter @interview-agent/admin-console lint
pnpm --filter @interview-agent/admin-console build
```

Expected: both commands exit `0`; Next bundles AntD styles without server/client import errors.

### Task 9: 执行全量回归、浏览器验证与交付检查

**Files:**

- Test: `apps/admin-console/src/components/**/*.test.ts`
- Test: `apps/admin-console/src/hooks/useAdminDashboard.test.ts`
- Test: `apps/admin-console/src/lib/api.test.ts`

- [ ] **Step 1: 运行后台完整质量门禁**

Run:

```powershell
pnpm --filter @interview-agent/admin-console test
pnpm --filter @interview-agent/admin-console lint
pnpm --filter @interview-agent/admin-console typecheck
pnpm --filter @interview-agent/admin-console build
```

Expected: all commands exit `0`. If a failure stems from an existing unrelated shared contract mismatch, record its command output and do not modify that contract.

- [ ] **Step 2: 启动后台并验证登录页与后台交互**

Run:

```powershell
pnpm --filter @interview-agent/admin-console dev
```

Browser checks at `http://localhost:3002`:

1. 登录页显示 AntD Card、Form、Input.Password、Alert 和主按钮。
2. 具有管理员会话时，侧栏七个项与 Hash 同步，折叠/展开保持工作。
3. 每个列表页均显示紧凑筛选区、`Table`、`Tag` 和一套受控分页。
4. 搜索和 Select 会将页码回到第一页；表格不出现第二套内置分页。
5. 导入、审核抽屉可打开、Escape 和遮罩关闭有效；非 `approved` 候选题的发布按钮禁用。
6. 以窄 viewport 检查侧栏折叠、筛选换行与表格横向滚动。

- [ ] **Step 3: 检查改动范围和空白字符错误**

Run:

```powershell
git diff --check -- apps/admin-console docs/superpowers/specs/2026-07-15-ant-design-admin-redesign-design.md docs/superpowers/plans/2026-07-15-ant-design-admin-redesign.md
git status --short
```

Expected: scoped `git diff --check` has no output. Report all pre-existing unrelated changes separately; do not stage or commit in the shared dirty worktree.
