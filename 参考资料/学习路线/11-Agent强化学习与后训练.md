---
title: Agent 强化学习与后训练
date: 2026-08-26
tags: [RLVR, GRPO, 奖励设计, Reward Hacking, 错误恢复]
kind: course
track: AI Agent 工程师完整路线
order: 11
level: advanced
duration: 90
summary: 当提示词和 SFT 到顶后，用可验证奖励把 Agent 行为直接训进模型
---

# Agent 强化学习与后训练

前十课都在“模型外”做工程：提示、工具、检索、编排。这一课进入“模型内”：当领域任务上提示词与监督微调到顶时，用强化学习把多轮工具使用、错误恢复这类行为直接训进权重。这是 2026 年 Agent 岗位面试的高频进阶题。

## 学习目标

- 建立 提示词 → SFT → RL 的升级阶梯，知道每级何时到顶。
- 理解 RLVR 与 GRPO 的机制，以及长程任务为什么有人退回 PPO。
- 掌握“奖励越简单越稳”的反直觉结论和 reward hacking 的防线。
- 了解错误恢复训练的前沿做法：把失败轨迹变成训练素材。
- 会评估“该不该上 RL”，而不是默认上。

## 升级阶梯：什么时候才轮到 RL

| 手段     | 适用                     | 到顶信号                         |
| -------- | ------------------------ | -------------------------------- |
| 提示与 harness | 行为问题、格式问题       | 提示再改，held-out 集不再提升    |
| SFT      | 有高质量示范轨迹         | 示范覆盖不到长尾，失败集中在恢复 |
| RLVR     | 能写出可靠验证器的任务   | 需要新能力而不是新行为时         |

RLVR（可验证奖励强化学习）的前提是奖励可程序化判定：测试通过、schema 合法、模拟器状态正确、订单真的创建成功。写不出可靠验证器的任务，先别谈 RL。

## GRPO 机制与长程的例外

GRPO 的流程：同一任务采样一组轨迹，用验证器打分，按组内相对优势更新——不需要独立价值模型，与规则化奖励天然契合，是当前 Agentic RL 的默认起点。多轮场景下，轨迹级奖励通过动作掩码摊到该轨迹的所有模型生成 token 上。

但它不是终点：长程任务（如编码 Agent）的轨迹方差大，部分团队为稳定性退回 PPO——GLM 系列就明确用 PPO 替代 GRPO 训练长程能力。可讲的判断：短轨迹、组内可比 → GRPO；长轨迹、高方差 → 考虑 PPO 或轨迹级归一化的变体。

## 多轮 Agentic RL 的系统难点

- Rollout 基础设施：每个训练样本是一条多轮轨迹，需要沙箱环境、模拟用户和大规模并行执行。
- Credit assignment：结果奖励只在轨迹末尾出现，中间哪一步立功/闯祸需要设计（步级验证器或反思信号）。
- 环境工程：BFCL 的多轮工具编排、TAU-Bench 的客服场景、GAIA/GTA 的真实工具任务是常用评测；训练环境的多样性直接决定泛化。
- 稳定性阀门：KL 惩罚锚住参考模型、过长轨迹过滤、按任务难度分层采样。

## 奖励设计：越简单越稳

一个反直觉但被反复验证的结论：只用最终正确性的奖励，比“正确性 + 格式分 + 过程分”的组合奖励更稳、更好。复合奖励给了模型可钻的空子（reward hacking）：它会学会刷格式分而不是把任务做对。公开实验里，用 GRPO 加纯正确性奖励、仅 100 个训练样本，就让 7B 模型在 BFCL 多轮子集上提升 23%。

Reward hacking 防线：

1. 奖励只绑定业务事实（状态检查 + 结果检查），不奖励表面特征。
2. held-out 评测集把关：训练分涨、held-out 不涨即刹车。
3. 上线门禁看全量指标：质量、安全、延迟、成本，防“奖励涨而体验降”。

## 前沿：把失败训练成恢复能力

标准 RL 把丰富的失败经验压缩成一个负奖励，模型学不到“怎么修”。2026 年的两条代表性路线：

- Fission-GRPO：把失败轨迹“裂变”为新训练实例——附上错误模拟器生成的诊断反馈，在线重采样多条恢复轨迹，让模型从自己刚犯的错误学恢复。BFCL v4 多轮错误恢复率 +5.7%，TAU2-Bench 最高 +17.4%。
- ReGRPO：构造 Reflection-of-Thought 三元组（ErrorType、Evidence、FixPlan）做热启动，再把反思 token 与纠正动作放进同一目标联合优化，并用反思成本项抑制无意义反思。

共同思想：错误恢复是一等能力，值得专门的数据引擎和训练信号——这与第 05 课“失败路径决定工程质量”的立场在训练侧汇合。

## 本课动手实验

不需要真的训模型，先把 RL 的工程外围搭出来：

1. 为你毕业项目里的一个工具任务写验证器：状态检查（数据库/环境终态）+ 结果检查（回答与事实一致），输出 0/1。
2. 用现有 Agent 跑 20 条轨迹，人工标注失败原因，统计“可被验证器捕获”的比例——这决定 RLVR 可行性。
3. 设计三版奖励（纯正确性、+格式分、+过程分），推演每版可能被怎样 hack，写出预测。
4. 构造 5 个“工具报错后需要恢复”的场景，记录当前模型的恢复率，作为未来训练的基线。

加分：用开源框架（如 verl、NeMo RL）在 BFCL 子集上真的跑一次小规模 GRPO，对比训练前后 held-out 成绩并汇报 token 成本。

## 自测

1. RLVR 的前提是什么？哪些任务天然不适合？
2. GRPO 相比 PPO 少了什么组件？为什么长程任务有人换回 PPO？
3. 为什么复合奖励反而更容易被 hack？你的防线是什么？
4. Fission-GRPO 和 ReGRPO 分别在数据侧和优化侧做了什么？

## 面试怎么讲

先立阶梯：提示 → SFT → RL，强调自己默认不上 RL、上之前先证明验证器可靠。再讲机制：GRPO 组内相对优势、轨迹级 credit assignment、KL 与过长过滤这些稳定性阀门。用“纯正确性奖励 100 样本提升 23%”说明奖励设计品位，用错误恢复训练收尾展示对前沿的追踪。最能加分的是给出一次自己被 reward hacking 教育过的具体案例。

## 延伸来源

- [Agentic RL: Frameworks and Best Practices](https://cameronrwolfe.substack.com/p/agentic-rl)：多轮 RL 训练系统与算法综述。
- [Improving Multi-Turn Tool Use with RL](https://bespokelabs.ai/blog/improving-multi-turn-tool-use-with-reinforcement-learning)：奖励简化与 BFCL 实验全记录。
- [Fission-GRPO（ACL 2026）](https://aclanthology.org/2026.acl-long.1880/)：失败轨迹裂变与错误恢复训练。
- [NVIDIA：AI Agent Reinforcement Learning](https://developer.nvidia.com/blog/mastering-agentic-techniques-ai-agent-reinforcement-learning/)：RLVR 工作流与验证器设计入门。
