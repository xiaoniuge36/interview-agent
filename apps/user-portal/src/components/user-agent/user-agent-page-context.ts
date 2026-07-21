import {
  userAgentQuickActions,
  type UserAgentQuickAction,
} from './user-agent-quick-actions';

export type UserAgentPageContextId =
  | 'training-overview'
  | 'practice'
  | 'reports'
  | 'profile'
  | 'settings'
  | 'interview';

export type UserAgentPageContext = {
  id: UserAgentPageContextId;
  title: string;
  description: string;
  quickActions: UserAgentQuickAction[];
  runtimeInstructions: string;
};

const PRACTICE_ACTIONS: UserAgentQuickAction[] = [
  {
    id: 'practice-guidance',
    title: '梳理解题思路',
    description: '围绕当前题目拆解答题框架，不代替作答',
    prompt: '结合我正在练习的题目，帮我梳理解题思路和答题框架，不要替我保存或提交答案。',
  },
  {
    id: 'practice-save-check',
    title: '保存前检查',
    description: '检查表达是否覆盖题目重点',
    prompt: '请检查我当前答题思路应覆盖哪些重点，并给出保存前的自查清单，不要替我保存或提交。',
  },
  {
    id: 'practice-review',
    title: '进入本轮复盘',
    description: '说明完成后应如何查看复盘',
    prompt: '告诉我完成本轮练习后应该如何进入复盘，并说明复盘时优先关注什么，不要直接生成复盘。',
  },
];

const REPORT_ACTIONS: UserAgentQuickAction[] = [
  {
    id: 'review-weaknesses',
    title: '归纳薄弱项',
    description: '从历史报告中找出最优先改善的能力',
    prompt: '结合我的历史复盘，归纳最需要优先改善的薄弱项，并说明依据和下一步练习方向。',
  },
  {
    id: 'review-next-round',
    title: '规划下一轮',
    description: '把复盘结论转成可执行训练目标',
    prompt: '根据最近复盘，给出下一轮训练的目标、题目方向和练习顺序，不要直接创建练习。',
  },
  {
    id: 'review-explain',
    title: '解读最近报告',
    description: '解释分数、反馈和追问的含义',
    prompt: '带我查看最近一份复盘报告，解释分数、反馈和追问分别意味着什么。',
  },
];

const PROFILE_ACTIONS: UserAgentQuickAction[] = [
  {
    id: 'profile-completeness',
    title: '检查训练画像',
    description: '找出会影响推荐质量的缺失信息',
    prompt: '检查我的个人档案和目标岗位信息，指出会影响训练推荐的缺失项，并按优先级说明。',
  },
  {
    id: 'profile-jd-fit',
    title: '梳理 JD 重点',
    description: '提炼岗位要求与训练侧重点',
    prompt: '结合我的目标岗位和 JD，梳理最需要准备的能力重点，并推荐适合的训练方向。',
  },
];

const SETTINGS_ACTIONS: UserAgentQuickAction[] = [
  {
    id: 'settings-model',
    title: '检查模型连接',
    description: '了解当前可用模型与训练前置条件',
    prompt: '说明当前训练所需的模型连接状态，并带我前往设置中心查看，不要读取或展示任何密钥。',
  },
  {
    id: 'settings-training',
    title: '回到训练计划',
    description: '连接完成后继续规划训练',
    prompt: '带我回到训练计划，并说明完成模型设置后最适合先做什么。',
  },
];

const INTERVIEW_ACTIONS: UserAgentQuickAction[] = [
  {
    id: 'interview-preparation',
    title: '准备模拟面试',
    description: '梳理进入面试前应确认的信息',
    prompt: '结合我的目标岗位和训练记录，列出开始模拟面试前需要确认的准备项，不要直接开始面试。',
  },
  {
    id: 'interview-follow-up',
    title: '强化高频追问',
    description: '定位适合在面试前练习的追问方向',
    prompt: '根据我的薄弱项和最近练习，推荐面试前最值得强化的追问方向。',
  },
];

const CONTEXTS: Record<UserAgentPageContextId, UserAgentPageContext> = {
  'training-overview': {
    id: 'training-overview',
    title: '训练规划',
    description: '从训练目标、薄弱项和最近记录开始',
    quickActions: userAgentQuickActions,
    runtimeInstructions: '当前在训练总览或题库页面。优先给出训练规划、只读查询和现有页面导航建议。',
  },
  practice: {
    id: 'practice',
    title: '练习进行中',
    description: '围绕当前题目提供思路、检查与复盘指引',
    quickActions: PRACTICE_ACTIONS,
    runtimeInstructions:
      '当前在练习空间。只提供解题指导、保存前检查和复盘入口；不替用户保存或提交答案，不直接发起 AI 评估或生成整轮复盘。',
  },
  reports: {
    id: 'reports',
    title: '复盘解读',
    description: '把历史反馈转成下一轮可执行训练',
    quickActions: REPORT_ACTIONS,
    runtimeInstructions:
      '当前在复盘中心。优先解释已有报告、薄弱项和下一轮训练方向；不直接创建练习或生成新的整轮复盘。',
  },
  profile: {
    id: 'profile',
    title: '训练画像',
    description: '完善档案与 JD，让推荐更贴合目标岗位',
    quickActions: PROFILE_ACTIONS,
    runtimeInstructions:
      '当前在个人档案或 JD 页面。优先说明训练画像的完整性和岗位要求，不读取或输出敏感个人信息。',
  },
  settings: {
    id: 'settings',
    title: '训练设置',
    description: '检查模型连接与开始训练的前置条件',
    quickActions: SETTINGS_ACTIONS,
    runtimeInstructions:
      '当前在设置中心。只说明模型连接和训练前置条件，不读取、输出或修改 API Key、Token、密码或模型配置。',
  },
  interview: {
    id: 'interview',
    title: '模拟面试准备',
    description: '根据目标岗位和训练记录做好面试前准备',
    quickActions: INTERVIEW_ACTIONS,
    runtimeInstructions:
      '当前在模拟面试工作室。优先提供准备建议和追问方向，不替用户开始面试、提交回答或发起模型评估。',
  },
};

export function resolveUserAgentPageContext(pathname: string): UserAgentPageContext {
  if (pathname.startsWith('/practice')) return CONTEXTS.practice;
  if (pathname.startsWith('/reports')) return CONTEXTS.reports;
  if (pathname.startsWith('/profile') || pathname.startsWith('/job')) return CONTEXTS.profile;
  if (pathname.startsWith('/settings')) return CONTEXTS.settings;
  if (pathname.startsWith('/interview')) return CONTEXTS.interview;
  return CONTEXTS['training-overview'];
}
