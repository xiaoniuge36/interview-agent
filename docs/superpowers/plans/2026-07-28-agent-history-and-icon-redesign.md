# AI 助手历史栏与图标重设 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 固定后台 AI 助手的左侧历史对话栏，并重绘前后台 AI 浮动入口图标。

**Architecture:** 后台抽屉内容移除历史栏的显示状态，直接渲染现有 `AdminAgentConversationSidebar`；浮动入口仍维持当前拖动和状态属性，只替换内部 SVG 与局部 CSS 外观。前台不改变对话结构，仅替换其入口 SVG 和对应样式。最终使用原创 `IA` 单线字母作为统一品牌标记，靠克制的端侧色彩区分前后台。

**Tech Stack:** Next.js、React、TypeScript、Ant Design、CSS、Vitest。

---

### Task 1: 让后台历史栏默认固定显示

**Files:**

- Modify: `apps/admin-console/src/components/admin-agent/AdminAgentDrawer.test.tsx`
- Modify: `apps/admin-console/src/components/admin-agent/AdminAgentDrawerContent.tsx`

- [x] **Step 1: 写出失败的布局回归断言**

```tsx
expect(markup).toContain('class="admin-agent-conversation-sidebar"');
expect(markup).not.toContain('打开历史对话');
expect(markup).not.toContain('收起历史对话');
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @interview-agent/admin-console test -- AdminAgentDrawer.test.tsx`

Expected: FAIL，因为历史栏当前默认折叠。

- [x] **Step 3: 移除历史栏开关并直接渲染侧栏**

删除 `historyOpen` 状态和历史开关按钮；保留现有 `ConversationHistory` 属性透传，令其作为抽屉内容的第一个子节点。

- [x] **Step 4: 运行测试确认通过**

Run: `pnpm --filter @interview-agent/admin-console test -- AdminAgentDrawer.test.tsx`

Expected: PASS。

### Task 2: 建立前后台 AI 入口的图标回归测试

**Files:**

- Create: `apps/admin-console/src/components/admin-agent/AdminAgentFloatButton.test.tsx`
- Create: `apps/user-portal/src/components/user-agent/UserAgentFloatButton.test.tsx`

- [x] **Step 1: 写出失败的语义化 SVG 断言**

```tsx
expect(markup).toContain('admin-agent-float-mark-monogram');
expect(markup).toContain('user-agent-float-mark-monogram');
expect(markup).not.toContain('float-mark-aperture');
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @interview-agent/admin-console test -- AdminAgentFloatButton.test.tsx; pnpm --filter @interview-agent/user-portal test -- UserAgentFloatButton.test.tsx`

Expected: FAIL，因为当前入口仍使用三瓣光阑。

### Task 3: 重绘入口图标与图标容器

**Files:**

- Modify: `apps/admin-console/src/components/admin-agent/AdminAgentFloatButton.tsx`
- Modify: `apps/admin-console/src/app/styles/admin-agent.css`
- Modify: `apps/user-portal/src/components/user-agent/UserAgentFloatButton.tsx`
- Modify: `apps/user-portal/src/app/styles/user-agent.css`

- [x] **Step 1: 绘制原创角色化 SVG**

两个入口使用原创 `IA` 单线字母标识，移除轨道、星芒、对话外壳、三瓣光阑、指令脉冲和训练轨迹。两个入口保留同样的 `aria-label`、状态点及 pointer handlers。

- [x] **Step 2: 将浮动容器调整为对话信标**

使用圆形深色 Launcher、微妙的内描边和轻量悬浮位移；前台使用钴蓝与薄荷绿，后台使用海军蓝与青蓝。保留已有悬浮标签和 `prefers-reduced-motion` 降级，避免持续装饰性动画。

- [x] **Step 3: 运行浮动入口测试确认通过**

Run: `pnpm --filter @interview-agent/admin-console test -- AdminAgentFloatButton.test.tsx; pnpm --filter @interview-agent/user-portal test -- UserAgentFloatButton.test.tsx`

Expected: PASS。

### Task 4: 集成验证

**Files:**

- Test: `apps/admin-console/src/components/admin-agent/AdminAgentDrawer.test.tsx`
- Test: `apps/admin-console/src/components/admin-agent/AdminAgentFloatButton.test.tsx`
- Test: `apps/user-portal/src/components/user-agent/UserAgentFloatButton.test.tsx`

- [x] **Step 1: 执行两端定向测试**

Run: `pnpm --filter @interview-agent/admin-console test -- AdminAgentDrawer.test.tsx AdminAgentFloatButton.test.tsx; pnpm --filter @interview-agent/user-portal test -- UserAgentFloatButton.test.tsx`

Expected: PASS。

- [x] **Step 2: 执行类型、lint、构建和差异检查**

Run: `pnpm --dir apps/admin-console exec tsc -p tsconfig.json --noEmit; pnpm --dir apps/user-portal exec tsc -p tsconfig.json --noEmit; pnpm --filter @interview-agent/admin-console lint; pnpm --filter @interview-agent/user-portal lint; pnpm --filter @interview-agent/admin-console build; pnpm --filter @interview-agent/user-portal build; git diff --check`

Expected: 所有命令 exit 0。
