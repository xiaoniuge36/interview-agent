import { classifyRole, type RoleCategory } from './role-category';

type InterviewPrompts = {
  warmup: string;
  core: string;
  reflection: string;
};

const PROMPTS: Record<RoleCategory, InterviewPrompts> = {
  engineering: {
    warmup:
      '请用 2 分钟介绍一个最能体现你胜任{role}的项目。请说明业务背景、你的职责、系统边界、关键技术取舍和结果。',
    core: '请结合这个项目说明，作为{role}你如何划分系统边界、做出关键技术取舍，并保障性能、稳定性和上线质量？',
    reflection:
      '如果项目结果没有达到预期，作为{role}你会如何定位问题，调整系统方案，并沉淀性能、稳定性或质量改进？',
  },
  data: {
    warmup:
      '请用 2 分钟介绍一个最能体现你胜任{role}的项目。请说明业务问题、指标口径、分析或建模方法和业务结果。',
    core: '请结合这个项目说明，作为{role}你如何校准指标口径、处理数据质量问题，并选择合适的分析、实验或建模方法？',
    reflection:
      '如果项目结果没有达到预期，作为{role}你会如何排查数据质量、方法假设或指标偏差，并推动洞察落地？',
  },
  ai_agent: {
    warmup:
      '请用 2 分钟介绍一个最能体现你胜任{role}的项目。请说明用户任务、工作流设计、工具边界、模型效果和结果。',
    core: '请结合这个项目说明，作为{role}你如何设计 Agent 工作流、控制工具权限，并评估模型效果、成本和可观测性？',
    reflection:
      '如果项目结果没有达到预期，作为{role}你会如何定位模型、检索、工具调用或失败恢复问题，并调整方案？',
  },
  product_design: {
    warmup:
      '请用 2 分钟介绍一个最能体现你胜任{role}的项目。请说明用户问题、目标、方案取舍、协作过程和上线结果。',
    core: '请结合这个项目说明，作为{role}你如何识别用户问题、确定优先级、做出方案取舍，并用指标验证上线效果？',
    reflection:
      '如果项目结果没有达到预期，作为{role}你会如何复盘用户洞察、需求判断、协作节奏和产品方案？',
  },
  growth_operations: {
    warmup:
      '请用 2 分钟介绍一个最能体现你胜任{role}的项目。请说明目标人群、运营策略、实验设计、投入产出和结果。',
    core: '请结合这个项目说明，作为{role}你如何进行用户分层、拆解漏斗、设计实验或渠道策略，并评估投入产出？',
    reflection:
      '如果项目结果没有达到预期，作为{role}你会如何判断问题在用户、渠道、策略还是转化链路，并完成复盘？',
  },
  business_delivery: {
    warmup:
      '请用 2 分钟介绍一个最能体现你胜任{role}的项目。请说明客户场景、业务目标、价值方案、协同过程和经营结果。',
    core: '请结合这个项目说明，作为{role}你如何识别客户目标、设计价值方案、协调关键干系人，并控制交付风险？',
    reflection:
      '如果项目结果没有达到预期，作为{role}你会如何复盘客户预期、方案取舍、交付风险和续约或经营结果？',
  },
  generic: {
    warmup:
      '请用 2 分钟介绍一个最能体现你胜任{role}的项目或经历。请说明背景、职责、关键行动、协作方式和结果。',
    core: '请结合这个项目说明，作为{role}你如何识别核心问题、做出关键判断，并与相关角色协作推进？',
    reflection: '如果项目结果没有达到预期，作为{role}你会如何定位原因、调整方案并沉淀复盘？',
  },
};

export function initialInterviewQuestion(roleTitle: string): string {
  return promptFor(roleTitle, 'warmup');
}

export function projectInterviewQuestion(roleTitle: string): string {
  return promptFor(roleTitle, 'core');
}

export function reflectionInterviewQuestion(roleTitle: string): string {
  return promptFor(roleTitle, 'reflection');
}

function promptFor(roleTitle: string, stage: keyof InterviewPrompts): string {
  return PROMPTS[classifyRole(roleTitle)][stage].replaceAll('{role}', roleTitle);
}
