# 后台列表化与审核工作台改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将审核工作台变为传统候选题列表页，并以 Ant Design 风格统一后台的列表页与右侧详情交互。

**Architecture:** 保持现有单页 hash 视图和 API 不变。新增可复用 `AdminDrawer`，由审核工作台和资料导入页分别控制显式打开状态；候选题表格与详情编辑解耦，题库页只保留正式题库。

**Tech Stack:** Next.js 15、React 18、TypeScript、Vitest、现有 CSS tokens/semantic HTML。

## Global Constraints

- 不新增 `antd` 或其他依赖，不修改 `package.json`、contracts、Product API、数据库或根配置。
- 保留工作区既有未提交的后台壳层与 token 改动，只增量修改相关文件。
- 所有文案使用简体中文；按钮、状态和结果提示保持一致。
- 选择候选题必须显式，不得回退打开列表第一条记录。

---

### Task 1: 锁定显式候选题选择与分页行为

**Files:**

- Modify: `apps/admin-console/src/components/dashboard/admin-records.ts`
- Modify: `apps/admin-console/src/components/dashboard/admin-records.test.ts`
- Modify: `apps/admin-console/src/components/dashboard/AdminTableControls.tsx`

**Interfaces:**

- Consumes: `CandidateReview[]`、当前页和总页数。
- Produces: 无默认首条回退的 `resolveCandidateSelection()`，以及可渲染连续页码的 `paginationPages()`。

- [x] **Step 1: 写回归断言**

更新候选题选择测试，使“未传入有效选择”返回 `null`，而不是第一条记录；为页码范围测试首页、中间页和末页的页码/省略号组合。

- [x] **Step 2: 实现最小状态逻辑**

`resolveCandidateSelection()` 只在 requested/current id 仍存在时返回它；新增纯函数生成最大七个可见页码和省略号标记。`AdminPagination` 渲染页码按钮、`aria-current="page"`、上一页和下一页。

- [x] **Step 3: 运行定向测试**

```powershell
pnpm --filter @interview-agent/admin-console test -- admin-records.test.ts
```

预期：筛选、分页和选择逻辑全部通过。

### Task 2: 新增可复用的 Ant Design 风格 Drawer

**Files:**

- Create: `apps/admin-console/src/components/dashboard/AdminDrawer.tsx`
- Modify: `apps/admin-console/src/app/styles/management-tables.css`

**Interfaces:**

- Consumes: `{ open, title, description?, onClose, children }`。
- Produces: 仅在 `open` 时渲染、有 `role="dialog"` / `aria-modal`、遮罩点击和 Escape 键关闭的右侧 Drawer。

- [x] **Step 1: 实现 Drawer 结构**

使用语义化遮罩 button 和右侧 `aside`，标题使用 `useId()` 与 `aria-labelledby` 关联。`useEffect()` 在打开时监听 Escape，卸载时清理监听器。关闭按钮使用清晰的“关闭”可访问名称。

- [x] **Step 2: 编写桌面与窄屏样式**

添加固定遮罩、最大 720px 宽度的右侧面板、独立头部/内容区和移动端全宽规则；与现有 `--surface`、`--line` 和 `--shadow-raised` token 对齐。

- [x] **Step 3: 检查类型与样式格式**

```powershell
pnpm --filter @interview-agent/admin-console typecheck
pnpm exec prettier --check apps/admin-console/src/components/dashboard/AdminDrawer.tsx apps/admin-console/src/app/styles/management-tables.css
```

预期：TypeScript 和定向 Prettier 检查均通过。

### Task 3: 将审核工作台改为“列表 → Drawer 详情”

**Files:**

- Modify: `apps/admin-console/src/components/dashboard/TrainingContentWorkbench.tsx`
- Modify: `apps/admin-console/src/components/dashboard/CandidateReviewQueue.tsx`
- Modify: `apps/admin-console/src/components/dashboard/training-content/CandidateEditor.tsx`
- Modify: `apps/admin-console/src/components/dashboard/training-content/types.ts`
- Modify: `apps/admin-console/src/components/dashboard/AdminDashboard.tsx`
- Modify: `apps/admin-console/src/app/styles/dashboard.css`

**Interfaces:**

- Consumes: 现有 `SectionState<CandidateReview[]>` 和 `getCandidateDetail/updateCandidate/publishCandidate`。
- Produces: `TrainingContentWorkbench` 自己拥有 `selectedCandidateId`；`CandidateReviewQueue.onReview(id)` 打开抽屉；`CandidateEditor` 只消费显式 selected id。

- [x] **Step 1: 先将工作台状态转移为显式选择**

将 `selectedCandidateId` 从 `AdminDashboard` 移至 `TrainingContentWorkbench`。仅点击队列操作列时设置 id；关闭 Drawer 或刷新后记录不存在时清除 id。

- [x] **Step 2: 拆开列表和编辑器**

工作台首屏渲染 `CandidateReviewQueue`，并将 `CandidateEditor` 放入 `AdminDrawer`。移除编辑器中的 `<select>` 和默认第一条候选题逻辑；保留原有加载、保存、发布、错误和成功反馈。

- [x] **Step 3: 改善列表信息密度**

候选题表格保留题目、质量分、状态、创建时间和操作列；空态明确指向“资料导入”。操作文案统一为“审核”。

- [x] **Step 4: 运行测试与类型检查**

```powershell
pnpm --filter @interview-agent/admin-console test -- admin-records.test.ts
pnpm --filter @interview-agent/admin-console typecheck
```

预期：无默认选择回归，工作台组件类型检查通过。

### Task 4: 收敛题库页和导入页的信息架构

**Files:**

- Modify: `apps/admin-console/src/components/dashboard/QuestionReviewPanels.tsx`
- Modify: `apps/admin-console/src/components/dashboard/ImportCenter.tsx`
- Modify: `apps/admin-console/src/components/dashboard/AdminDashboard.tsx`
- Modify: `apps/admin-console/src/components/admin-navigation.ts`
- Modify: `apps/admin-console/src/components/dashboard/AdminOverview.tsx`

**Interfaces:**

- Consumes: `QuestionAssetsTable`、`MarkdownImportForm`、`ImportTask[]` 和 `AdminDrawer`。
- Produces: 题库页只显示正式题库；导入页的创建表单由局部 `isImportDrawerOpen` 控制，任务历史为表格。

- [x] **Step 1: 移除题库页的候选队列**

将 `QuestionReviewPanels` props 缩减为 questions，直接展示正式题库列表；删去 `onReview` 跨页跳转。导航和总览中把该页命名收敛为“题库管理”。

- [x] **Step 2: 将导入入口放入 Drawer**

在导入页标题右侧放置“导入资料”主按钮。任务历史使用标准 `<table>` 呈现任务、状态、候选题数、更新时间和失败原因；原有 Markdown 表单放入 `AdminDrawer`，成功后刷新数据并关闭 Drawer。

- [x] **Step 3: 运行 admin-console 单元测试**

```powershell
pnpm --filter @interview-agent/admin-console test
```

预期：导航、API、记录过滤和会话测试全部通过。

### Task 5: 统一视觉细节并执行浏览器验证

**Files:**

- Modify: `apps/admin-console/src/app/styles/primitives.css`
- Modify: `apps/admin-console/src/app/styles/dashboard.css`
- Modify: `apps/admin-console/src/app/styles/management-tables.css`

**Interfaces:**

- Consumes: 现有 CSS token 与各页面已有 `.card`、`.data-table`、`.button`、`.status` 类。
- Produces: Ant Design 风格的紧凑操作按钮、8px 卡片、浅灰表头、状态 Tag、页码 Pagination 和 Drawer 响应式布局。

- [x] **Step 1: 统一组件尺度**

将主按钮改为纯色品牌蓝，去除不符合 AntD 表单感的渐变/大阴影；使 Card、表格和标签使用 token 定义的边框、圆角和悬停状态。

- [x] **Step 2: 执行静态验证**

```powershell
pnpm --filter @interview-agent/admin-console lint
pnpm --filter @interview-agent/admin-console typecheck
pnpm --filter @interview-agent/admin-console test
pnpm --filter @interview-agent/admin-console build
```

预期：四个命令退出码均为 0。

- [ ] **Step 3: 执行可视化回归**

启动 admin-console，确认：进入 `#content` 先看到候选题 Table；点击“审核”只在此后出现 Drawer；`#questions` 没有候选题队列；`#imports` 首屏是任务表格且按钮可打开/关闭 Drawer；在窄屏 Drawer 不溢出。

### Task 6: 收尾审查

**Files:**

- Review: `apps/admin-console/src/**` 本次变更

- [x] **Step 1: 对照设计自检**

确认无 `antd` 依赖变化、无默认首条候选题、无残留候选队列入口、无遗留 `onReview` props，且不影响模型/运行/审计列表。

- [ ] **Step 2: 请求独立代码审查并修复发现的问题**

审查可访问性（Drawer aria/键盘）、状态清理、类型边界、响应式 CSS 和未提交文件边界；对发现的问题做定向修复并重新运行受影响验证。

## 执行记录（2026-07-15）

- 新增候选题显式选择与页码范围测试；`pnpm --filter @interview-agent/admin-console test` 共 27 个测试通过。
- `pnpm --filter @interview-agent/admin-console lint`、`typecheck`、`build` 均通过；定向 Prettier 与 `git diff --check` 通过。
- 已用浏览器访问 `http://localhost:3002/#content`，页面正常加载且无控制台错误，但当前浏览器没有管理员会话，只能到达登录页。为避免读取或使用本地账号密码，未提交登录表单。
- 为获取无需凭证的开发模式页面而启动的独立 Product API 未能编译，原因是工作区既有的 `model_credential` contract/Prisma 类型不一致；该问题不属于本次后台 UI 改造，未修改。
