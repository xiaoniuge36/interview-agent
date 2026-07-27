# 模型连接就绪度与设置中心 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让用户准确理解默认模型是否可用于训练，并在设置中心获得就近、可信的下一步。

**Architecture:** 新增纯 `model-connection-readiness` 模型，只读取 `ModelCredentialView[]` 并输出空、需处理或已就绪状态。`ModelReadinessBanner` 消费该模型，`ModelConnectionsPanel` 只传入已有数据与新增编辑器回调；连接卡既有测试、更新和删除请求保持不变。现有 811 行 `settings.css` 保留为导入入口，具体规则按 shell、模型检查/编辑、连接卡和用量拆入四个局部样式文件。

**Tech Stack:** Next.js 15、React 18、TypeScript、CSS、Vitest。

## Global Constraints

- 不修改 API、合同、数据库、加密、API Key 生命周期、模型连接测试请求、默认模型写入或训练调用链。
- 仅以 `ModelCredentialView.isDefault` 和 `status === 'verified'` 判定默认模型是否可用于 AI 任务。
- 不显示 API Key、完整请求、提示词、回答正文、模型正文或虚构用量。
- CSS 仅使用现有主题 token 与 `color-mix()`；`settings-shell.css`、`settings-models.css`、`settings-connection-cards.css`、`settings-usage.css` 均不超过 300 行。
- 移动端、焦点可见性和 reduced motion 行为必须保留。

---

### Task 1: 建立默认模型就绪度的纯派生状态

**Files:**

- Create: `apps/user-portal/src/components/settings/model-connection-readiness.ts`
- Create: `apps/user-portal/src/components/settings/model-connection-readiness.test.ts`

**Interfaces:**

- Consumes: `ModelCredentialView[]`。
- Produces: `modelConnectionReadiness(credentials)`，返回 `{ kind: 'empty' | 'ready' | 'needs_action'; defaultCredential: ModelCredentialView | null }`。

- [x] **Step 1: 写出四种就绪状态的失败用例**

```ts
const credential = (overrides: Partial<ModelCredentialView> = {}): ModelCredentialView => ({
  id: 'credential-1',
  provider: 'deepseek',
  model: 'deepseek-chat',
  baseUrl: null,
  keyHint: '…abcd',
  status: 'verified',
  isDefault: true,
  lastTestedAt: '2026-07-23T00:00:00.000Z',
  lastErrorCode: null,
  updatedAt: '2026-07-23T00:00:00.000Z',
  ...overrides,
});

const verifiedDefault = credential();
const failedDefault = credential({ status: 'failed', lastErrorCode: 'MODEL_UNAVAILABLE' });
const verifiedNonDefault = credential({ isDefault: false });

expect(modelConnectionReadiness([])).toMatchObject({ kind: 'empty', defaultCredential: null });
expect(modelConnectionReadiness([verifiedDefault])).toMatchObject({
  kind: 'ready',
  defaultCredential: verifiedDefault,
});
expect(modelConnectionReadiness([failedDefault])).toMatchObject({ kind: 'needs_action' });
expect(modelConnectionReadiness([verifiedNonDefault])).toMatchObject({ kind: 'needs_action' });
```

- [x] **Step 2: 运行模型测试确认派生函数尚不存在**

Run: `pnpm --filter @interview-agent/user-portal test -- model-connection-readiness.test.ts`

Expected: FAIL，提示 `modelConnectionReadiness` 未导出。

- [x] **Step 3: 实现只读就绪度派生**

```ts
export function modelConnectionReadiness(credentials: ModelCredentialView[]) {
  const defaultCredential = credentials.find((credential) => credential.isDefault) ?? null;
  if (credentials.length === 0) return { kind: 'empty', defaultCredential: null } as const;
  if (defaultCredential?.status === 'verified')
    return { kind: 'ready', defaultCredential } as const;
  return { kind: 'needs_action', defaultCredential } as const;
}
```

- [x] **Step 4: 重新运行模型测试**

Run: `pnpm --filter @interview-agent/user-portal test -- model-connection-readiness.test.ts`

Expected: PASS，所有状态仅由已有连接视图推导。

### Task 2: 在连接列表前呈现训练前检查章

**Files:**

- Create: `apps/user-portal/src/components/settings/ModelReadinessBanner.tsx`
- Create: `apps/user-portal/src/components/settings/ModelReadinessBanner.test.tsx`
- Modify: `apps/user-portal/src/components/settings/ModelConnectionsPanel.tsx`

**Interfaces:**

- Consumes: `ModelCredentialView[]`、`modelConnectionReadiness(credentials)` 与已有 `onAdd` 回调。
- Produces: `ModelReadinessBanner({ credentials, onAdd })`；只渲染当前状态或打开既有新增编辑器。

- [x] **Step 1: 写入检查章静态渲染断言**

```tsx
const verifiedDefault = credential({ status: 'verified', isDefault: true });
const failedDefault = credential({ status: 'failed', isDefault: true });

expect(emptyMarkup).toContain('还没有可用的默认模型');
expect(emptyMarkup).toContain('添加模型连接');
expect(readyMarkup).toContain('默认模型已就绪');
expect(readyMarkup).toContain('可用于 AI 评价和模拟面试');
expect(needsActionMarkup).toContain('还需要完成一项检查');
```

- [x] **Step 2: 运行组件测试确认检查章尚不存在**

Run: `pnpm --filter @interview-agent/user-portal test -- ModelReadinessBanner.test.tsx`

Expected: FAIL，提示 `ModelReadinessBanner` 未找到。

- [x] **Step 3: 创建检查章并接入模型连接面板**

```tsx
type ReadinessBannerProps = {
  state: 'empty' | 'ready' | 'needs_action';
  credential?: ModelCredentialView | null;
  onAdd: () => void;
};

function ReadinessBanner({ state, credential, onAdd }: ReadinessBannerProps) {
  if (state === 'empty') {
    return (
      <section className="model-readiness-banner" data-state={state}>
        <strong>还没有可用的默认模型</strong>
        <p>添加并测试一条模型连接后，才可以开始 AI 评价和模拟面试。</p>
        <button className="button" type="button" onClick={onAdd}>
          添加模型连接
        </button>
      </section>
    );
  }
  if (state === 'ready') {
    return (
      <section className="model-readiness-banner" data-state={state}>
        <strong>默认模型已就绪</strong>
        <p>{credential?.model} 可用于 AI 评价和模拟面试。</p>
      </section>
    );
  }
  return (
    <section className="model-readiness-banner" data-state={state}>
      <strong>还需要完成一项检查</strong>
      <p>请在连接卡中测试默认模型，或在编辑器中设定默认模型。</p>
    </section>
  );
}

export function ModelReadinessBanner({ credentials, onAdd }: Props) {
  const readiness = modelConnectionReadiness(credentials);
  if (readiness.kind === 'empty') {
    return <ReadinessBanner state="empty" onAdd={onAdd} />;
  }
  return (
    <ReadinessBanner
      state={readiness.kind}
      credential={readiness.defaultCredential}
      onAdd={onAdd}
    />
  );
}
```

在 `ModelConnectionsPanel` 的标题之后、编辑器与列表之前渲染检查章；`onAdd` 必须调用原有 `setEditor(newEditor())`，不提前创建或测试凭证。

- [x] **Step 4: 重新运行检查章与表单模型测试**

Run: `pnpm --filter @interview-agent/user-portal test -- ModelReadinessBanner.test.tsx model-connection-form.test.ts`

Expected: PASS，新增检查章不改变现有表单校验。

### Task 3: 提升连接卡与保存后的下一步层级

**Files:**

- Create: `apps/user-portal/src/components/settings/ModelCredentialCard.test.tsx`
- Modify: `apps/user-portal/src/components/settings/ModelCredentialCard.tsx`
- Modify: `apps/user-portal/src/components/settings/ModelConnectionsPanel.tsx`

**Interfaces:**

- Consumes: `ModelCredentialView.status`、`isDefault`、`lastTestedAt`、`lastErrorCode` 和现有卡片回调。
- Produces: 具有 `data-status` 的卡片、需要测试时突出的既有测试按钮，以及保存后准确的下一步状态文案。

- [x] **Step 1: 写入卡片状态与动作层级断言**

```tsx
const failedCredential = credential({ status: 'failed', lastErrorCode: 'MODEL_UNAVAILABLE' });
const verifiedCredential = credential({ status: 'verified', isDefault: true });

expect(failedMarkup).toContain('data-status="failed"');
expect(failedMarkup).toContain('测试连接');
expect(failedMarkup).toContain('需要重新测试后才能用于 Agent 任务');
expect(verifiedMarkup).toContain('默认模型');
expect(verifiedMarkup).toContain('连接正常');
```

- [x] **Step 2: 运行卡片测试确认状态语义尚不存在**

Run: `pnpm --filter @interview-agent/user-portal test -- ModelCredentialCard.test.tsx`

Expected: FAIL，缺少 `data-status` 或失败后的下一步说明。

- [x] **Step 3: 只调整卡片呈现，不改请求时机**

```tsx
<article className="credential-card" data-status={credential.status}>
  <CredentialHeader credential={credential} onEdit={onEdit} busy={busy} />
  <CredentialFacts credential={credential} />
  <CredentialActions onEdit={onEdit} onRemove={remove} onTest={test} busy={busy} />
  {credential.status !== 'verified' ? <p>需要重新测试后才能用于 Agent 任务。</p> : null}
</article>
```

将 `连接测试` 在 `unverified`、`failed`、`disabled` 状态下使用主操作样式；已验证连接保持次级测试入口。保存后提示“下一步：测试这条连接”，但不自动发起测试。

- [x] **Step 4: 运行卡片、检查章与表单测试**

Run: `pnpm --filter @interview-agent/user-portal test -- ModelCredentialCard.test.tsx ModelReadinessBanner.test.tsx model-connection-form.test.ts`

Expected: PASS，卡片仍只显示脱敏密钥且原有测试/删除交互未改变。

### Task 4: 按职责拆分设置样式并完成验证

**Files:**

- Modify: `apps/user-portal/src/app/styles/settings.css`
- Create: `apps/user-portal/src/app/styles/settings-shell.css`
- Create: `apps/user-portal/src/app/styles/settings-models.css`
- Create: `apps/user-portal/src/app/styles/settings-connection-cards.css`
- Create: `apps/user-portal/src/app/styles/settings-usage.css`

**Interfaces:**

- Consumes: 设置页、检查章、连接卡、编辑器和用量摘要的现有及新增 CSS 类。
- Produces: 保留为导入入口的 `settings.css`，并以 shell、模型检查/编辑、连接卡、用量四个职责明确的主题自适应样式文件替代 811 行的单文件样式。

- [x] **Step 1: 将设置样式入口改为四份职责明确的导入**

```css
@import './settings-shell.css';
@import './settings-models.css';
@import './settings-connection-cards.css';
@import './settings-usage.css';
```

- [x] **Step 2: 在连接样式中建立检查章与状态层级**

```css
.model-readiness-banner[data-state='ready'] {
  border-color: color-mix(in srgb, var(--success) 34%, var(--outline));
  background: var(--success-soft);
}

.credential-card[data-status='failed'] .connection-action:first-child {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--surface);
}
```

将现有设置样式迁移到四份文件：页面标题、选项卡、账户区和移动端 shell 进入 `settings-shell.css`；检查章、连接编辑器与安全说明进入 `settings-models.css`；连接列表、状态、事实和动作进入 `settings-connection-cards.css`；用量摘要及其时间筛选和移动端指标进入 `settings-usage.css`。每份文件只使用主题 token 或 `color-mix()`，并保持 760px 以下的可触达布局。

- [x] **Step 3: 运行定向测试、格式与用户端静态检查**

Run: `pnpm --filter @interview-agent/user-portal test -- model-connection-readiness.test.ts ModelReadinessBanner.test.tsx ModelCredentialCard.test.tsx model-connection-form.test.ts && pnpm --filter @interview-agent/user-portal lint && pnpm --filter @interview-agent/user-portal typecheck`

Expected: 所有测试通过，lint 与 typecheck 均 exit 0。

- [x] **Step 4: 运行生产构建与差异检查**

Run: `pnpm --filter @interview-agent/user-portal build && git diff --check`

Expected: 两条命令均 exit 0，改动只涉及用户端设置、设计和计划文档。
