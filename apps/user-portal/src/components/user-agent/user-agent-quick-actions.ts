export type UserAgentQuickAction = {
  id: 'today-plan' | 'weakness-practice' | 'recent-mistakes' | 'review-center';
  title: string;
  description: string;
  prompt: string;
};

export const userAgentQuickActions: UserAgentQuickAction[] = [
  {
    id: 'today-plan',
    title: '今天练什么',
    description: '结合我的岗位和掌握度安排一轮训练',
    prompt: '结合我的目标岗位、个人档案和掌握度，告诉我今天最值得练什么。先给出训练计划，不要直接开始消耗模型的评价。',
  },
  {
    id: 'weakness-practice',
    title: '强化薄弱项',
    description: '找出最近最需要补强的能力',
    prompt: '查看我最近的掌握度和练习记录，找出最需要补强的能力，并推荐对应题单。',
  },
  {
    id: 'recent-mistakes',
    title: '分析最近失分',
    description: '从最近答题中提炼可执行改进点',
    prompt: '分析我最近练习中的失分线索，说明问题原因和下一步练习建议。',
  },
  {
    id: 'review-center',
    title: '去复盘中心',
    description: '查看历史报告和成长记录',
    prompt: '带我进入复盘中心，告诉我应该先看哪一份练习报告。',
  },
];
