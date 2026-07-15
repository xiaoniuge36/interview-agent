# C 端 Agent 控制台视觉修订 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 C 端首页、侧栏与模型设置页对齐用户提供的 OfferPilot Agent 控制台参考图，同时不改变已实现的 BYOK 功能。

**Architecture:** 只调整用户端的展示组件和 CSS；现有路由、模型连接 API、受控表单、加密和真实模型调用链路保持原样。首页由 HeroSection 负责主工作区，设置页由 ModelConnectionsPanel 负责可交互的连接详情与偏好。

**Tech Stack:** Next.js App Router、React、TypeScript、CSS、Vitest。

## Global Constraints

- 不更改模型连接的 API、合同、数据库、加密或 API Key 生命周期。
- API Key 绝不进入 UI 状态以外的读取响应、日志或页面文案。
- 桌面侧栏宽度为 260px；主画布使用暖白色与 `#155EEF` 主按钮。
- 不覆盖工作区中与此任务无关的既有未提交修改。

---

### Task 1: 对齐全局侧栏与视觉令牌

**Files:**

- Modify: `apps/user-portal/src/components/shell/navigation.ts`
- Modify: `apps/user-portal/src/components/shell/UserSidebar.tsx`
- Modify: `apps/user-portal/src/app/styles/tokens.css`
- Modify: `apps/user-portal/src/app/styles/shell.css`

- [x] 将可见导航收敛到截图中的六项，并把 `/job` 映射为“我的 Agent”上下文。
- [x] 调整深色侧栏的账户、分割线、活动态与移动端折叠规则。
- [x] 运行 `pnpm --filter @interview-agent/user-portal typecheck`。

### Task 2: 重构首页 Agent 工作台

**Files:**

- Modify: `apps/user-portal/src/components/home/HeroSection.tsx`
- Modify: `apps/user-portal/src/components/home/HomePageContent.tsx`
- Modify: `apps/user-portal/src/app/styles/shell.css`
- Modify: `apps/user-portal/src/app/styles/responsive.css`

- [x] 以顶部在线状态、准备卡、四步时间线和白底 Agent memory 取代现有通用 Hero 卡。
- [x] 从现有 profile、job 和 interview 数据计算显示状态；空数据时提供清晰的首个行动。
- [x] 运行 `pnpm --filter @interview-agent/user-portal test`。

### Task 3: 重构 AI 模型设置视觉与偏好区

**Files:**

- Modify: `apps/user-portal/src/components/settings/SettingsPageContent.tsx`
- Modify: `apps/user-portal/src/components/settings/ModelConnectionsPanel.tsx`
- Modify: `apps/user-portal/src/app/styles/settings.css`
- Test: `apps/user-portal/src/components/settings/model-connection-form.test.ts`

- [x] 把连接行升级为参考图中的详情卡，但沿用现有 CRUD、测试与脱敏字段。
- [x] 添加仅影响本地展示的模型行为偏好控件，不将虚假偏好写入后端。
- [x] 执行 `pnpm --filter @interview-agent/user-portal test && pnpm --filter @interview-agent/user-portal build`。
