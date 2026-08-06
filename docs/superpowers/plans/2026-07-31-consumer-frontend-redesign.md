# C 端行动首页与消费级体验改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将用户端登录、全局外壳、首页和学习中心改造成以“今日下一步”为核心的消费级求职训练体验。

**Architecture:** 业务组件和数据请求保持不变，在现有组件边界内调整语义结构，并新增五个小型、末尾加载的页面级样式文件承载新视觉。这样可避免重写题库、认证和学习状态逻辑，也不影响管理端。

**Tech Stack:** Next.js 15、React 18、TypeScript、CSS、Vitest、Playwright

---

### Task 1: 消费级全局外壳

**Files:**
- Modify: `apps/user-portal/src/components/shell/UserSidebar.tsx`
- Modify: `apps/user-portal/src/components/search/GlobalSearchTrigger.tsx`
- Create: `apps/user-portal/src/app/styles/consumer-shell.css`
- Modify: `apps/user-portal/src/app/globals.css`
- Test: `apps/user-portal/src/components/shell/navigation-rendering.test.tsx`

- [x] **Step 1: 保留导航 pending 行为，将侧栏语义改成顶栏**

由 `UserShell` 提供语义化顶栏容器，桌面主导航收敛为“今天 / 刷题 / 学习 / 模拟面试 / 成长”，保持 `aria-current`、按需预取和 pending announcement。

- [x] **Step 2: 收敛搜索入口文案**

桌面入口显示“搜索题目、课程或功能”，移动端显示“搜索”，保留 `Ctrl K` 与原有 `onOpen`。

- [x] **Step 3: 新增顶栏与内容容器样式**

实现 72px 粘性顶栏、横向主导航、搜索胶囊、明亮账号区和 820px 以下底部导航切换。

- [x] **Step 4: 运行导航定向测试**

Run: `pnpm --filter @interview-agent/user-portal test -- src/components/shell/navigation-rendering.test.tsx src/components/shell/navigation.test.ts`

Expected: 两个测试文件全部通过。

### Task 2: 登录页行动预览

**Files:**
- Modify: `apps/user-portal/src/components/auth/AccessStory.tsx`
- Create: `apps/user-portal/src/components/auth/AccessStory.test.tsx`
- Create: `apps/user-portal/src/app/styles/consumer-auth.css`
- Modify: `apps/user-portal/src/app/globals.css`

- [x] **Step 1: 写结构回归测试**

断言服务端渲染包含“下一次面试”“今天的下一步”“连续训练”，并保留品牌链接。

- [x] **Step 2: 将功能清单改成今日任务预览**

输出价值主张、训练任务、预计时长、推荐依据与连续训练记录；不接入新数据源。

- [x] **Step 3: 实现明亮双栏登录布局**

桌面为 56/44 双栏，表单列最大宽度 420px；移动端表单优先并减少预览高度。

- [x] **Step 4: 运行认证组件测试**

Run: `pnpm --filter @interview-agent/user-portal test -- src/components/auth/AccessStory.test.tsx src/components/auth/access-mobile-layout.test.ts`

Expected: 新旧认证结构测试全部通过。

### Task 3: 首页“今日下一步”

**Files:**
- Create: `apps/user-portal/src/components/consumer/SplitRevealText.tsx`
- Create: `apps/user-portal/src/components/consumer/SignalField.tsx`
- Create: `apps/user-portal/src/components/consumer/ActionLabel.tsx`
- Create: `apps/user-portal/src/components/consumer/consumer-primitives.test.tsx`
- Modify: `apps/user-portal/src/components/home/question-hub/HomeWelcome.tsx`
- Modify: `apps/user-portal/src/components/home/question-hub/AgentRecommendationRail.tsx`
- Modify: `apps/user-portal/src/components/home/question-hub/TrainingContinuationCard.tsx`
- Create: `apps/user-portal/src/app/styles/consumer-motion.css`
- Create: `apps/user-portal/src/app/styles/consumer-home.css`
- Modify: `apps/user-portal/src/app/globals.css`
- Test: `apps/user-portal/src/components/home/question-hub/HomeWelcome.test.tsx`
- Test: `apps/user-portal/src/components/home/question-hub/AgentRecommendationRail.test.tsx`

- [x] **Step 1: 新增三类产品化动效原语与结构测试**

实现字符错峰标题、Agent 信号纹理和推进式操作标签。断言完整可访问文本存在、纹理为 `aria-hidden`、busy 文案和普通文案均可渲染。

- [x] **Step 2: 保留测试依赖文案并补充行动语义**

保留“今天的训练计划”“陪练已就位”，用问候语和结果导向标题明确今日唯一优先训练方向。

- [x] **Step 3: 重排推荐与继续训练卡**

主操作保持现有 `onStart` 或 `href`，推荐理由降为证据行，自主组题保留为次操作。

- [x] **Step 4: 实现主任务卡、信号纹理与内容节奏**

主卡使用深墨色背景、珊瑚主按钮和单一轨道圆弧；搜索、题库专题和快速发现使用更轻的内容卡。

- [x] **Step 5: 运行首页与动效原语测试**

Run: `pnpm --filter @interview-agent/user-portal test -- src/components/consumer/consumer-primitives.test.tsx src/components/home/question-hub/HomeWelcome.test.tsx src/components/home/question-hub/AgentRecommendationRail.test.tsx src/components/home/question-hub/TrainingContinuationCard.test.tsx`

Expected: 首页渲染、继续训练和推荐开始测试全部通过。

### Task 4: 学习中心阅读体验

**Files:**
- Modify: `apps/user-portal/src/components/learning/LearningCenter.tsx`
- Modify: `apps/user-portal/src/components/learning/LearningLibraryRail.tsx`
- Create: `apps/user-portal/src/app/styles/consumer-learning.css`
- Modify: `apps/user-portal/src/app/globals.css`
- Test: `apps/user-portal/src/components/learning/LearningCenter.test.tsx`

- [x] **Step 1: 保留资料架测试契约并强化学习语义**

保留“资料架”，将 `LEARNING PATH` 改为“你的学习路线”，将阅读头部改成课程上下文。

- [x] **Step 2: 实现路线、正文与目录的消费级布局**

正文宽度限制为 760px；路线使用进度和课程节点；目录保持辅助层级。移动端课程节点横向滚动。

- [x] **Step 3: 运行学习中心测试**

Run: `pnpm --filter @interview-agent/user-portal test -- src/components/learning/LearningCenter.test.tsx src/components/learning/LearningCourseActions.test.tsx`

Expected: 阅读、课程动作和进度结构测试全部通过。

### Task 5: 集成验证与视觉检查

**Files:**
- Verify: `apps/user-portal/src/**/*`

- [x] **Step 1: 运行完整用户端验证**

Run: `pnpm --filter @interview-agent/user-portal test`

Run: `pnpm --filter @interview-agent/user-portal lint`

Run: `pnpm --filter @interview-agent/user-portal typecheck`

Run: `pnpm --filter @interview-agent/user-portal build`

Expected: 四条命令退出码均为 0。

- [x] **Step 2: 检查桌面和移动截图**

用 Playwright 分别以 1440×1000 和 390×844 检查登录页；以 development auth 模式检查首页与学习中心，确认无横向溢出、无遮挡主操作、导航当前态正确。

- [x] **Step 3: 审查改动边界**

Run: `git diff --check`

Run: `git status --short`

Expected: 没有空白错误；仅出现本任务文件和用户原有改动。
