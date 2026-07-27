# 目标岗位到模拟面试连续转化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让用户保存目标岗位后可以直接进入使用该岗位的模拟面试，同时保留低频的仅保存操作。

**Architecture:** 新增纯前端 `job-handoff` 模型统一提交动作、面试深链和初始岗位回退；`useJobIntentForm` 继续负责既有校验与唯一一次保存请求，成功后按动作触发跳转。岗位页重组为表单与训练预览两栏，面试控制器只读取可选 `job` 查询参数，不改变会话恢复和启动请求。

**Tech Stack:** Next.js 15、React 18、TypeScript、CSS、Vitest。

## Global Constraints

- 不修改 API、合同、数据库、岗位分析、模型调用、鉴权、持久化或依赖。
- 保存失败不得跳转；保存并开始不得发起重复创建请求。
- 深链岗位不存在时回退到列表首项，现有 `session` 恢复行为保持不变。
- 样式只使用现有主题 token 与 `color-mix()`；移动端、键盘焦点和 reduced motion 行为保留。
- 当前共享工作区存在其他未提交改动，不执行 branch、stage、commit、push、reset 或覆盖无关文件。

---

### Task 1: 定义岗位交接纯模型

**Files:**

- Create: `apps/user-portal/src/lib/job-handoff.ts`
- Create: `apps/user-portal/src/lib/job-handoff.test.ts`

**Interfaces:**

- Produces: `JobSubmitAction`、`jobSubmitAction(value)`、`interviewHrefForJob(id)`、`preferredJobIntentId(jobs, requestedId)`、`handoffSavedJob(action, payload, onStart)`。

- [x] **Step 1: 写失败测试覆盖提交动作、深链、回退和成功交接**

测试断言 `save` 不触发交接、`save_and_start` 只触发一次，URL 对岗位 ID 编码，指定岗位有效时优先选中、无效时回退首项。

- [x] **Step 2: 运行测试确认模块尚不存在**

Run: `vitest run src/lib/job-handoff.test.ts`

Expected: FAIL，提示 `job-handoff` 无法解析。

- [x] **Step 3: 实现最小纯模型并重新运行测试**

Expected: PASS，所有决策均不依赖浏览器或网络。

### Task 2: 接入双操作与岗位深链

**Files:**

- Create: `apps/user-portal/src/components/profile/JobIntentPanel.test.tsx`
- Modify: `apps/user-portal/src/components/profile/useJobIntentForm.ts`
- Modify: `apps/user-portal/src/components/profile/JobIntentPanel.tsx`
- Modify: `apps/user-portal/src/components/profile/JobPageContent.tsx`
- Modify: `apps/user-portal/src/hooks/useInterviewController.ts`

**Interfaces:**

- Consumes: Task 1 的纯模型和现有 `createJobIntent`、`onCreated`、Next Router。
- Produces: 同排的 `save` / `save_and_start` 提交按钮，以及 `/interview?job=<id>` 初始岗位选择。

- [x] **Step 1: 写失败的静态组件测试**

断言存在“仅保存”和“保存并开始模拟面试”，两个按钮均为 submit，主操作使用主要按钮样式，并显示就近状态区域。

- [x] **Step 2: 运行测试确认新动作尚不存在**

Run: `vitest run src/components/profile/JobIntentPanel.test.tsx`

Expected: FAIL，缺少双操作文案或提交值。

- [x] **Step 3: 实现单次保存与成功后交接**

`useJobIntentForm` 从原生 submitter 读取动作；成功创建后先更新工作区与通知，再仅在 `save_and_start` 时调用 `onStart(payload)`。`JobPageContent` 使用 `interviewHrefForJob` 跳转；面试控制器使用 `preferredJobIntentId` 初始化岗位。

- [x] **Step 4: 运行岗位交接和组件测试**

Run: `vitest run src/lib/job-handoff.test.ts src/components/profile/JobIntentPanel.test.tsx`

Expected: PASS。

### Task 3: 重组岗位页信息层级与响应式样式

**Files:**

- Modify: `apps/user-portal/src/components/profile/JobPageContent.tsx`
- Modify: `apps/user-portal/src/components/profile/JobIntentPanel.tsx`
- Modify: `apps/user-portal/src/components/profile/LatestAnalysis.tsx`
- Create: `apps/user-portal/src/app/styles/job-intent.css`
- Create: `apps/user-portal/src/app/styles/job-intent-responsive.css`
- Modify: `apps/user-portal/src/app/globals.css`

**Interfaces:**

- Produces: `job-page-workspace`、`job-intent-layout`、`job-intent-panel`、`job-submit-bar`、`job-training-preview` 的主题自适应布局。

- [x] **Step 1: 将最新分析移到表单旁的训练预览栏**

页面标题只保留返回画像的次级导航；训练预览说明该岗位如何影响追问，并继续展示真实服务端分析。

- [x] **Step 2: 建立训练起跑条与动作层级**

状态说明、仅保存和主操作在表单末尾聚合；忙碌时分别显示“正在保存…”或“正在准备模拟面试…”。

- [x] **Step 3: 添加桌面双栏与移动单列样式**

桌面预览栏可 sticky；820px 以下改为单列，680px 以下按钮纵向占满宽度。只使用主题 token 与 `color-mix()`。

### Task 4: 集成验证

**Files:**

- Test: 上述新增测试与现有面试状态测试。

- [x] **Step 1: 运行定向测试、lint 与 typecheck**

Run: `vitest run src/lib/job-handoff.test.ts src/components/profile/JobIntentPanel.test.tsx src/components/interview/interview-state.test.ts`

Run: `eslint src/components/profile src/hooks/useInterviewController.ts src/lib/job-handoff.ts`

Run: `tsc -p tsconfig.json --noEmit`

Expected: 全部 exit 0。

- [x] **Step 2: 运行格式、样式约束与生产构建**

Run: `prettier --check <本计划相关文件>`

Run: `rg -n "#[0-9a-fA-F]{3,8}|rgba\(" apps/user-portal/src/app/styles/job-intent.css`

Run: `next build`

Expected: 格式正确、颜色扫描无输出、生产构建 exit 0。

- [x] **Step 3: 检查补丁并同步计划状态**

Run: `git diff --check`

Expected: 无空白错误，且未修改 API、合同、数据库或依赖。
