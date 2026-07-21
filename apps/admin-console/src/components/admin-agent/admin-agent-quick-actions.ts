export type AdminAgentQuickActionId = string;

export type AdminAgentQuickAction = {
  id: AdminAgentQuickActionId;
  title: string;
  description: string;
  prompt: string;
};

export const adminAgentQuickActions: AdminAgentQuickAction[] = [
  {
    id: 'pending-imports',
    title: '待审核导入',
    description: '定位未完成的资料批次',
    prompt:
      '查询待审核的导入批次，列出批次名称、候选题数量和待审核数量，并告诉我应该进入哪里处理。',
  },
  {
    id: 'pending-candidates',
    title: '待审核候选题',
    description: '按来源批次查看积压题目',
    prompt: '查询待审核候选题，按来源导入批次汇总数量，指出优先处理项并告诉我如何进入审核工作台。',
  },
  {
    id: 'runtime-health',
    title: '运行异常',
    description: '查看失败和降级运行',
    prompt: '查询最近的 Agent 运行异常和降级记录，说明影响、可能原因和建议查看的后台入口。',
  },
  {
    id: 'dashboard',
    title: '运营看板',
    description: '汇总当前训练与内容数据',
    prompt: '查看后台运营看板，概括关键指标、需要关注的变化和下一步建议。',
  },
];
