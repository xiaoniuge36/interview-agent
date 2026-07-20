# C 端 AI 刷题教练设计说明

## 目标

在现有 `apps/user-portal` 内加入全站可用、刷题优先的 AI Agent。它使用用户自己的模型连接，结合个人档案、最近 JD、掌握度、练习记录与复盘结果，帮助用户选择训练内容、理解当前题目并进入下一步页面。

本功能不创建独立系统，不复用后台管理员会话数据，也不让前端接触明文 API Key。

## 用户体验

- 登录后的所有 C 端页面显示可拖动的“AI 刷题教练”悬浮入口。
- 展开后使用双栏对话工作区：左侧历史会话，右侧当前对话；窄屏改为上下结构。
- 支持新建、搜索、切换、重命名和删除会话。
- 空会话提供四个高频入口：今日练什么、针对薄弱项组题、分析最近失分、带我去复盘。
- 未配置可用模型时，明确说明原因并提供“去连接模型”按钮。
- 模型运行、等待确认、失败和停止状态均使用可理解的中文反馈。

## Agent 能力边界

Agent 可以：

- 理解当前页面并通过既有导航进入首页、题库、个人档案、模拟面试、练习空间、复盘中心和设置中心。
- 只读查询当前用户的智能题单、掌握度和最近练习。
- 基于页面中可见的当前题目、练习反馈和用户提问给出训练建议。
- 在用户要求时帮助定位页面控件、填写非敏感输入并解释下一步。

Agent 不可以：

- 读取或输出 API Key、Authorization、密码、手机号、邮箱等敏感信息。
- 未经确认提交答案、创建练习、调用模型评价、生成整轮复盘或执行其他可能消耗模型额度的操作。
- 访问其他租户或其他用户的会话、档案、练习与模型连接。
- 执行任意 JavaScript。

## 架构

### Product API

新增 `UserPageAgentModule`，暴露：

- `GET /user/page-agent/config`
- `POST /user/page-agent/chat/completions`
- `GET /user/page-agent/conversations`
- `POST /user/page-agent/conversations`
- `GET /user/page-agent/conversations/:conversationId`
- `PATCH /user/page-agent/conversations/:conversationId`
- `DELETE /user/page-agent/conversations/:conversationId`
- `POST /user/page-agent/conversations/:conversationId/messages`

模型调用继续通过 `ModelCredentialService`、`ModelProviderClient` 和 `AiInvocationService`，观测操作类型为 `user_page_agent`。

### 持久化

新增 `UserAgentConversation` 和 `UserAgentMessage`。所有读取和写入必须携带 `tenantId + userId` 所有权条件；消息仅保存用户输入、助手最终回复和错误，不保存页面 DOM、工具参数、思维过程或凭证。

### User Portal

新增 `components/user-agent/`，职责拆分为：

- 运行时：创建 `PageAgentCore`、挂载 `PageController`、声明安全指令与只读工具。
- 会话数据：管理列表、当前会话和消息持久化。
- UI：悬浮按钮、历史侧栏、消息区、确认区和输入区。
- 页面工具：导航、智能推荐、掌握度和最近练习只读查询。

## 视觉方向

- 主题：个人训练航标，而不是后台运营机器人。
- 颜色：深靛蓝 `#193A74`、训练蓝 `#3478F6`、薄荷青 `#55C6A9`、雾白 `#F6F9FE`、正文墨色 `#13233D`。
- 标记：星芒位于倾斜轨道中央，悬浮按钮加入薄荷色进度节点；与后台图标有家族感，但更轻、更亲和。
- 动效：仅在 hover 和运行状态使用轻量轨道位移与呼吸效果；遵循 `prefers-reduced-motion`。

## 隐私与错误处理

- 完成请求在发送模型前递归遮蔽敏感字段和敏感文本。
- 页面内容转换再次遮蔽 Bearer Token、手机号和邮箱。
- 无模型、模型不兼容、请求过大、模型失败、会话不存在均返回传统结构化 API 错误。
- 前端对话保存失败不丢失当前可见消息，并提示用户稍后重试。

## 验收标准

1. 普通用户登录后能看到并拖动 AI 刷题教练入口。
2. 用户能创建、切换、搜索、重命名和删除自己的历史会话。
3. Agent 能查询个人智能题单、掌握度、最近练习并导航到对应页面。
4. 会产生模型消耗或写入业务状态的操作必须二次确认。
5. 没有模型连接时能一键进入设置中心。
6. 后台管理员会话与 C 端用户会话完全隔离。
7. Prisma 校验、迁移、定向测试、类型检查、Lint 与前端构建得到真实验证结果。

