---
title: Agent 互操作协议与生态
date: 2026-08-26
tags: [MCP, A2A, Agent Card, AP2, x402, 协议治理]
kind: course
track: AI Agent 工程师完整路线
order: 10
level: intermediate
duration: 75
summary: 看懂 MCP、A2A 与 Agent 支付协议各管哪一层，以及什么时候不该为协议买单
---

# Agent 互操作协议与生态

第 02 课解决了“一个 Agent 怎么用工具”，这一课解决“Agent 怎么跨应用、跨组织协作与交易”。协议生态在 2025—2026 年快速定型：核心标准进入中立基金会，支付层出现专门协议。面试里高频出现的不是协议细节，而是“各管哪层、边界在哪、何时不用”。

## 学习目标

- 画出从 Function Calling 到 Agent 支付的协议分层图。
- 说清 MCP 与 A2A 互补而非竞争的分工。
- 理解 A2A v1.0 的关键设计：Agent Card、签名身份、无状态多绑定。
- 了解 AP2 与 x402 两条 Agent 支付路线的差异。
- 建立“协议解决连接，不解决治理”的选型纪律。

## 协议分层图

```text
模型层   Function Calling   模型如何表达一次结构化动作
工具层   MCP                应用如何发现/调用工具、资源与提示模板
代理层   A2A                独立 Agent 如何发现彼此、委托任务、交换状态
交易层   AP2 / x402         Agent 如何在授权下完成支付
商务层   UCP 等             跨平台商品、下单与履约语义
```

各层正交：一个 Agent 内部用 MCP 接工具，对外用 A2A 接受委托，需要付费时走 AP2。混淆层次（比如想用 MCP 做跨组织代理协作）是最常见的架构误用。

## 治理格局：标准进入中立基金会

| 协议     | 现属               | 关键节点                                        |
| -------- | ------------------ | ----------------------------------------------- |
| MCP      | Agentic AI Foundation（Linux 基金会定向基金） | Anthropic 于 2025 年 12 月捐出；基金会同时托管 goose、AGENTS.md、agentgateway |
| A2A      | Linux 基金会独立项目 | Google 2025 年 4 月发布，6 月捐出；2026 年 3 月发布 v1.0 |
| AP2      | FIDO Alliance      | A2A 的支付扩展，60 多家支付与金融机构支持       |
| x402     | x402 基金会（Linux 基金会，2026 年 7 月成立） | 约 40 家成员，含 Visa、Mastercard、Stripe、AWS、Coinbase |

注意仍在演进的部分：MCP 官方 Registry 截至 2026 年 8 月仍处于 preview，不要把生产依赖建立在它上面；厂商私有协议（如 Visa TAP）尚未进入标准组织。

## A2A v1.0 的核心设计

2026 年 3 月的 v1.0 是首个稳定版，一年内获得 150 多家组织支持，落地 Azure AI Foundry、Copilot Studio、Amazon Bedrock 等平台。要点：

- Agent Card：机器可读的能力名片，声明技能、端点与认证要求；v1.0 引入签名 Agent Card，用密码学验证身份，防伪造代理。
- 无状态、Web 对齐的分层架构：三种绑定——JSON over HTTP、gRPC、JSON-RPC；支持同步请求、SSE 流式与异步推送。
- 多租户与现代化认证流程：为企业生产部署清障。
- 不透明协作：双方只交换任务与产物（文本、文件、结构化数据），不暴露内部记忆、提示词或工具实现——组织间协作的信任前提。

## MCP 与 A2A：互补分工

| 维度     | MCP                        | A2A                          |
| -------- | -------------------------- | ---------------------------- |
| 连接对象 | Agent ↔ 工具/资源/提示模板 | Agent ↔ Agent                |
| 信任范围 | 通常同一应用或组织内       | 跨框架、跨组织边界           |
| 抽象单位 | 能力（tool/resource）      | 任务（委托、状态、产物）     |
| 典型问题 | “我的 Agent 怎么查数据库”  | “我的 Agent 怎么让外部专家 Agent 干活” |

官方口径：用 MCP 给单个 Agent 装配工具，用 A2A 让装配好的 Agent 彼此协作。两者都不替代 OAuth、业务权限、审计与配额——协议标准化连接，治理仍是你的工程（与第 02 课同一纪律）。

## Agent 支付：AP2 与 x402

Agent 替人花钱需要解决“授权证据”：怎么证明这笔交易在用户授权范围内。

- AP2（Agent Payments Protocol）：A2A 的扩展，走传统支付网络，用可验证的 mandate（委托授权凭据）捕获用户同意的密码学证据；商务协议 UCP 已兼容其 mandates 扩展。
- x402：基于 HTTP 402 状态码的机器支付路线，面向 API 调用、算力、数据这类机器间小额高频结算，支持链上清算。
- 判断口径：面向人类商品交易、需要合规与争议处理的走 AP2 一系；机器间按次计费的基础设施消费更适合 x402 一系。

## 选型纪律：什么时候不用协议

- 只有一个应用、一批内部工具：直接 Function Calling 即可，不必为每个函数起 MCP Server（第 02 课结论依旧成立）。
- 多 Agent 都在你自己进程内：进程内编排比 A2A 简单一个数量级，跨网络协议是为跨信任边界准备的。
- 值得上 MCP：能力需要跨应用复用、独立发布周期、清晰信任边界。
- 值得上 A2A：对接你不控制的外部 Agent，或平台要求互操作认证。
- 永远要自己做的：身份映射、权限裁剪、预算限制、审计留痕、失败降级。

## 本课动手实验

1. 为毕业项目画一张协议分层图：标出哪些连接是进程内调用、哪些走 MCP、哪些未来可能走 A2A。
2. 写一份自己 Agent 的 Agent Card 草稿：技能列表、输入输出模态、认证要求，并说明哪些字段绝不能暴露。
3. 设计一个跨组织场景（如“面试 Agent 委托外部题库 Agent 出题”）：定义任务状态机、超时与取消语义、结果验收标准。
4. 对该场景做威胁分析：伪造 Agent Card、恶意任务产物、重复计费，各自的防线是什么。

加分：给出这个场景“不用 A2A、直接 HTTP API”的替代方案，并列出两版方案的运维成本差异。

## 自测

1. MCP 与 A2A 分别标准化了什么？为什么说互补而非竞争？
2. 签名 Agent Card 防的是什么攻击？它不防什么？
3. AP2 与 x402 各适合什么交易形态？
4. 哪些治理问题是任何协议都不会替你解决的？

## 面试怎么讲

先用分层图定位各协议（模型动作、工具连接、代理协作、支付），再给治理事实（MCP、A2A 已进中立基金会，A2A v1.0 已稳定），然后亮选型纪律：内部工具不拆协议、跨信任边界才引入 A2A、授权与审计永远自建。最后用自己项目里“哪里刻意没用协议”的决策展示判断力——不滥用新协议比会用更加分。

## 延伸来源

- [A2A Protocol](https://a2a-protocol.org/latest/)：规范、Agent Card 定义与 MCP 分工说明。
- [Model Context Protocol](https://modelcontextprotocol.io/)：MCP 规范与官方 SDK。
- [Linux Foundation：A2A 一周年公告](https://www.linuxfoundation.org/press/a2a-protocol-surpasses-150-organizations-lands-in-major-cloud-platforms-and-sees-enterprise-production-use-in-first-year)：v1.0 特性与生态数据。
- [The agentic protocol landscape](https://www.neuralpartners.ai/resources/agentic-protocol-landscape/)：协议全景与治理归属追踪。
