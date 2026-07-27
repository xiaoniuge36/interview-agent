# Interview Report Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 报告读取失败时仍恢复模拟面试 session、对话和完成状态，并给出准确的报告重试提示。

**Architecture:** 新增无 React 依赖的 interview snapshot helper；历史恢复与直播同步共用；ReportPanel 按 sessionStatus 区分未完成与报告暂不可读。

**Tech Stack:** React 18、TypeScript 5、Vitest、现有 Interview API

## Global Constraints

- session 读取失败才判定整场恢复失败。
- `report_ready` 的报告读取失败返回 partial，不丢弃 session。
- partial 不伪造报告，不连接完成态流；只提示刷新重试。
- 不修改 Product API、共享契约、Prisma schema、迁移、根配置、依赖或 CI。
- 函数不超过 50 行、文件不超过 300 行、嵌套不超过 3 层、位置参数不超过 3 个、圈复杂度不超过 10。
- 本会话不执行 commit、push 或 PR。

---

### Task 1: Interview snapshot helper

**Files:**

- Create: `apps/user-portal/src/hooks/interview-snapshot.ts`
- Create: `apps/user-portal/src/hooks/interview-snapshot.test.ts`

**Interfaces:**

- Produces: `loadInterviewSnapshot({ loadSession, loadReport }): Promise<InterviewSnapshotResult>`。

- [x] **Step 1: 写失败测试**

覆盖 session reject、waiting_user 不读报告、report_ready 完整成功、report reject partial。

- [x] **Step 2: 运行测试确认 RED**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/hooks/interview-snapshot.test.ts`  
Expected: FAIL，模块不存在。

- [x] **Step 3: 实现 helper**

```ts
export async function loadInterviewSnapshot(input: {
  loadSession: () => Promise<InterviewSession>;
  loadReport: () => Promise<InterviewReport>;
}): Promise<InterviewSnapshotResult>;
```

session 单独 try/catch；仅 `report_ready` 进入第二个 try/catch。

- [x] **Step 4: 运行 helper 测试确认 GREEN**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/hooks/interview-snapshot.test.ts`  
Expected: PASS。

### Task 2: 历史恢复与直播同步接入

**Files:**

- Modify: `apps/user-portal/src/hooks/useArchivedInterview.ts`
- Modify: `apps/user-portal/src/hooks/useInterviewController.ts`

**Interfaces:**

- Consumes: `loadInterviewSnapshot`。

- [x] **Step 1: 历史恢复使用 snapshot**

error dispatch failure；ready/partial 应用 session/report；partial 覆盖 notice 为报告暂不可读文案。

- [x] **Step 2: 直播 report_ready 使用 snapshot**

ready 写 session/report、clear_stream、success；partial 写 session、clear_stream、info；error failure + error 通知。

- [x] **Step 3: 保持状态流约束**

只有 `running` / `generating_report` 连接 SSE；`report_ready` partial 不连接。

### Task 3: 报告面板准确占位

**Files:**

- Modify: `apps/user-portal/src/components/interview/ReportPanel.tsx`
- Modify: `apps/user-portal/src/components/interview/InterviewWorkspace.tsx`
- Modify: `apps/user-portal/src/components/interview/InterviewSidebar.test.tsx`

- [x] **Step 1: 写失败组件测试**

`report={null}` + `sessionStatus="report_ready"` 断言“报告内容暂时无法读取”和“刷新页面”。

- [x] **Step 2: 运行测试确认 RED**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/interview/InterviewSidebar.test.tsx`  
Expected: FAIL，仍显示通用完成引导。

- [x] **Step 3: 实现 sessionStatus 占位**

Workspace 传入 `controller.state.session?.status ?? null`；ReportPanel 根据 status 选择 placeholder。

- [x] **Step 4: 运行定向测试**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/hooks/interview-snapshot.test.ts src/components/interview/InterviewSidebar.test.tsx src/components/interview/interview-state.test.ts`  
Expected: PASS。

### Task 4: User Portal 完整门禁

- [x] **Step 1: Prettier 与 `git diff --check`**
- [x] **Step 2: ESLint 与完整 Vitest**
- [x] **Step 3: TypeScript 与 Next.js 生产构建**
- [x] **Step 4: 最终 diff 审查并记录证据**

## Verification Evidence

- RED：snapshot 测试因缺少模块失败；报告面板测试因仍显示通用完成引导失败。
- 定向 GREEN：3 个测试文件、9 项测试通过。
- 完整 Vitest：61 个测试文件、188 项测试通过。
- ESLint、TypeScript、Next.js 生产构建通过；构建生成 14 个静态页面。
- session loader 失败仍是 error；report loader 失败保留 session 并产生 partial；历史恢复与直播同步均已复用。
- Prettier 与 `git diff --check` 已执行；相关生产文件均少于 300 行。
