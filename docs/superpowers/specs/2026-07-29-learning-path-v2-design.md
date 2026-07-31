# 学习中心二期设计

## 目标

把学习中心从“参考文档阅读器”升级为面向 AI Agent 工程师的完整学习闭环。参考项目继续作为知识来源与结构依据，但课程正文由本项目重新组织和原创表达，不复制外部题库或教程。

## 冲突边界

并行任务 `019fa798-8277-7473-be4b-32c5874b8fc3` 已确认不会修改学习中心、User Portal 导航、User Portal 依赖、lockfile 或 `参考资料`。本期只写入：

- `参考资料/**`
- `apps/user-portal/src/app/(app)/learn/**`
- `apps/user-portal/src/components/learning/**`
- `apps/user-portal/src/lib/learning/**`
- 学习中心专属 CSS 和对应设计/计划文档

## 从参考项目吸收的机制

| 来源类型                               | 吸收机制                                              | 本项目转化                                      |
| -------------------------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| Microsoft AI Agents for Beginners      | 每课有目标、正文、代码与扩展阅读                      | 每章固定学习目标、工程模型、实验和来源          |
| Hugging Face Agents Course             | 从基础到最终项目，并以 benchmark 验收                 | 8 课顺序路径、阶段自测和毕业项目                |
| ai-agent-book                          | Agent = LLM + 上下文 + 工具；覆盖记忆、评估和持续进化 | 用系统边界组织课程，而非按框架罗列 API          |
| agent-camp / ai-handbook / agent-study | 面试问题与工程取舍结合，覆盖可靠性、观测和安全        | 每章加入生产检查表与“面试怎么讲”                |
| AgentGuide / Agent Interview Hub       | 学习路线、实战产出和求职表达                          | 每章有可交付物，最终形成项目案例                |
| awesome-llm-apps / ai-agents-from-zero | 可运行场景和端到端项目                                | 每章安排小实验，最后组合为毕业项目              |
| iFace                                  | 本地进度、薄弱点和继续学习                            | 本地保存完成状态和最近阅读，不引入数据库        |
| llm-interview-questions                | 来源等级、复核日期和勘误边界                          | 每章保留参考来源，Review 增加吸收矩阵和版权边界 |
| llm-interview-code                     | MHA、RoPE、RMSNorm、BPE、DPO、工具流解析手写          | 高阶课加入“能解释 + 能手写 + 能验证”的加分任务  |

## 课程结构

在 `参考资料/学习路线/` 新增 8 篇 Markdown：

1. 学习地图与能力验收。
2. Agent 基础与上下文工程。
3. Tool Calling、MCP 与协议边界。
4. RAG、Hybrid Retrieval 与 Agentic RAG。
5. Memory、Planning、Workflow 与 Multi-Agent。
6. Evals、Observability、Reliability 与 Security。
7. 生产架构、成本、部署与持续改进。
8. 面试表达、手撕代码与毕业项目。

每篇课程统一包含：学习目标、核心心智模型、关键原理、工程取舍、动手实验、自测清单、面试表达、延伸来源。课程内容不依赖特定框架才能成立，框架只作为实现案例。

## 文档模型

Markdown frontmatter 扩展为：

```yaml
kind: course
track: AI Agent 工程师完整路线
order: 1
level: foundation
duration: 60
summary: 建立 Agent 系统边界与上下文工程心智模型
```

loader 递归读取固定目录内的 Markdown，使用相对路径生成唯一 slug。课程按 `order` 排序，普通参考资料排在课程之后。目录读取只接受实际 `.md` 文件，不跟随用户输入路径。

## 学习体验

- 资料架分为“完整学习路线”和“参考资料”两组。
- 课程条目显示顺序、难度、预计时间和完成状态。
- 阅读头部显示本课定位和学习摘要。
- 阅读底部支持“标记完成 / 取消完成”“下一课”“进入题库验证”。
- 浏览器本地保存 `completedSlugs` 与 `lastOpenedSlug`；不上传服务器。
- 进度区展示已完成课程数、百分比和继续上次学习入口。
- Review 文档仍可作为参考索引直接阅读，但不计入课程完成率。

## 状态与安全

进度结构版本化为 `interview-agent:learning-progress:v1`。解析损坏或旧数据时回退为空状态；只保留当前仍存在的课程 slug。服务端不接收本地进度，避免引入 API、数据库和跨任务共享 contract。

外部 Markdown 仍通过 React Markdown 安全渲染，不启用原始 HTML；外链继续增加安全属性。递归扫描设置固定深度，忽略符号链接和非 Markdown 文件。

## 验收

- 参考资料目录至少包含 8 篇可独立学习的课程和 1 篇 Review。
- loader 能递归发现课程、解析元数据、稳定排序并忽略无效内容。
- 进度模型覆盖损坏数据、完成切换、最近阅读和课程清理。
- 页面能区分课程与参考资料，展示课程进度和下一课动作。
- User Portal 定向测试、完整测试、typecheck、lint、build 通过。
- 最终复核与并行任务不存在重叠写入文件。

## 非目标

- 服务端同步进度、账号间同步、学习提醒。
- 自动复制或同步外部仓库全文。
- 在线编辑课程、评论、证书和排行榜。
- 修改题库、推荐、报告、E2E、README 或部署配置。
