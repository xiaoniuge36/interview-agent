# 模拟面试回答草稿恢复设计

**日期：** 2026-07-23  
**状态：** 已批准，可实施

## 目标

用户在模拟面试中输入的未提交回答，在同一浏览器标签页刷新或短暂离开后能够恢复；回答提交成功后立即清除草稿。

## 存储与隐私

- 使用 `sessionStorage`，不使用长期 `localStorage`。
- 按 `sessionId` 隔离草稿，避免不同面试互相覆盖。
- 空白草稿不保存；提交成功后删除；关闭标签页由浏览器自动清理。
- 不上传草稿、不写 Product API、不进入报告或审计。

## 数据流

1. 打开 `/interview?session=<id>` 时，根据 query 中的 session id 读取草稿。
2. 有草稿且当前内存草稿为空时，dispatch `draft` 并显示“已恢复未提交回答”通知。
3. 用户每次编辑时同步更新该 session 的 `sessionStorage`。
4. `answerInterviewStream` 成功返回后，先删除该 session 草稿，再清空内存草稿。
5. 提交失败时不删除，用户可以继续修改或重试。

## 边界

- 新面试尚未拿到 session id 前不保存。
- 恢复接口失败不影响草稿读取；服务端会话最终不可恢复时，草稿仍只留在本标签页，不自动发送。
- 不修改共享契约、Prisma schema、迁移、依赖或根配置。

## 验证

- 存储 helper：session 隔离、空白删除、读取、提交后清除、无浏览器环境安全返回。
- 控制器：恢复 effect、编辑写入、成功清除、失败保留通过类型与现有流测试回归。
- User Portal 完整 Vitest、ESLint、TypeScript、Next.js build、Prettier、`git diff --check`。
