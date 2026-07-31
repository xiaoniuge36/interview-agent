---
title: 面试 Agent 参考项目 Review
date: 2026-07-29
tags: [面试Agent, 参考项目, GitHub, Review]
status: reviewed
kind: reference
track: 参考项目与资料治理
level: reference
summary: 记录外部项目的采用边界，并把来源转化为课程、实验、评测和面试产出
---

# 面试 Agent 参考项目 Review

## Review 结论

| 结论                                       | 说明                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| 产品应做 Agent-native，不是题库站套 AI。   | 最值得学的是 Agent 工作流、长期记忆、模拟面试状态机、报告复盘和模型配置。             |
| Python Agent 生态更适合核心 Agent Engine。 | `TechSpar`、`MemCoach` 等参考项目使用 Python + FastAPI + LangGraph。                  |
| TypeScript 适合继续承载产品层。            | 自有 `InterviewRadar` 已具备题库、后台、JD matcher、AI Gateway、worker、Prisma。      |
| 题库治理 + 用户训练闭环是地基。            | 题库不是孤立资产，必须进入用户画像、训练、报告、记忆，才能形成越用越准的 Agent 体验。 |
| 报告是核心交付物。                         | 刷题报告和面试报告才是用户感知价值最高的输出。                                        |

## 本次参考决策

参考项目只用于帮助做架构判断，不作为功能清单照搬。最终采用原则如下：

| 决策     | 采用                                                                              | 不采用                                           |
| -------- | --------------------------------------------------------------------------------- | ------------------------------------------------ |
| 产品形态 | 用户端 + 后台端 + Agent Runtime 的双端产品形态。                                  | 单纯聊天机器人、单纯模拟面试工具、公开题库门户。 |
| 题库能力 | 自维护题库、导入、候选题审核、标签、rubric、版本治理。                            | 自动采集公开题库、平台插件读取、无审核直接入库。 |
| 训练能力 | 画像、意向 JD、训练规划、刷题、复习、模拟面试、报告、长期记忆。                   | 实时作弊 Copilot、自动投递、招聘 ATS。           |
| 工程能力 | Schema-first、状态机、Prompt Registry、Model Router、Worker、Trace、Golden Case。 | 靠 prompt 串流程、无状态聊天、无可观测黑盒调用。 |
| 数据来源 | 用户主动录入、粘贴、上传，后台维护。                                              | 爬虫、抓取、自动同步外部网站。                   |

## 参考项目到本项目的映射

| 本项目模块     | 主要参考                                       | 只借鉴什么                                           | 明确不借鉴什么                          |
| -------------- | ---------------------------------------------- | ---------------------------------------------------- | --------------------------------------- |
| 用户端训练闭环 | `TechSpar`、`MemCoach`、`ai_interview`         | 训练前画像、训练中追问、训练后报告和长期记忆。       | 实时作弊、语音优先、大而全助手。        |
| 后台题库治理   | `InterviewRadar`、`interview-collector`        | 题库 CRUD、候选题审核、标签、rubric、任务队列。      | 采集型题库生产方式。                    |
| 面试状态机     | `MockMate`、`ai_interview`、`interview-skills` | 多阶段面试、追问、结束报告。                         | 多 Agent 评委团先行铺开。               |
| 项目深挖       | `MemCoach`、`backend-agent-resume-scout`       | 项目证据、追问角度、简历表达验证。                   | 自动拉取外部仓库作为默认入口。          |
| 报告画像       | `Readme.skill`、`TechSpar`                     | 证据化画像、指标化报告、下一轮建议。                 | 只生成漂亮 Markdown，不写回结构化记忆。 |
| 模型与观测     | `InterviewRadar`、`TechSpar`                   | AI Gateway、Prompt Registry、trace、成本与质量记录。 | 模型写死、prompt 无版本。               |

## 项目分组

| 分组           | 项目                                                                                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 自有资产       | `ai-agent-interview-prep`、`InterviewRadar`                                                                                                                |
| Agent 面试产品 | `ai_interview`、`TechSpar`、`MemCoach`、`MockMate`、`FaceTomato`、`ProView`                                                                                |
| 简历/求职闭环  | `smart-resume`、`prisma-ai`、`shushu-internship-tool`、`backend-agent-resume-scout`                                                                        |
| 题库/学习资料  | `agent-interview-hub`、`agent-camp`、`ai-interview-guide`、`AIGC-Interview-Book`、`llm-interview-code`、`AgentGuide`、`ai-agents-from-zero`、`agent-study` |
| Skill / 工作流 | `interview-skills`、`Readme.skill`、`interview-collector`、`Algernon Interview`                                                                            |
| 在线 Agent     | `iqbnk.coze.site`、`resumepro4.coze.site`                                                                                                                  |

## 自有资产 Review

| 项目                                                                                          | 定位                                  | 技术/内容                                                           | 可复用点                                                                               | 复用级别                   |
| --------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------- |
| [xiaoniuge36/ai-agent-interview-prep](https://github.com/xiaoniuge36/ai-agent-interview-prep) | 个人面试备战资料库。                  | 公司专项、AI 应用开发、前端题库、行为面、HR 谈薪、简历版本。        | 作为私有知识库、题库种子、个人画像来源。                                               | 核心复用                   |
| [xiaoniuge36/InterviewRadar](https://github.com/xiaoniuge36/InterviewRadar)                   | 可运营题库 + 岗位定制刷题 + AI 陪练。 | Next.js、NestJS、Prisma、PostgreSQL/pgvector、Redis/BullMQ、MinIO。 | monorepo 产品壳、前台题库交互、后台题库/审核/AI 配置、共享类型与 API client 组织方式。 | 核心参考，但不直接照搬代码 |

### `InterviewRadar` 前端专项 Review

本轮已在当前项目仓库外通过浅克隆复核，版本为 `e264893`。GitHub Web/API 访问受限不影响本地审查结论。

总体判断：有参考意义，且对“产品壳”和“后台运营台”的参考价值较高；但它不是本项目要做的 Agent-native 前端实现，不能直接迁移成新项目主流程。

| 方向                     | 判断                       | 本项目采用方式                                                                                                                                                                     |
| ------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| monorepo 工程壳          | 可参考                     | `apps/web`、`apps/admin`、`apps/api`、`packages/shared`、`packages/api-client` 的组织方式与当前方案高度一致，可作为起手结构参考。                                                  |
| 前台用户端视觉与信息架构 | 可参考交互，不直接复用实现 | 首页、题库列表、题目详情页、标签、难度、题型、侧栏题目导航、答题 tab、面试 tab 的页面组织值得参考。新项目需改造成“训练计划 - 面试会话 - 流式反馈 - 报告复盘”的 Agent-native 路径。 |
| 后台管理端               | 中高参考                   | `Ant Design` 后台壳、题目管理、候选题审核、AI Provider 配置、访问统计等页面可作为后台原型参考；落地时必须接入新版权限门禁、审计日志和 OpenAPI/JSON Schema 契约。                   |
| 共享类型与 API client    | 可参考设计，不直接复制     | `packages/shared` 和 `packages/api-client` 说明旧项目已经意识到跨端契约问题；新项目应升级为 schema-first 的 `packages/contracts`，避免前台、后台各自维护一套 API client。          |
| 题库领域模型             | 可参考 taxonomy            | `QuestionType`、`QuestionStatus`、`Domain`、`QualityGrade`、`Permission`、`Role` 可作为题库/后台治理的种子，但需要扩展到面试会话、评分报告、训练计划、记忆画像。                   |
| 登录与会话               | 不照搬                     | 旧项目主要依赖 `localStorage` 存 token/user，前台与后台各自处理登录态；新项目必须由 Product API 统一身份、会话、权限、资源所有权和数据作用域。                                     |
| Agent 面试页实现         | 不照搬                     | 旧项目在浏览器页面内拼 prompt、发起 `aiApi.chat`、解析评分 JSON。这与本项目“Product API 管业务事实源，Agent Runtime 管状态机”的架构冲突。只能参考 tab 交互，不复用逻辑。           |
| 前台数据获取             | 不照搬                     | 旧项目大量 `use client`、页面内 `useEffect` 请求、`any`、模拟数据 fallback；新项目应优先按契约建 Query 层、Server/Client 边界和错误模型。                                          |
| 占位页与营销内容         | 低参考                     | 多个页面是 `PlaceholderPage`，还有旧品牌/站点文案。只能作为低成本页面壳参考，不作为产品需求依据。                                                                                  |

#### 可迁移资产清单

| 资产                                         | 迁移级别 | 处理方式                                                                       |
| -------------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| `apps/web` 页面信息架构                      | 参考     | 提炼首页、题库、题目详情、个人中心、训练入口的页面地图，重建为新项目路由。     |
| `apps/admin` 后台 Layout 与 CRUD 页面形态    | 可改造   | 用于快速搭后台原型，但所有操作必须先过新版 Permission Gate 与 Audit Gate。     |
| `packages/shared` 类型枚举                   | 可改造   | 作为领域词表种子，迁入 `packages/contracts` 后由 schema 生成 TS/Python 类型。  |
| `packages/api-client` 分 endpoint 的封装方式 | 可参考   | 保留“按领域分 API”思想，重写为 OpenAPI/JSON Schema 驱动的 typed client。       |
| 题库筛选、标签、难度、状态 UI                | 可参考   | 用于题库治理和训练选题体验。                                                   |
| 旧项目的 AI Provider 管理页                  | 可参考   | 可演变为 Model Router / Provider 管理页，但 API key 展示、权限和审计必须重做。 |

#### 不应照搬清单

| 不照搬项                              | 原因                                              | 新项目替代方案                                                     |
| ------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| 浏览器内 prompt 编排与评分 JSON 解析  | 破坏 Agent Runtime 边界，难审计、难复现、难恢复。 | 由 Agent Runtime 执行 LangGraph 状态机，Product API 只调度和落库。 |
| `localStorage` token 作为主要会话依据 | XSS 风险高，权限和数据作用域分散。                | Product API 统一会话、权限、资源 ownership、审计。                 |
| 前后台重复 API client                 | 容易契约漂移。                                    | `packages/contracts` 统一生成 typed client。                       |
| 页面内模拟数据 fallback               | 容易掩盖后端/契约问题。                           | 明确 loading、empty、error、degraded 四类状态。                    |
| 大量 `any` 和页面内业务状态堆叠       | 会导致状态机扩散。                                | 训练会话、面试会话、报告生成都走显式状态模型。                     |
| 旧品牌、营销、友情链接文案            | 与新产品定位无关。                                | 只保留适合面试 Agent 的信息架构。                                  |

#### 对当前项目的落地建议

1. 不要把 `InterviewRadar` 前端整包复制进新项目；应按当前技术方案重新初始化 monorepo。
2. 第一批代码可以参考旧项目目录命名，但以 `packages/contracts` 为事实源，先建契约，再接页面。
3. 后台端可以优先参考旧项目 `apps/admin` 的菜单和页面集合：题目管理、审核中心、AI 配置、用户/权限、系统设置。
4. 用户端只参考页面信息架构，主链路要重构为：`训练目标/JD 输入 -> 训练计划 -> 面试会话 -> SSE 流式反馈 -> 报告复盘 -> 记忆写回`。
5. 面试详情页里的 Q&A / 开始面试 tab 可以作为交互原型，但实现必须迁入 Agent Runtime，不允许前端直接拼 Agent prompt。

### `InterviewRadar` 后端与产品能力参考边界

| 方向               | 判断           | 本项目采用方式                                               |
| ------------------ | -------------- | ------------------------------------------------------------ |
| 产品壳             | 可参考         | 用户端、后台端、题库管理、训练入口、报告入口的产品组织方式。 |
| 后台题库治理       | 可参考         | 题库 CRUD、候选题审核、标签、难度、rubric、版本管理。        |
| AI Gateway         | 可参考         | 模型配置、任务路由、Prompt Registry、结构化输出校验。        |
| Worker / Queue     | 可参考         | 导入、抽题、向量化、评分、报告生成等异步任务。               |
| JD matcher         | 可参考但需收口 | 只分析用户主动录入的 JD 和沟通文本，不接外部平台读取。       |
| 抓取/采集/插件能力 | 不采用         | 不作为本项目能力，只作为边界反例。                           |

## Agent 面试产品 Review

| 项目                                                                            | 技术栈                                      | 核心功能                                                        | 应学习点                                 | 风险/边界                                      |
| ------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| [1624899/ai_interview](https://github.com/1624899/ai_interview)                 | LangGraph 思路，综合求职助手。              | 模拟面试、简历优化、实时语音、多轮评估、结束报告。              | 面试状态机、简历+JD 题目规划、结束报告。 | 功能大，不要直接全抄，先抽象状态机和报告结构。 |
| [AnnaSuSu/TechSpar](https://github.com/AnnaSuSu/TechSpar)                       | Python + FastAPI + LangGraph。              | 专项训练、简历面试、JD 备面、实时 Copilot、录音复盘、长期记忆。 | “训练前-训练中-训练后”闭环，长期画像。   | 实时 Copilot 和语音后置。                      |
| [iZiTTMarvin/MemCoach](https://github.com/iZiTTMarvin/MemCoach)                 | Python + FastAPI + LangGraph + LlamaIndex。 | GitHub 项目分析、简历面试、项目证据、记忆系统。                 | 项目深挖和源码证据驱动面试。             | 项目分析较复杂，可作为增强方向。               |
| [linghuashenli65-bit/MockMate](https://github.com/linghuashenli65-bit/MockMate) | Python + FastAPI。                          | 多 Agent 协同、岗位画像、9 阶段面试、安全防护。                 | 面试阶段拆分、岗位画像、追问流程。       | 安全防护思路可借鉴，语音后置。                 |
| [Infinityay/FaceTomato](https://github.com/Infinityay/FaceTomato)               | FastAPI / LangChain 倾向。                  | 简历解析、简历优化、面经题库、模拟面试、复盘。                  | 轻量产品形态和多岗位分类。               | 深度 Agent 编排不足。                          |
| [gravel-01/proview-desktop](https://github.com/gravel-01/proview-desktop)       | 桌面端，本地优先。                          | 简历驱动提问、语音交互、评估报告、简历管理。                    | 隐私、本地优先、桌面部署思路。           | 先做 Web，不做桌面。                           |
| [adrianhajdin/ai_mock_interviews](https://github.com/adrianhajdin/ai_mock_interviews) | Next.js + Firebase + Vapi。                 | 创建面试、实时会话、即时反馈、transcript、Dashboard 历史。      | 首次价值、面试到反馈、历史追踪。         | 只参考旅程与信息架构，语音不是当前优先级。     |
| [theeaashish/interview-ai](https://github.com/theeaashish/interview-ai)         | Web AI 面试产品。                           | 按岗位、技术栈或简历生成题目，逐答评分与个性化反馈。            | 推荐依据解释、relevance/clarity/depth 维度。 | 不上传简历也应能完成岗位定制训练。          |
| [AnuragDubey007/intervai-ai-mock-interviews](https://github.com/AnuragDubey007/intervai-ai-mock-interviews) | Next.js + Firebase + Vapi。                 | 岗位配置、结构化反馈、历史摘要、retake 对比。                   | “反馈 -> 复练 -> 趋势”闭环。             | 不照搬账号、语音和具体供应商实现。             |
| [FranciscoMoretti/ai-mock-interview](https://github.com/FranciscoMoretti/ai-mock-interview) | Next.js + ElevenLabs。                      | 主题/难度配置、逐答反馈、个性化建议、最终分数和详细报告。       | 训练配置清晰度、逐题建议与总报告分层。   | 分数必须可解释，不能制造伪精确。               |
| [Google Interview Warmup](https://grow.google/certificates/interview-warmup/)  | 官方在线面试练习工具。                      | 专家题目、实时转写、回答洞察、同题重答、隐私说明。              | 低压力开始、非评判式洞察、反复练习。     | 不把洞察包装成绝对评分；不保存非必要原始回答。 |

## 简历与求职闭环 Review

| 项目                                                                                                    | 定位                             | 可学习点                                       | 落点                                               |
| ------------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------- | -------------------------------------------------- |
| [OrtonY/smart-resume](https://github.com/OrtonY/smart-resume)                                           | 私有化简历工作台。               | 简历版本、评分、翻译、投递记录、求职信。       | 可参考简历画像和资料管理；平台插件能力不采用。     |
| [weicanie/prisma-ai](https://github.com/weicanie/prisma-ai)                                             | 求职 AI copilot。                | 岗位匹配、向量匹配、简历定制、题库/Anki 联动。 | 只参考岗位匹配和训练计划；不采用平台岗位读取能力。 |
| [LiuMengxuan04/shushu-internship-tool](https://github.com/LiuMengxuan04/shushu-internship-tool)         | JD -> 项目 -> 简历 -> 面试。     | JD intake、项目偏好、项目到面试材料。          | 岗位准备包和项目补强。                             |
| [lishuangqiang/backend-agent-resume-scout](https://github.com/lishuangqiang/backend-agent-resume-scout) | 项目筛选 + 源码验证 + 简历表达。 | 判断项目是否值得写进简历、能否经得起追问。     | 项目深挖 Agent。                                   |

## 题库和学习资料 Review

| 项目                                                                                        | 内容                                                          | 可学习点                                                                    | 导入策略                                            |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------- |
| [Zchary1106/agent-interview-hub](https://github.com/Zchary1106/agent-interview-hub)         | AI Agent 工程师面试知识库。                                   | 知识体系、公司要求、实操题、学习路线。                                      | 作为 Agent 题库 taxonomy 参考。                     |
| [yibo365/agent-camp](https://github.com/yibo365/agent-camp)                                 | Agent 工程师系统知识库。                                      | LLM、Prompt、RAG、工具调用、Agent 架构、多 Agent。                          | 可做知识地图骨架。                                  |
| [guocong-bincai/ai-interview-guide](https://github.com/guocong-bincai/ai-interview-guide)   | AI 应用开发面试宝典。                                         | 分级题库、AI 应用开发模块。                                                 | 补齐 AI 应用题库。                                  |
| [WeThinkIn/AIGC-Interview-Book](https://github.com/WeThinkIn/AIGC-Interview-Book)           | AIGC/LLM/AI Agent 面试资料。                                  | 大模型基础、大厂高频题、开放题。                                            | 筛选适合开发岗的部分。                              |
| [AIR-hl/llm-interview-code](https://github.com/AIR-hl/llm-interview-code)                   | LLM 手撕代码。                                                | MHA、RoPE、RMSNorm、BPE、DPO、工具调用解析。                                | 高阶加分题。                                        |
| [adongwanai/AgentGuide](https://github.com/adongwanai/AgentGuide)                           | Agent 学习指南。                                              | 面试怎么考、简历怎么写。                                                    | 学习路线和表达参考。                                |
| [didilili/ai-agents-from-zero](https://github.com/didilili/ai-agents-from-zero)             | Agent 教程 + 题库 + 项目。                                    | LangChain、RAG、MCP、企业级实践。                                           | 不全量导入，做索引。                                |
| [Callous-0923/agent-study](https://github.com/Callous-0923/agent-study)                     | Agent 全栈课程。                                              | RAG/MCP/A2A/生产可观测性。                                                  | 学习专题和示例参考。                                |
| [summerjava/Awesome_Agent_Dev](https://github.com/summerjava/Awesome_Agent_Dev)             | 资源导航。                                                    | 学习路线、工具、项目索引。                                                  | 只做参考索引。                                      |
| [Shubhamsaboo/awesome-llm-apps](https://github.com/Shubhamsaboo/awesome-llm-apps)           | 可运行的 LLM、Agent、MCP 与 RAG 应用集合。                    | 单 Agent、多 Agent、MCP Agent、RAG 和语音 Agent 的场景化实现。              | 只提炼项目场景与工程考点，不批量导入示例代码。      |
| [bojieli/ai-agent-book](https://github.com/bojieli/ai-agent-book)                           | 《深入理解 AI Agent：设计原理与工程实践》开源书籍与配套实验。 | Agent 的上下文、工具、规划、记忆、安全、评估与生产实践。                    | 作为系统化知识地图和题目答案校验资料。              |
| [nageoffer/ai-handbook](https://github.com/nageoffer/ai-handbook)                           | 面向 AI 工程师的 LLM、RAG、Agent 成长手册与高频题库。         | RAG 全链路、工具调用、MCP、记忆、规划、可靠性和面试分类。                   | 用于补齐工程化题目与分层学习路线，题目重新编写。    |
| [dogxii/iFace](https://github.com/dogxii/iFace)                                             | Agent、前端、Golang、Java 综合面试题库与智能刷题工具。        | 多技术方向题库组织、刷题交互、自定义模型辅助学习。                          | 参考题库产品体验，不直接复制题目或实现。            |
| [MisterBooo/llm-interview-questions](https://github.com/MisterBooo/llm-interview-questions) | 100 道 LLM 面试题与配套图解。                                 | 模型架构、训练对齐、推理优化、RAG、Agent、多模态、评估监控。                | 参考分类与可视化解释；改编内容需遵循 CC BY-SA 4.0。 |
| [microsoft/ai-agents-for-beginners](https://github.com/microsoft/ai-agents-for-beginners)   | Microsoft 的 AI Agent 入门课程与代码示例。                    | Agent 设计模式、工具使用、Agentic RAG、多 Agent、协议、上下文、记忆与安全。 | 作为基础到生产题目的官方课程索引。                  |
| [huggingface/agents-course](https://github.com/huggingface/agents-course)                   | Hugging Face Agent 课程与测验。                               | Agent 基础、框架实践、工具调用、观测与课程化测验组织。                      | 参考客观题结构和循序渐进的练习设计。                |
| [openai/openai-cookbook](https://github.com/openai/openai-cookbook)                         | OpenAI API 官方示例与工程指南。                               | Tool Calling、Agents、结构化输出、Evals、RAG 与生产实践。                   | 用于核对 OpenAI 相关考点和构造可验证的实操题。      |
| [Lau-Jonathan/LLM-Agent-Interview-Guide](https://github.com/Lau-Jonathan/LLM-Agent-Interview-Guide) | LLM 与 Agent 面试知识库。                                    | 基础、推理优化、微调、RAG、Agent、安全、手撕代码、系统设计与真题路线。       | 用作 Agent 专项 taxonomy、难度和冲刺路线参考。      |
| [bcefghj/ai-agent-interview-guide](https://github.com/bcefghj/ai-agent-interview-guide)     | 企业级 AI Agent 项目问答集。                                 | 架构、实现、性能、故障、工程质量、业务和基础追问；强调 STAR。               | 提炼项目深挖题型和证据化回答 rubric，不复制示例数字。 |
| [datawhalechina/hello-agents](https://github.com/datawhalechina/hello-agents)               | 从基础到项目的开源 Agent 教程。                              | ReAct/Planning、框架、Memory/RAG、协议、评估、综合项目和求职问答。           | 串联“学习 -> 实验 -> 项目 -> 面试”，做课程索引。    |
| [wanshuiyin/ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)               | 中英双语 AI 面试专题与可阅读 HTML。                           | 原理/公式直觉、L1-L3 分级高频题、from-scratch 可运行代码。                  | 参考三柱专题结构；内容必须人工复核并原创重组。      |
| [nicobytes/interview-full-stack](https://github.com/nicobytes/interview-full-stack)         | Angular + Hono + Cloudflare 的 AI 面试模拟器。                | 回答分析、建设性反馈、前后端 monorepo 和 CI 中的 lint/build 门禁。           | 参考反馈链路与工程验收，不采用摄像头/麦克风优先。   |

### 二次吸收结论：从参考链接到学习闭环

第一轮 Review 解决了“哪些项目值得看”；第二轮不再增加功能清单，而是回答“它具体改变哪一课、哪项练习、哪种产品机制，以及怎样验收”。外部内容只做结构与知识校验，课程正文和题目均需原创重组。

| 来源                                         | 真正吸收的精华                                                                           | 转化到课程/功能                                            | 可验收证据                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------- |
| Prepwise / InterviewAI / IntervAI            | 配置输入必须真正改变问题推荐；反馈之后应能复练并在历史中看到变化                         | Profile/JD -> 推荐解释 -> 面试 -> 反馈 -> 薄弱项复练       | 保存资料后说明推荐为何改变；复练保留弱项上下文；历史可比较      |
| AI Mock Interview / Google Interview Warmup  | 逐答建议和总报告分层；允许同题重答；洞察应帮助改进而不是伪装成绝对评判                   | 逐题反馈、报告解释、同题/同技能再练、隐私提示              | 用户知道“为什么这样评、下一步练什么”；原始回答保存边界清晰      |
| LLM-Agent-Interview-Guide / Agent Q&A Guide  | taxonomy 既覆盖原理也覆盖工程故障、业务价值和项目追问；答案要有证据和取舍                | 题库分层、项目深挖、评分 rubric                            | 单选/多选验证知识边界；开放题评价方案选择、故障处理和结果证据   |
| hello-agents / ARIS-in-AI-Offer              | 学习、可运行实验、分级问答和最终项目应互相链接，而不是资料区与题库各自孤立               | 学习专题 -> 实验 -> Review -> 对应题库 -> 项目表达          | 每课能进入对应练习；错题能返回知识点；代码题有运行与边界测试    |
| `agent-interview-hub`                        | 知识 taxonomy、公司要求、实操题和阶段路线同时存在                                        | 00 能力地图、07 项目深挖与题库复练                         | 八课覆盖基础、工程、系统设计和实操；毕业自测能映射回专题       |
| `agent-camp`                                 | 不只讲 API，还把 LLM、Context、RAG、Tool、架构和源码串联                                 | 01–04 先手写最小循环，再解释框架替代的基础设施             | 每课实验都要求状态、失败路径和框架前后对比                     |
| `ai-interview-guide` / `AIGC-Interview-Book` | 按难度组织高频题、开放题和 AI 应用模块                                                   | 各课自测 + 题库单选、多选、开放题验证                      | 学完可进入题库；题目按基础、工程取舍和生产故障分层             |
| `MisterBooo/llm-interview-questions`         | 图解、来源、勘误和许可意识比题目数量更重要                                               | 各课保留来源；Review 记录复核日期和版权边界                | 不复制正文；可追溯到来源，公开内容发布前复核 License           |
| `llm-interview-code`                         | 手撕题必须能运行、能解释形状/复杂度、能测试                                              | 02 Tool Calling Parser、07 Agent 工程必做与 LLM 原理加分   | 至少完成一项 Agent 工程题和一项模型原理题，并附边界测试        |
| `AgentGuide`                                 | 按目标岗位分线，以项目、指标、简历和面试表达验收学习                                     | 00 先定岗位与毕业项目；07 同一项目准备算法/工程两种证据    | 30 秒、3 分钟、10 分钟三版表达；每个指标有基线与口径           |
| `ai-agents-from-zero` / `awesome-llm-apps`   | 场景化、端到端、可运行，比继续收集概念更有价值                                           | 02–06 的小实验逐步合并为毕业项目                           | 项目同时具备 Tool、RAG、状态恢复、Eval、部署和降级             |
| `agent-study`                                | 可执行讲义 + 七层递进；覆盖 Streaming、A2A、可观测、路由、缓存、可靠性和安全             | 01–06 每课有动手实验与失败注入；05–06 补齐生产专题         | Golden Case、Trace、熔断演练、模型路由对比和 Production Review |
| `Awesome_Agent_Dev`                          | 资源导航价值在索引与选型，不在全量搬运                                                   | 作为每课延伸索引，不进入课程完成率                         | 主路线保持 8 课，外部资源按需打开，不制造阅读负担              |
| `ai-agent-book`                              | Context、Tool、Memory、Evaluation 和持续进化组成同一 Agent Harness                       | 01–06 使用“模型决策 + 确定性边界 + 反馈改进”主骨架         | Runtime 不直写业务事实；Prompt/Tool/Memory/Eval 全部版本化     |
| `ai-handbook`                                | RAG 与 Agent 的完整工程链路、工具四层防护和量化评估                                      | 02 工具治理、03 RAG 消融、04 记忆规划、05 可靠性           | 权限在召回/执行前生效；检索和生成故障可分别诊断                |
| `iFace`                                      | 本地优先、进度追踪、薄弱点和继续学习入口形成低摩擦闭环                                   | 已落地浏览器本地完成状态、最近阅读、课程进度和题库入口     | 刷新后进度仍在；损坏数据可回退；弱项自动聚合留待后续版本       |
| Microsoft `ai-agents-for-beginners`          | 每课固定正文、代码、扩展阅读；主题覆盖 Tool、RAG、Planning、Memory、Production、Security | 八课统一为目标、心智模型、取舍、实验、自测、面试表达、来源 | 课程结构一致，但正文不依赖 Microsoft 特定框架才能成立          |
| Hugging Face `agents-course`                 | 从基础与框架走到最终项目，并用自动 benchmark 验收                                        | 00 定义毕业标准、05 建评测、07 冻结 benchmark              | 不以“读完”毕业，以固定数据集上的质量、安全、延迟和成本毕业     |
| OpenAI `openai-cookbook`                     | 用官方示例核对 Tool、结构化输出、RAG 和 Evals 的可验证行为                               | 02、03、05 的实现与评测参考                                | Provider 行为经官方资料复核，测试仍使用 Fake/Stub 保持稳定     |

### 已落地与后续边界

| 闭环机制         | 当前状态       | 边界                                                     |
| ---------------- | -------------- | -------------------------------------------------------- |
| 有顺序的完整课程 | 已落地         | 8 课按 `order` 排序，Review 不计入完成率                 |
| 原理到实践       | 已落地         | 每课包含取舍、实验、失败路径、自测和面试表达             |
| 本地学习进度     | 已落地         | 仅保存完成课与最近阅读，不上传服务端                     |
| 学完去题库验证   | 已落地入口     | 当前进入通用题库；专题题目映射和弱项回流属于后续迭代     |
| 自动 benchmark   | 内容标准已落地 | 课程定义数据集与指标；在线自动执行、证书和排行榜不在本期 |
| 来源治理         | 已落地         | 保留来源、原创重组；禁止自动抓取或全量复制外部资料       |

## Skill / 工作流 Review

| 项目                                                                                      | 功能                                                  | 可学习点                                             |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| [jennifer88huang/interview-skills](https://github.com/jennifer88huang/interview-skills)   | JD + 简历定制模拟面试，覆盖技术面、行为面、HR、谈薪。 | 可拆成多个 Agent skill：技术面、HR、谈薪、项目深挖。 |
| [study8677/Readme.skill](https://github.com/study8677/Readme.skill)                       | AI-native 开发者画像报告。                            | 报告结构、证据化表达、指标化画像。                   |
| [swf2020/interview-collector](https://github.com/swf2020/interview-collector)             | 多角色面试题整理工具。                                | 清洗去重、来源标注、逐题解答；自动采集能力不采用。   |
| [ClawHub Algernon Interview](https://clawhub.ai/antoniovfranco/skills/algernon-interview) | 技术模拟面试 Skill。                                  | 概念/应用/取舍/生产问题、自适应追问、评分报告。      |

## 在线 Agent Review

| 站点                                                  | 当前结论                                    | 后续                                       |
| ----------------------------------------------------- | ------------------------------------------- | ------------------------------------------ |
| [iqbnk.coze.site](https://iqbnk.coze.site/)           | 可访问，动态 Coze 页面，疑似面试题库/问答。 | 人工体验，记录输入输出。                   |
| [resumepro4.coze.site](https://resumepro4.coze.site/) | 可访问，动态 Coze 页面，疑似简历优化。      | 人工体验，记录是否支持 JD 匹配和简历评分。 |

## 功能抽象矩阵

### 后台资产能力

| 能力              | 参考来源                                    | 本项目采用方式                                                    |
| ----------------- | ------------------------------------------- | ----------------------------------------------------------------- |
| 自维护题库        | `InterviewRadar`、`ai-agent-interview-prep` | 手动录入、Markdown/CSV/JSON/Excel/PDF/DOCX 文件导入、结构化校验。 |
| 候选题审核        | `InterviewRadar`、`interview-collector`     | AI 抽题后进入候选题池，人工编辑、合并、驳回、发布。               |
| 标签与难度        | `agent-interview-hub`、`agent-camp`         | 技术栈、岗位方向、题型、难度、能力维度分层维护。                  |
| rubric 与评分规则 | `TechSpar`、`ai_interview`                  | 评分点、缺失点、参考答案、追问策略版本化。                        |
| Prompt / 模型配置 | `InterviewRadar`、`TechSpar`                | Model Router、Prompt Registry、任务级模型配置、trace 观测。       |

### 用户训练能力

| 能力           | 参考来源                                                       | 本项目采用方式                                         |
| -------------- | -------------------------------------------------------------- | ------------------------------------------------------ |
| 个人画像       | `Readme.skill`、`TechSpar`、`MemCoach`                         | 从用户主动提供的个人信息、简历摘要、项目经历生成画像。 |
| 意向 JD 画像   | `InterviewRadar`、`interview-skills`、`shushu-internship-tool` | 只分析用户粘贴或上传的 JD、岗位要求、沟通文本。        |
| AI 自规划刷题  | `TechSpar`、`InterviewRadar`                                   | 根据画像、JD、掌握度和正式题库生成训练计划。           |
| 用户手选刷题   | 粉笔体验 + `InterviewRadar`                                    | 题库筛选、手选题、套卷、题卡、计时、交卷。             |
| 题库针对性复习 | `MemCoach`、`TechSpar`                                         | 错题、收藏、弱项、标签题复练。                         |
| 模拟面试       | `ai_interview`、`MemCoach`、`MockMate`、`interview-skills`     | 多阶段面试状态机、追问、评分、报告。                   |
| 报告生成       | `Readme.skill`、`TechSpar`、`ai_interview`                     | 刷题报告、面试报告、个人能力画像。                     |
| 长期记忆       | `TechSpar`、`MemCoach`                                         | 掌握度、弱项、历史报告、下一轮训练。                   |

## 参考项目不采用清单

| 不采用能力               | 原因                                               | 本项目替代方式                                     |
| ------------------------ | -------------------------------------------------- | -------------------------------------------------- |
| 爬虫、抓取、自动采集     | 合规和授权边界复杂，且会把产品带偏成数据采集工具。 | 用户手动录入、粘贴、上传文件，后台维护题库资产。   |
| 外部网站自动读取         | 输入来源不可控，难以审计和追溯。                   | 只处理用户或后台已经提供的文本、文件和结构化数据。 |
| BOSS/牛客/脉脉等平台插件 | 平台规则和授权风险高，不是训练闭环的必要能力。     | 用户主动粘贴 JD、沟通文本、公司背景。              |
| 自动投递 / ATS           | 会把产品带偏成招聘流程系统。                       | 只做个人训练、岗位准备和面试复盘。                 |
| 公开题库门户             | 版权和运营复杂，且弱化自有资料优势。               | 做私有题库、自维护题库和后台审核流。               |
| 大而全求职平台           | 范围扩散，降低 Agent 闭环质量。                    | 先打穿题库资产治理 + 用户训练反馈 + 记忆画像。     |

## 风险与边界

| 风险         | 说明                                       | 处理                                                             |
| ------------ | ------------------------------------------ | ---------------------------------------------------------------- |
| 外部题库版权 | 多数资料不能直接复制进公开产品。           | 保留来源，默认私有使用，公开前查 license。                       |
| 来源不可控   | 外部平台读取会引入合规、授权、稳定性问题。 | 不做外部平台读取，所有输入来自用户或后台提供材料。               |
| 功能过大     | 参考项目覆盖范围很广。                     | 先做题库治理、用户画像、训练规划、刷题报告、模拟面试和记忆写回。 |
| AI 幻觉      | 评分和报告可能误导。                       | rubric、schema 校验、来源引用、人工编辑。                        |

## Review 来源

- 调研方式：2026-07-09 本地浅克隆读取 README、顶层结构、配置文件和自有项目文档。
- 二次复核：2026-07-29 在线复核学习资料仓库的 README、课程目录、实验主题与 License；只提炼结构和工程知识，不复制外部题目或正文。
- 自有仓库版本：
  - `xiaoniuge36/ai-agent-interview-prep`: `1e1569e`
  - `xiaoniuge36/InterviewRadar`: `e264893`
