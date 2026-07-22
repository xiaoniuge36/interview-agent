# 登录加载反馈设计

## 目标

后台管理端在恢复登录会话和校验角色期间不能出现白屏；用户端在同一阶段应保持明确、可访问的登录进度反馈。

## 现状与根因

- `AdminAccess` 在 `auth.status === 'loading'` 时仅返回空的 `main.admin-access-bootstrap`，用户会看到一段没有内容的白色页面。
- 用户端已有未提交的 `AuthTransitionScreen` 重设计，提供品牌、说明与三步进度，视觉结果与提供的参考图一致。

## 方案

新增后台专用的 `AdminAuthTransition` 组件。`AdminAccess` 的 loading 分支渲染该组件，而认证、登出、角色授权和跳转逻辑保持不变。该组件用后台现有的深色治理视觉语言展示“正在验证后台登录状态”、当前操作和加载图标；使用 `role=status`、`aria-live=polite` 与 `aria-busy=true` 提供无障碍状态。

用户端不改动现有未提交实现，只验证其认证 loading 状态仍会渲染 `AuthTransitionScreen`。

## 边界与风险

- 不修改 `@interview-agent/auth-client`、OIDC 流程、角色集合或接口。
- 不覆盖用户工作区中已有的用户端 Loading、图标变更。
- 当认证完成后，后台仍直接进入有权限的控制台；无权限账号仍按原行为登出并显示登录入口。

## 验证

1. 服务端静态渲染测试断言后台 loading 页面含状态语义、标题和当前操作说明。
2. 运行后台与用户端认证过渡相关的 Vitest 测试。
3. 运行两个受影响应用的 TypeScript 检查和 ESLint。
