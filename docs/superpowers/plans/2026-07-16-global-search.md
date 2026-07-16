# 用户端全局搜索 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页跳转式搜索改造成全用户端可唤起、支持实时分组结果与键盘操作的居中命令面板。

**Architecture:** 在 `UserShell` 内挂载 `GlobalSearchProvider`，统一管理打开状态、查询词和全局快捷键。题目结果复用现有题库 API，专题和功能页面使用可测试的本地索引，三类结果转换为统一项目模型后交给命令面板渲染和导航。

**Tech Stack:** Next.js 15、React 18、TypeScript、现有 Zod Contract、Vitest、原生 CSS。

**Execution note:** 用户要求在当前 `main` 串行修改，不切分支、不创建子代理、不自动 commit；因此计划不包含提交步骤。

---

### Task 1: 建立全局搜索索引与纯函数模型

**Files:**
- Create: `apps/user-portal/src/components/search/global-search-model.ts`
- Create: `apps/user-portal/src/components/search/global-search-model.test.ts`
- Modify: `apps/user-portal/src/components/home/question-hub/QuestionTopicGrid.tsx`

- [ ] **Step 1: 写失败测试**

覆盖静态入口匹配、统一排序和键盘索引循环：

```ts
expect(filterStaticSearchItems('agent').map((item) => item.label)).toContain('我的 Agent');
expect(filterStaticSearchItems('系统设计')[0]?.kind).toBe('topic');
expect(moveSearchIndex(0, 3, 'previous')).toBe(2);
expect(moveSearchIndex(2, 3, 'next')).toBe(0);
```

- [ ] **Step 2: 验证测试先失败**

Run: `pnpm exec vitest run src/components/search/global-search-model.test.ts`

Expected: FAIL，提示 `global-search-model` 不存在。

- [ ] **Step 3: 实现统一项目模型**

定义：

```ts
export type GlobalSearchItem = {
  id: string;
  kind: 'question' | 'topic' | 'page';
  label: string;
  description: string;
  href: string;
  badge: string;
  glyph: string;
};
```

导出 `QUESTION_TOPICS`、`SEARCH_PAGES`、`filterStaticSearchItems()`、`questionSearchItems()` 和 `moveSearchIndex()`。匹配使用标题、描述和关键词的小写包含判断；空查询返回限定数量的推荐专题与页面。

- [ ] **Step 4: 复用专题定义并验证**

将 `QuestionTopicGrid.tsx` 内部 `TOPICS` 替换为 `QUESTION_TOPICS`，避免首页卡片与搜索索引漂移。

Run: `pnpm exec vitest run src/components/search/global-search-model.test.ts`

Expected: PASS。

### Task 2: 建立全局状态与实时查询控制器

**Files:**
- Create: `apps/user-portal/src/components/search/GlobalSearchProvider.tsx`
- Create: `apps/user-portal/src/components/search/useGlobalSearchResults.ts`
- Modify: `apps/user-portal/src/components/UserShell.tsx`

- [ ] **Step 1: 实现 Provider Contract**

暴露稳定接口：

```ts
type GlobalSearchContextValue = {
  open: (query?: string, trigger?: HTMLElement | null) => void;
  close: () => void;
  setQuery: (query: string) => void;
  query: string;
  isOpen: boolean;
};
```

Provider 监听 `Ctrl+K` / `Cmd+K`，忽略 `Alt` 组合键；打开时保存触发元素，关闭后恢复焦点。对 `document.body.style.overflow` 做成对设置与恢复。

- [ ] **Step 2: 实现请求竞态保护**

`useGlobalSearchResults(query)` 在查询为空时仅返回静态推荐；非空查询延迟约 180ms 后调用：

```ts
getQuestionCatalog({ query, page: 1, pageSize: 6 })
```

使用递增请求序号，只接受最后一次响应。错误时保留静态结果并提供 `retry()`。

- [ ] **Step 3: 挂载全局 Provider**

在 `UserShell` 外层包裹 `GlobalSearchProvider`，保证首页、题库、档案、模拟、报告和设置页面都能使用快捷键。

- [ ] **Step 4: 类型检查**

Run: `pnpm typecheck`

Expected: PASS。

### Task 3: 构建命令面板并替换首页跳转搜索

**Files:**
- Create: `apps/user-portal/src/components/search/GlobalSearchDialog.tsx`
- Create: `apps/user-portal/src/components/search/GlobalSearchResults.tsx`
- Modify: `apps/user-portal/src/components/home/question-hub/QuestionSearchBar.tsx`

- [ ] **Step 1: 构建可访问命令面板**

面板使用：

```tsx
<div className="global-search-backdrop" role="presentation">
  <section role="dialog" aria-modal="true" aria-labelledby="global-search-title">
    <input role="combobox" aria-controls="global-search-results" />
    <div id="global-search-results" role="listbox">...</div>
  </section>
</div>
```

挂载后聚焦输入框。遮罩点击、`Escape` 关闭；`ArrowUp`、`ArrowDown` 调用 `moveSearchIndex()`；`Enter` 通过 Router 打开活动项目。

- [ ] **Step 2: 渲染真实分组状态**

`GlobalSearchResults` 按 `question/topic/page` 分组，题目显示标题、题型/难度与最多两个标签。实现加载提示、题目 API 错误重试、无结果和“进入完整题库”入口。

- [ ] **Step 3: 替换首页搜索行为**

移除 `QuestionSearchBar` 的 `useRouter()` 和提交跳转。输入聚焦或变更时调用：

```ts
search.open(value, event.currentTarget);
```

按钮文案改为“全局搜索”，同时显示 `Ctrl K` 键盘提示；提交只负责打开面板。

- [ ] **Step 4: 回归测试**

Run: `pnpm test`

Expected: User Portal 全量测试通过，题库筛选模型测试无回归。

### Task 4: 完成视觉、响应式与交付验证

**Files:**
- Create: `apps/user-portal/src/app/styles/global-search.css`
- Modify: `apps/user-portal/src/app/globals.css`
- Modify: `apps/user-portal/src/app/styles/question-hub-base.css`
- Modify: `apps/user-portal/src/app/styles/question-hub-states.css`

- [ ] **Step 1: 实现桌面视觉**

使用当前主题变量定义约 680px 的居中面板、分组标签、活动结果、键帽提示和底部状态栏。唯一强调元素是蓝色活动结果轨道，其余区域保持白色和低对比边线。

- [ ] **Step 2: 实现移动端与动效降级**

小于 640px 时面板贴近视口四周并限制内部滚动；确保底部移动导航不会遮挡结果。对 `[data-motion='off']` 去除遮罩和面板动画。

- [ ] **Step 3: 静态验证**

Run:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: 所有命令 exit 0；若标准构建再次被正在运行的 Prisma/Next 进程锁阻塞，记录环境锁并至少完成 User Portal 独立构建。

- [ ] **Step 4: 浏览器关键流**

验证：

1. `/home` 点击搜索框，URL 不变化且命令面板打开。
2. 输入 `Agent`，出现题目、专题和页面分组。
3. 上下键改变活动结果，Enter 仅在选择后导航。
4. 任意用户页面使用 `Ctrl+K` 打开，Esc 关闭并恢复焦点。
5. 375px 和桌面无横向溢出，控制台无相关错误。
