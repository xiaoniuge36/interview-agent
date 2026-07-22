# 登录加载反馈 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在后台认证恢复期间显示可访问的登录过渡页，并保留用户端现有的三步 Loading 体验。

**Architecture:** 将后台加载画面提取为独立的展示组件，由 `AdminAccess` 仅在认证状态为 `loading` 时引用。认证与授权逻辑保持原样；用户端只进行回归验证，不改动其未提交文件。

**Tech Stack:** Next.js 15、React 18、TypeScript、Ant Design Icons、Vitest、CSS。

## 执行收尾（2026-07-22）

- 后台认证过渡组件与接入已实现；`AdminAuthTransition`、`AdminAccess` 测试以及后台 typecheck、lint 和生产构建通过。
- 前台认证过渡测试也已通过，保持既有身份恢复语义。

## Global Constraints

- 不修改认证客户端、角色规则、API、依赖或根配置。
- 不修改用户端工作区中已有的 Loading 与图标改动。
- 后台 Loading 画面必须具有 `role="status"`、`aria-live="polite"` 与 `aria-busy="true"`。

---

### Task 1: 后台认证过渡组件

**Files:**

- Create: `apps/admin-console/src/components/auth/AdminAuthTransition.tsx`
- Create: `apps/admin-console/src/components/auth/AdminAuthTransition.test.tsx`
- Create: `apps/admin-console/src/app/styles/admin-auth-transition.css`
- Modify: `apps/admin-console/src/components/auth/AdminAccess.tsx:4,36`
- Modify: `apps/admin-console/src/components/auth/AdminAccess.test.ts`
- Modify: `apps/admin-console/src/app/globals.css:12`

**Interfaces:**

- Consumes: `AdminAccess` 在 `auth.status === 'loading'` 时的渲染分支。
- Produces: 无 props 的 `AdminAuthTransition`，用于呈现后台认证恢复状态。

- [ ] **Step 1: 写入失败测试**

```tsx
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminAuthTransition } from './AdminAuthTransition';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('AdminAuthTransition', () => {
  it('在认证恢复时提供可访问的后台登录状态', () => {
    const html = renderToStaticMarkup(<AdminAuthTransition />);

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('正在验证后台登录状态');
    expect(html).toContain('正在恢复安全会话');
  });
});
```

并在 `AdminAccess.test.ts` 中模拟 `{ mode: 'local', status: 'loading' }`，静态渲染 `AdminAccess` 并断言其包含“正在验证后台登录状态”且不包含受保护子树文字。

- [ ] **Step 2: 运行测试，确认组件尚不存在**

Run: `pnpm --filter @interview-agent/admin-console test -- AdminAuthTransition.test.tsx`
Expected: FAIL，提示找不到 `./AdminAuthTransition`。

- [ ] **Step 3: 实现最小组件与样式，并接入 loading 分支**

```tsx
// apps/admin-console/src/components/auth/AdminAuthTransition.tsx
import { LoadingOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

export function AdminAuthTransition() {
  return (
    <main className="admin-auth-transition" role="status" aria-live="polite" aria-busy="true">
      <section className="admin-auth-transition-card" aria-labelledby="admin-auth-transition-title">
        <div className="admin-auth-transition-brand">
          <SafetyCertificateOutlined aria-hidden="true" />
          <span>INTERVIEW AGENT · GOVERNANCE</span>
        </div>
        <h1 id="admin-auth-transition-title">正在验证后台登录状态</h1>
        <p>正在恢复安全会话与治理权限，请稍候。</p>
        <div className="admin-auth-transition-progress">
          <LoadingOutlined aria-hidden="true" spin />
          <span>正在恢复安全会话</span>
        </div>
      </section>
    </main>
  );
}
```

```tsx
// apps/admin-console/src/components/auth/AdminAccess.tsx
import { AdminAuthTransition } from './AdminAuthTransition';

if (auth.status === 'loading') return <AdminAuthTransition />;
```

```css
/* apps/admin-console/src/app/styles/admin-auth-transition.css */
.admin-auth-transition {
  display: grid;
  min-height: 100svh;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.15), transparent 42%),
    linear-gradient(145deg, #102338, #08111c);
}

.admin-auth-transition-card {
  display: grid;
  width: min(440px, 100%);
  gap: 16px;
  border: 1px solid rgba(147, 197, 253, 0.26);
  border-radius: 20px;
  padding: 36px;
  background: rgba(9, 25, 43, 0.88);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.28);
}

.admin-auth-transition-brand,
.admin-auth-transition-progress {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  color: #9ac9ff;
}

.admin-auth-transition-brand {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.admin-auth-transition-card h1 {
  margin: 4px 0 0;
  color: #f8fbff;
  font-size: clamp(28px, 5vw, 36px);
  letter-spacing: -0.045em;
  line-height: 1.15;
}

.admin-auth-transition-card > p {
  margin: 0;
  color: #c7d5e7;
  font-size: 14px;
  line-height: 1.7;
}

.admin-auth-transition-progress {
  margin-top: 8px;
  border-top: 1px solid rgba(147, 197, 253, 0.2);
  padding-top: 18px;
  color: #dbeeff;
  font-size: 13px;
}

.admin-auth-transition-progress .anticon {
  color: #93c5fd;
  font-size: 18px;
}

@media (max-width: 480px) {
  .admin-auth-transition {
    padding: 18px;
  }

  .admin-auth-transition-card {
    padding: 28px 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .admin-auth-transition-progress .anticon-loading {
    animation: none;
  }
}
```

在 `apps/admin-console/src/app/globals.css` 的 `admin-access.css` 后添加：

```css
@import './styles/admin-auth-transition.css';
```

- [ ] **Step 4: 运行定向测试**

Run: `pnpm --filter @interview-agent/admin-console test -- AdminAuthTransition.test.tsx`
Expected: PASS，1 个测试通过。

- [ ] **Step 5: 检查格式化与限定文件 diff**

Run: `pnpm exec prettier --check apps/admin-console/src/components/auth/AdminAuthTransition.tsx apps/admin-console/src/components/auth/AdminAuthTransition.test.tsx apps/admin-console/src/components/auth/AdminAccess.tsx apps/admin-console/src/app/styles/admin-auth-transition.css apps/admin-console/src/app/globals.css`
Expected: 所有指定文件格式正确。

### Task 2: 前台 Loading 回归验证与应用级检查

**Files:**

- Test: `apps/user-portal/src/components/auth/auth-transition.test.tsx`
- Test: `apps/admin-console/src/components/auth/AdminAuthTransition.test.tsx`

**Interfaces:**

- Consumes: 用户端 `RequireAuth` 的 loading 分支和后台 `AdminAuthTransition`。
- Produces: 两端认证 loading 反馈均受自动化测试覆盖。

- [ ] **Step 1: 运行认证过渡测试**

Run: `pnpm --filter @interview-agent/admin-console test -- AdminAuthTransition.test.tsx && pnpm --filter @interview-agent/user-portal test -- auth-transition.test.tsx`
Expected: 两个测试命令均以 exit code 0 结束。

- [ ] **Step 2: 运行受影响应用的静态检查**

Run: `pnpm --filter @interview-agent/admin-console typecheck && pnpm --filter @interview-agent/admin-console lint && pnpm --filter @interview-agent/user-portal typecheck && pnpm --filter @interview-agent/user-portal lint`
Expected: 四个命令均以 exit code 0 结束。

- [ ] **Step 3: 复核变更范围**

Run: `git diff --check && git status --short`
Expected: 无空白错误；仅新增后台过渡页相关文件，用户端既有改动保持不变。
