---
title: Evals、可观测、可靠性与安全
date: 2026-07-29
tags: [Evals, Observability, Reliability, Security, Golden Case]
kind: course
track: AI Agent 工程师完整路线
order: 5
level: advanced
duration: 120
summary: 把非确定模型放进可回归、可追踪、可降级和可攻防的工程门禁
---

# Evals、可观测、可靠性与安全

“模型看起来回答得不错”不能作为上线依据。Agent 需要同时验证结果质量、轨迹安全、业务约束、延迟和成本，并能在失败时定位到具体步骤。

## 学习目标

- 建立从单元测试到端到端任务成功率的评测金字塔。
- 设计可复现的 Golden Case、失败分类和回归门禁。
- 用 Trace、Span、结构化事件和指标定位一次 Agent 运行。
- 为超时、重试、熔断、降级和 Prompt Injection 建立纵深防线。

## 评测金字塔

| 层次       | 评什么                           | 是否进入 CI      |
| ---------- | -------------------------------- | ---------------- |
| Contract   | Schema、权限、停止条件、预算     | 必须，完全确定性 |
| Component  | Parser、Router、Memory、RAG 召回 | 必须，固定数据   |
| Tool       | 参数校验、幂等、错误映射         | 必须，使用 Stub  |
| Trajectory | 是否选择正确工具、步骤是否越界   | 抽样或离线回归   |
| Outcome    | 任务最终是否完成、证据是否充分   | 离线评测集       |
| Human      | 有用性、表达、风险和业务价值     | 发布前抽检       |

测试不要只断言最终文案。对 Agent 更重要的确定性不变量包括：未授权工具永不执行、步骤不超预算、失败不落业务事实、引用必须存在、同一幂等键只产生一次副作用。

## Golden Case 数据集

每个 Case 至少包含：输入、上下文版本、允许工具、期望事实、禁止行为、评分 rubric、来源和最近复核日期。数据集要覆盖：

- 正常任务与不同表达方式。
- 边界值、空输入、长输入和冲突约束。
- 工具超时、返回空结果、结构错误和部分失败。
- 无法回答、需要澄清和必须拒绝的请求。
- Prompt Injection、越权、数据外泄和记忆投毒。

按失败类型分层抽样，避免评测集全是容易的成功案例。生产 Bad Case 进入数据集前要脱敏、复核并去重。

## LLM-as-Judge 的边界

Judge 适合评价开放文本的相关性、完整性和表达，不适合替代权限、金额、引用存在性等确定性检查。使用时应：

1. 把 rubric 拆成少量可观察维度。
2. 优先成对比较，减少绝对分数漂移。
3. 用人工标注样本校准一致率。
4. 固定 Judge 模型、Prompt 和温度版本。
5. 对位置偏差、自偏好和冗长偏好做交换顺序测试。

## 可观测性

一次 Trace 应连接用户请求、模型调用、检索、工具、状态变化和最终响应。Span 至少记录：版本、耗时、token、成本、重试、错误码、输入输出摘要和关联 ID；敏感原文默认不入日志。

核心指标分四组：

- Quality：任务成功率、Groundedness、工具选择准确率、人工采纳率。
- Reliability：错误率、超时率、重试率、恢复成功率、重复副作用数。
- Performance：首 token、总延迟、队列等待、P95/P99。
- Economics：每成功任务成本、token 构成、缓存命中、模型路由比例。

日志说明“发生了什么”，Trace 说明“跨步骤如何发生”，指标说明“系统性趋势”，三者不能互相替代。

## 可靠性模式

- 为模型、工具、整轮任务分别设置超时。
- 只重试瞬时且幂等的操作，并使用有上限的指数退避与抖动。
- 熔断持续故障的 Provider，切换到降级模型或确定性流程。
- 用并发上限、队列和背压保护依赖服务。
- 把 Provider 错误、策略拒绝、业务冲突和用户输入错误分开建模。
- 在每个高风险边界提供取消、人工接管和可解释的降级结果。

## Agent 安全威胁模型

| 威胁              | 典型入口                      | 防护重点                             |
| ----------------- | ----------------------------- | ------------------------------------ |
| Prompt Injection  | 用户、网页、RAG、工具结果     | 指令/数据隔离、来源标签、最小工具集  |
| Tool Abuse        | 模型生成危险参数              | Schema、权限、确认、沙箱、额度       |
| Data Exfiltration | 跨租户检索、日志、外发工具    | 检索前过滤、DLP、输出策略、审计      |
| Memory Poisoning  | 未验证内容写入长期记忆        | 来源、置信度、确认、冲突和删除机制   |
| Supply Chain      | MCP Server、依赖、Prompt 模板 | allowlist、签名/版本、能力协商、隔离 |
| Denial of Wallet  | 无限循环、长上下文、并发调用  | 步骤、token、时间、并发和费用预算    |

安全策略必须位于模型之外。Prompt 中写“不要泄露”只是提示，真正控制来自服务端权限、工具隔离和输出门禁。

## 本课动手实验

为前四课的系统建立至少 20 个 Golden Case：

1. 使用 Fake Provider 让 Contract 与 Tool 测试稳定进入 CI。
2. 为开放回答增加有来源的 rubric，并人工标注 5 个校准样本。
3. 注入超时、429、非法 JSON、重复动作和检索空结果。
4. 构造间接 Prompt Injection，验证不能调用写工具或读取其他租户数据。
5. 输出每个 Case 的结果、失败类别、traceId、延迟和成本。
6. 设定发布门禁：确定性安全断言必须 100%，质量指标不得低于基线容差。

## 自测

1. 为什么最终答案正确，轨迹仍可能判定失败？
2. LLM-as-Judge 如何证明与人工评价基本一致？
3. 重试为什么必须和幂等、错误分类一起设计？
4. 为什么把外部文档包在 XML 标签里仍不足以阻止 Injection？

## 面试怎么讲

用“数据集—执行—评分—诊断—门禁—生产回流”讲评测闭环；再选一个 Bad Case，从 Trace 定位到具体工具或策略，并说明怎样加入回归集。安全问题则按资产、信任边界、攻击路径和控制措施回答。

## 延伸来源

- [Hugging Face Agents Course](https://github.com/huggingface/agents-course)：Observability、Evaluation 与最终自动 benchmark。
- [agent-study](https://github.com/Callous-0923/agent-study)：评测、Trace、可靠性、Benchmark 与纵深安全专题。
- [Microsoft AI Agents for Beginners](https://github.com/microsoft/ai-agents-for-beginners)：Trustworthy Agents 与 Agent Security 课程。
- [OpenAI Cookbook](https://github.com/openai/openai-cookbook)：Evals、结构化输出、工具调用和生产实践示例。
