# 个人档案 Agent 记忆透镜 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让个人档案页明确说明当前资料如何被 Agent 采纳，并如何改变下一轮推荐、追问和复盘。

**Architecture:** 扩展本地 `ProfileMemoryModel`，从既有 `ProfilePayload` 纯计算已采纳信号、待补齐项和训练影响文案；`ProfileMemoryRail` 只消费该模型并保留现有表单、保存回调和岗位链接。`profile.css` 使用现有主题 token 重写固定色并补齐窄屏布局。

**Tech Stack:** Next.js 15、React 18、TypeScript、CSS、Vitest。

## Global Constraints

- 不修改档案 API、输入合同、保存逻辑、推荐算法、路由、认证、主题存储或依赖。
- 仅从当前 `ProfilePayload` 派生展示模型，不增加请求、持久化字段或异步状态。
- 保留现有表单字段、校验、保存通知、`aria-live` 状态和 `/job` 跳转。
- `profile.css` 不保留硬编码十六进制颜色；只能使用既有主题 token 和 `color-mix()`。
- 在共享脏工作树中不创建分支、stage、commit、push、reset 或覆盖无关改动。

---

### Task 1: 为训练影响建立纯模型与静态回归测试

**Files:**

- Modify: `apps/user-portal/src/components/profile/profile-memory-model.ts`
- Modify: `apps/user-portal/src/components/profile/profile-memory-model.test.ts`
- Create: `apps/user-portal/src/components/profile/ProfileMemoryRail.test.tsx`

**Interfaces:**

- Consumes: 既有 `ProfilePayload`、`profile.targetRole`、`techStacks`、`resumeSummary`、`projectExperiences`、`currentLevel` 与 `snapshot`。
- Produces: `ProfileMemoryModel` 新增 `acceptedSignals: string[]`、`nextSteps: string[]` 和 `trainingImpact: string`，供纯展示组件使用。

- [x] **Step 1: 为空、部分和完整档案写失败断言**

```ts
expect(createProfileMemoryModel(EMPTY_PROFILE)).toMatchObject({
  acceptedSignals: [],
  nextSteps: ['填写目标岗位，让 Agent 能够匹配训练方向'],
});

expect(createProfileMemoryModel(partialProfile()).nextSteps).toContain(
  '补充代表项目，让 Agent 能围绕细节继续追问',
);

expect(createProfileMemoryModel(populatedProfile())).toMatchObject({
  acceptedSignals: [
    '目标岗位：高级产品经理',
    '核心技能：数据分析',
    '项目经历：1 项',
    '当前水平：高级',
  ],
  nextSteps: ['档案输入已覆盖当前训练重点'],
});
```

新建静态渲染测试，分别传入空档案和完整档案，断言可见“Agent 已采纳的训练信号”“下一步补齐”“下一轮训练会如何变化？”及 `/job` 链接。

- [x] **Step 2: 运行测试，确认新展示模型尚不存在**

Run: `pnpm --filter @interview-agent/user-portal test -- profile-memory-model.test.ts ProfileMemoryRail.test.tsx`

Expected: FAIL，提示 `acceptedSignals`、`nextSteps`、`trainingImpact` 或新的透镜语义缺失。

- [x] **Step 3: 以纯函数补充档案训练信号**

```ts
export type ProfileMemoryModel = {
  completion: number;
  role: string;
  evidence: string[];
  focus: string[];
  acceptedSignals: string[];
  nextSteps: string[];
  trainingImpact: string;
};

function trainingSignals(profile: ProfilePayload['profile']) {
  if (!profile)
    return {
      acceptedSignals: [],
      nextSteps: ['填写目标岗位，让 Agent 能够匹配训练方向'],
      trainingImpact: '完成档案后，Agent 会按目标岗位、经历和能力线索调整下一轮训练。',
    };

  const acceptedSignals = [
    `目标岗位：${profile.targetRole}`,
    profile.techStacks.length ? `核心技能：${profile.techStacks.slice(0, 3).join('、')}` : '',
    profile.projectExperiences.length ? `项目经历：${profile.projectExperiences.length} 项` : '',
    profile.currentLevel ? `当前水平：${profile.currentLevel}` : '',
  ].filter(Boolean);
  const nextSteps = [
    !profile.resumeSummary && '补充个人概述，让 Agent 理解你的代表能力',
    !profile.projectExperiences.length && '补充代表项目，让 Agent 能围绕细节继续追问',
  ].filter(Boolean);

  return {
    acceptedSignals,
    nextSteps: nextSteps.length ? nextSteps : ['档案输入已覆盖当前训练重点'],
    trainingImpact: `Agent 会优先围绕${profile.targetRole}推荐题目、设计项目追问，并在复盘中结合已记录的能力线索。`,
  };
}
```

将 `trainingSignals(profile)` 的结果合并进空档案和已有档案的返回对象；不改变既有完整度、优势证据和待练习项的计算。

- [x] **Step 4: 重构透镜的静态展示，并运行定向测试**

```tsx
<SignalList title="Agent 已采纳的训练信号" items={memory.acceptedSignals} empty="保存档案后，信号会显示在这里。" />
<MemoryList title="下一轮优先补强" tone="warning" items={memory.focus} />
<section className="profile-memory-impact">
  <strong>下一轮训练会如何变化？</strong>
  <p>{memory.trainingImpact}</p>
  <SignalList title="下一步补齐" items={memory.nextSteps} />
  <Link className="button secondary" href="/job">继续完善目标岗位 <span aria-hidden="true">›</span></Link>
</section>
```

把透镜标题改为“Agent 记忆透镜”，保留完整度和已有优势证据。新 `SignalList` 只负责可访问的标题、列表和空态文本；不触碰 `ProfilePanel`、`useProfileForm` 或 `WorkspaceGate`。

Run: `pnpm --filter @interview-agent/user-portal test -- profile-memory-model.test.ts ProfileMemoryRail.test.tsx`

Expected: PASS，空、部分和完整档案均有确定的下一步和训练影响说明。

### Task 2: 以主题 token 打磨档案页与响应式透镜布局

**Files:**

- Modify: `apps/user-portal/src/components/profile/ProfilePageContent.tsx`
- Modify: `apps/user-portal/src/components/profile/ProfilePanel.tsx`
- Modify: `apps/user-portal/src/app/styles/profile.css`

**Interfaces:**

- Consumes: 既有 `ProfilePanel`、`ProfileMemoryRail`、`ProfilePayload` 与全局主题 token。
- Produces: 表单优先、Agent 影响可扫读且适配主题和窄屏的档案页；保存逻辑及链接不变。

- [x] **Step 1: 将页面与表单文案收束为训练画像输入**

```tsx
<PageIntro
  eyebrow="训练画像输入"
  title="让下一轮训练更贴近你"
  copy="填写会影响推荐题、项目追问和复盘建议的真实经历；保存后 Agent 会立即更新可用线索。"
  next={{ href: '/job', label: '继续完善目标岗位' }}
/>
```

将 `ProfilePanel` 的 eyebrow 改为“给 Agent 的训练线索”，标题改为“能力与项目证据”，并把说明限定为推荐题、追问和复盘三个用户可感知结果。保持表单字段、`controller.submit`、禁用状态和 `profile-status` 不变。

- [x] **Step 2: 以主题 token 替换固定色，并增加透镜层级**

```css
.profile-memory-rail {
  border-color: color-mix(in srgb, var(--primary) 18%, var(--outline));
  background: color-mix(in srgb, var(--surface) 94%, var(--primary-soft));
  box-shadow: 0 12px 30px color-mix(in srgb, var(--ink) 7%, transparent);
}

.profile-memory-signals {
  padding: 19px 20px;
  border-bottom: 1px solid var(--outline);
  background: color-mix(in srgb, var(--primary-soft) 42%, var(--surface));
}

.profile-memory-signals li::before {
  background: var(--primary);
}
```

将 `#fbfcfe`、`#ffffff`、`#e8edf5`、蓝色进度渐变、`#5b687d`、`#f59e0b` 和 `#fbfcff` 分别替换为 `--surface*`、`--primary*`、`--text-muted`、`--warning` 与 `color-mix()`。进度条使用 `linear-gradient(90deg, var(--primary), var(--success))`。新增信号列表的文字与空态规则，但不改变全局 `.button`、`.panel` 或 `.label`。

- [x] **Step 3: 补齐窄屏操作与减少动画语义**

```css
@media (max-width: 820px) {
  .profile-memory-rail,
  .profile-memory-impact .button {
    width: 100%;
  }

  .profile-memory-signals li {
    line-height: 1.55;
  }
}
```

保留现有 1180px 单列切换；小于 820px 时保存按钮与“继续完善目标岗位”都占满宽度。无需新增动画，沿用全局减少动画策略。

- [x] **Step 4: 执行主题与格式审计**

Run: `rg -n "#[0-9a-fA-F]{3,8}" apps/user-portal/src/app/styles/profile.css`

Expected: 无输出。

Run: `pnpm exec prettier --check apps/user-portal/src/components/profile/profile-memory-model.ts apps/user-portal/src/components/profile/profile-memory-model.test.ts apps/user-portal/src/components/profile/ProfileMemoryRail.tsx apps/user-portal/src/components/profile/ProfileMemoryRail.test.tsx apps/user-portal/src/components/profile/ProfilePageContent.tsx apps/user-portal/src/components/profile/ProfilePanel.tsx apps/user-portal/src/app/styles/profile.css`

Expected: 所有目标文件格式正确。

### Task 3: 用户端集成验证

**Files:**

- Test: `apps/user-portal/src/components/profile/profile-memory-model.test.ts`
- Test: `apps/user-portal/src/components/profile/ProfileMemoryRail.test.tsx`

**Interfaces:**

- Consumes: 已采纳信号、下一步补齐、训练影响和主题派生样式。
- Produces: 档案页的可读 Agent 训练影响入口，不改变档案提交链路。

- [x] **Step 1: 运行档案定向回归测试**

Run: `pnpm --filter @interview-agent/user-portal test -- profile-memory-model.test.ts ProfileMemoryRail.test.tsx`

Expected: PASS。

- [x] **Step 2: 运行用户端应用检查**

Run: `pnpm --filter @interview-agent/user-portal typecheck`

Run: `pnpm --filter @interview-agent/user-portal lint`

Run: `pnpm --filter @interview-agent/user-portal build`

Run: `git diff --check`

Expected: 所有命令 exit 0；改动仅限用户端档案体验和本次规格、计划文档。
