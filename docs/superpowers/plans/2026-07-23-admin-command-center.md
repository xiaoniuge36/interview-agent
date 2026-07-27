# 后台统一命令中心 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 合并后台顶部重复搜索入口，并交付支持完整键盘导航和抽屉紧凑态的统一命令中心。

**Architecture:** `admin-command-model.ts` 负责权限过滤、分组去重和选中索引计算；`AdminCommandPalette.tsx` 只负责面板状态与交互；`AdminHeader.tsx` 只渲染单一触发器及通用工具；Agent 抽屉通过根元素数据属性通知 CSS 进入紧凑布局。

**Tech Stack:** Next.js 15、React 18、TypeScript、Ant Design 6、Vitest、CSS。

## Global Constraints

- 不修改 Product API、数据库、contracts、权限角色、hash 路由或根配置。
- 不新增依赖，不改变工作台偏好的持久化结构。
- 保留工作区中所有既有未提交改动，不执行 commit、stash、reset 或 clean。

---

### Task 1: 命令分组与键盘选择模型

**Files:**

- Modify: `apps/admin-console/src/components/admin-shell/admin-command-model.ts`
- Modify: `apps/admin-console/src/components/admin-shell/AdminCommandPalette.test.ts`

**Interfaces:**

- Produces: `buildCommandSections({ query, role, favoriteViews, recentViews }): CommandSection[]`
- Produces: `flattenCommandSections(sections): AdminNavigationItem[]`
- Produces: `moveCommandSelection(index, direction, count): number`

- [x] **Step 1: 写失败测试**

```ts
expect(
  buildCommandSections({
    query: '',
    role: 'platform_admin',
    favoriteViews: ['runtime'],
    recentViews: ['runtime', 'imports'],
  }),
).toMatchObject([
  { key: 'favorites', items: [{ id: 'runtime' }] },
  { key: 'recent', items: [{ id: 'imports' }] },
]);
expect(moveCommandSelection(0, -1, 3)).toBe(2);
```

- [x] **Step 2: 运行定向测试并确认失败**

Run: `pnpm --filter @interview-agent/admin-console test -- AdminCommandPalette.test.ts`

Expected: FAIL，提示新导出尚不存在。

- [x] **Step 3: 实现最小模型**

实现分组构建、跨分组去重、权限过滤、扁平化和循环索引；空结果返回 `-1`，不得在组件内重复这些规则。

- [x] **Step 4: 重跑定向测试**

Run: `pnpm --filter @interview-agent/admin-console test -- AdminCommandPalette.test.ts`

Expected: PASS。

### Task 2: 单一命令入口与完整键盘交互

**Files:**

- Modify: `apps/admin-console/src/components/admin-shell/AdminCommandPalette.tsx`
- Modify: `apps/admin-console/src/components/admin-shell/AdminHeader.tsx`
- Modify: `apps/admin-console/src/components/admin-shell/AdminHeader.test.tsx`

**Interfaces:**

- Consumes: Task 1 的 `buildCommandSections`、`flattenCommandSections`、`moveCommandSelection`
- Preserves: `AdminCommandPaletteProps.onViewChange(view)`

- [x] **Step 1: 更新静态契约测试**

断言顶部包含“搜索模块或命令”和命令快捷键，但不再包含独立 `combobox` 搜索入口；命令触发器保留可访问名称。

- [x] **Step 2: 实现命令面板交互**

将收藏、最近访问、全部模块渲染为可选分组；搜索词变化时重置首项；处理 `ArrowUp`、`ArrowDown`、`Enter`、`Escape`；选择后关闭面板并清空查询。

- [x] **Step 3: 删除 HeaderSearch 重复逻辑**

从 `AdminHeader.tsx` 删除 `AutoComplete`、查询状态和 `findNavigationMatches`，只保留 `AdminCommandPalette`。

- [x] **Step 4: 运行组件相关测试**

Run: `pnpm --filter @interview-agent/admin-console test -- AdminCommandPalette.test.ts AdminHeader.test.tsx`

Expected: PASS。

### Task 3: 抽屉紧凑态和响应式样式

**Files:**

- Modify: `apps/admin-console/src/components/admin-agent/AdminAgentDrawer.tsx`
- Modify: `apps/admin-console/src/app/styles/antd-admin.css`

**Interfaces:**

- Produces: 根元素 `data-admin-agent-drawer-open="true"`，关闭或卸载时移除。
- Consumes: CSS 只读取该数据属性，不改变抽屉运行逻辑。

- [x] **Step 1: 同步抽屉可见状态**

在客户端 effect 中设置或移除根数据属性，并在卸载时清理，避免影响其他页面和测试。

- [x] **Step 2: 增加命令触发器与紧凑布局样式**

完整态显示图标、文字和快捷键；中等宽度隐藏快捷键；窄屏及抽屉开启时收缩入口并隐藏刷新摘要。添加 hover、active、focus-visible 和 reduced-motion 规则。

- [x] **Step 3: 运行格式与静态检查**

Run: `pnpm exec prettier --check apps/admin-console/src/components/admin-shell apps/admin-console/src/components/admin-agent/AdminAgentDrawer.tsx apps/admin-console/src/app/styles/antd-admin.css`

Expected: PASS。

### Task 4: 全量验证和真实页面验收

**Files:**

- Verify only.

- [x] **Step 1: 运行 Admin Console 全量验证**

```powershell
pnpm --filter @interview-agent/admin-console test
pnpm --filter @interview-agent/admin-console typecheck
pnpm --filter @interview-agent/admin-console lint
pnpm --filter @interview-agent/admin-console build
```

Expected: 所有命令退出码为 0。

- [x] **Step 2: 浏览器验收**

验证普通桌面、Agent 抽屉打开和窄屏下无水平溢出；验证 `Ctrl/Cmd + K` 打开、上下键选择、Enter 跳转、Escape 关闭。

- [x] **Step 3: 检查改动边界**

Run: `git diff --check`

Expected: 退出码为 0，且本轮仅修改计划列出的后台文件和文档。
