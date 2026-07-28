# AI 助手历史栏与图标重设设计

## 目标

让后台智能运营助手的历史对话成为稳定、随时可用的左侧导航，并用清晰、可识别的品牌入口替换现有的抽象 AI 图形。

## 参考与设计结论

会话型产品通常将历史会话作为与当前对话并列的固定导航，而不是隐藏在临时开关后：ChatGPT 将最近会话置于左侧栏，并提供搜索以发现更早会话；Claude 同样以左侧 Chats 作为会话历史入口。[ChatGPT chat history search](https://help.openai.com/en/articles/10056348-how-do-i-search-my-chat-history-in-chatgpt%23.midi) [Claude conversation management](https://support.anthropic.com/en/articles/8230524-how-can-i-delete-or-rename-a-conversation)

图标方向参考成熟产品的共同原则：Gemini 使用基础形状、品牌色与柔和渐变建立熟悉感；Copilot 强调简单界面和鲜明但克制的 AI 色彩；Intercom 建议 Launcher 融入产品自身；Perplexity 使用简洁、独立的品牌符号建立识别度。[Gemini Visual Design](https://design.google/library/gemini-ai-visual-design) [Behind the design: Meet Copilot](https://microsoft.design/articles/behind-the-design-meet-copilot/) [Intercom Custom Launcher](https://www.intercom.com/help/en/articles/2894-create-a-custom-launcher) [Perplexity Logo](https://live.standards.site/perplexity/logo)

本次不复制第三方资产，而是吸收上述设计原则，绘制 Interview Agent 自有的 `IA` 单线字母标识。

## 信息与视觉设计

### 后台对话布局

- 桌面端：`历史对话` 侧栏始终固定在助手抽屉的左侧，包含新建、搜索、选择、重命名和删除；右侧只承载当前会话。
- 移动端：保留现有上下堆叠，历史栏位于对话内容之前并具有受限高度，避免挤压输入框。
- 移除仅用于显示/隐藏历史栏的局部状态和工具栏按钮；新建对话仍保留在当前会话工具栏，方便连续操作。

### AI 入口图标

两端均采用 56px 圆形 Launcher，承载原创 `IA` 单线字母标识，代替此前的轨道、星芒、对话壳、角色图案和三瓣光阑。字母标识直接对应 Interview Agent，比通用 AI 装饰图案更易识别，也让前后台形成稳定的产品资产。

| 入口             | Launcher 背景 | 标识强调色 | 含义               |
| ---------------- | ------------- | ---------- | ------------------ |
| 前台 AI 刷题教练 | 钴蓝          | 薄荷绿     | 训练时的专注与成长 |
| 后台智能运营助手 | 海军蓝        | 青蓝       | 治理时的清晰与可靠 |

字母主体使用白色，`A` 的横杠使用端侧强调色；按钮只保留轻微表面渐变、内描边和悬浮抬升，不加入轨道、光晕或持续装饰动画。入口继续保留运行状态点、可拖动行为、键盘焦点、悬浮标签和减少动效偏好；不使用图片、外部 URL 或新增依赖。

## 文件边界

- 后台布局：`apps/admin-console/src/components/admin-agent/AdminAgentDrawerContent.tsx`
- 后台入口与样式：`AdminAgentFloatButton.tsx`、`apps/admin-console/src/app/styles/admin-agent.css`
- 前台入口与样式：`UserAgentFloatButton.tsx`、`apps/user-portal/src/app/styles/user-agent.css`
- 回归测试：`AdminAgentDrawer.test.tsx`，新增前后台浮动入口的静态渲染测试。

## 验收标准

1. 后台抽屉在桌面端初次打开时，左侧即渲染历史会话栏；不再显示“打开/收起历史对话”按钮。
2. 历史会话的搜索、新建、选择、重命名、删除、加载和空状态不改变。
3. 前后台 AI 浮动入口不再使用轨道、星芒或光阑图形，均使用原创 `IA` SVG 品牌标记。
4. 拖动、状态点、无障碍标签、减少动效和窄屏布局保持可用。
