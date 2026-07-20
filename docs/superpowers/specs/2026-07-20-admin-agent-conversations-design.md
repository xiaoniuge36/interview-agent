# 管理端 AI 助手多会话设计

## 目标

将现有的单一上下文助手升级为账号级的多会话工作区，支持新建、切换、搜索、重命名、删除和刷新后恢复，同时保留现有只读查询优先与敏感操作人工确认边界。

## 方案

会话归属当前 `tenantId + actor.id`，不做租户共享。Product API 负责会话和消息的持久化，管理端只保存用户输入、助手最终回复和错误提示，不保存页面 DOM、工具原始输入、API Key 或内部推理内容。

数据模型分为 `AdminPageAgentConversation` 和 `AdminPageAgentMessage`。会话保存标题和更新时间；消息保存角色、内容、可选 token 统计和创建时间。所有查询、更新、删除都同时约束租户与操作者，避免跨账号访问。

## 交互

抽屉升级为 GPT 风格的两栏布局：左侧历史会话栏，顶部为“新建对话”和搜索框，列表按最近更新时间倒序；会话行显示标题、最近更新时间和操作菜单。右侧保留现有消息渲染、快捷运营查询、停止按钮、确认提示和模型设置入口。

新会话默认标题为“新对话”；首次用户输入后自动取前 24 个字符作为标题，支持手动重命名。切换会话会停止当前 Agent 任务并切换消息列表；新建会话会创建新的 PageAgentCore，避免把旧会话的上下文带入新会话。当前会话在本次页面生命周期内保留运行时实例，刷新后恢复可见消息，但重新建立干净 Agent 上下文。

## API

- `GET /admin/page-agent/conversations`：返回当前账号的会话摘要。
- `POST /admin/page-agent/conversations`：创建会话。
- `GET /admin/page-agent/conversations/:id`：返回会话消息。
- `PATCH /admin/page-agent/conversations/:id`：修改标题。
- `DELETE /admin/page-agent/conversations/:id`：删除会话及其消息。
- `POST /admin/page-agent/conversations/:id/messages`：追加用户、助手或错误消息；限制单次最多两条并限制内容长度。

错误使用现有统一 API 错误契约；会话不存在或不属于当前账号时统一返回 not found，不泄漏其他账号是否存在。

## 验证

后端覆盖租户/账号隔离、标题生成、消息长度限制和删除级联；前端覆盖新建、切换、重命名、删除确认、搜索过滤和消息保存失败提示。完成后运行 Product API 的 lint、typecheck、定向 Jest，管理端 lint、typecheck、Vitest 和 build，并执行 Prisma validate/generate。
