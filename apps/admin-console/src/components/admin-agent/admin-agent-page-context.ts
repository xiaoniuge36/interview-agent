import type { AdminView } from '@/components/admin-navigation';
import {
  adminAgentQuickActions,
  type AdminAgentQuickAction,
} from './admin-agent-quick-actions';

export type AdminAgentPageContextId =
  | 'operations-overview'
  | 'analytics'
  | 'import-center'
  | 'question-bank'
  | 'review-workbench'
  | 'model-governance'
  | 'runtime-observability'
  | 'audit-log'
  | 'account-governance';

export type AdminAgentPageContext = {
  id: AdminAgentPageContextId;
  title: string;
  description: string;
  quickActions: AdminAgentQuickAction[];
  runtimeInstructions: string;
};

const REVIEW_ACTIONS: AdminAgentQuickAction[] = [
  {
    id: 'review-queue',
    title: '查看待审队列',
    description: '按来源批次定位候选题积压',
    prompt: '查询当前待审候选题，按来源批次汇总数量和优先级，并带我定位到对应审核入口。',
  },
  {
    id: 'review-source',
    title: '定位来源批次',
    description: '解释候选题与导入资料的对应关系',
    prompt: '解释当前候选题如何关联来源导入批次，并告诉我应该查看哪些信息后再人工审核。',
  },
  {
    id: 'review-rules',
    title: '梳理审核重点',
    description: '了解质量分与审核前的检查项',
    prompt: '说明审核候选题时应重点检查哪些质量项，并提示我在工作台中人工完成审核和发布。',
  },
];

const IMPORT_ACTIONS: AdminAgentQuickAction[] = [
  {
    id: 'pending-imports',
    title: '查看待处理批次',
    description: '定位尚未完成审核的资料导入',
    prompt: '查询待审核的导入批次，列出批次名称、候选题数量和待审核数量，并说明下一步人工处理入口。',
  },
  {
    id: 'import-progress',
    title: '解读导入进度',
    description: '区分已解析、待审核和已发布状态',
    prompt: '解释当前导入批次的进度状态分别表示什么，并指出需要优先处理的积压环节。',
  },
  {
    id: 'import-review-path',
    title: '进入审核工作台',
    description: '带我定位导入后的候选题审核入口',
    prompt: '带我进入审核工作台，并说明如何按导入批次查看候选题，不要启动导入或删除批次。',
  },
];

const RUNTIME_ACTIONS: AdminAgentQuickAction[] = [
  {
    id: 'runtime-failures',
    title: '分析运行异常',
    description: '查看失败与降级运行的影响和线索',
    prompt: '查询最近 Agent 失败和降级运行，说明影响、追踪线索和建议人工查看的页面入口。',
  },
  {
    id: 'runtime-health',
    title: '查看运行健康',
    description: '汇总当前运行状态与优先排查方向',
    prompt: '概括当前 Agent 运行健康情况，指出需要优先排查的异常类型和相应观测入口。',
  },
];

const ANALYTICS_ACTIONS: AdminAgentQuickAction[] = [
  {
    id: 'analytics-trends',
    title: '解读运营趋势',
    description: '梳理当前指标变化和关注点',
    prompt: '解读当前运营看板的关键指标变化，指出需要关注的趋势和后续查看方向。',
  },
  {
    id: 'dashboard',
    title: '查看治理总览',
    description: '回到全局运营与内容数据概览',
    prompt: '带我查看治理总览，概括当前内容和训练数据中最需要关注的指标。',
  },
];

const ACCOUNT_ACTIONS: AdminAgentQuickAction[] = [
  {
    id: 'account-roles',
    title: '说明账号角色',
    description: '了解后台与用户端账号的治理边界',
    prompt: '说明当前账号管理中的角色边界和人工治理流程，不查看敏感资料，也不修改账号。',
  },
  {
    id: 'account-audit',
    title: '查看审计线索',
    description: '定位账号相关变更的可追溯记录',
    prompt: '带我查看与账号治理相关的审计入口，并说明应如何人工核对变更记录。',
  },
];

function withAiUsage(actions: AdminAgentQuickAction[], role: string | undefined) {
  if (role !== 'platform_admin') return actions;
  return [
    ...actions,
    {
      id: 'ai-usage',
      title: '查看 AI 用量',
      description: '按模型和 Token 汇总平台消耗',
      prompt: '查询平台 AI 用量，概括模型、Token 消耗和需要关注的变化，不修改模型或预算。',
    },
  ];
}

export function resolveAdminAgentPageContext(
  view: AdminView,
  role: string | undefined,
): AdminAgentPageContext {
  return CONTEXT_RESOLVERS[view](role);
}

type ContextResolver = (role: string | undefined) => AdminAgentPageContext;

const CONTEXT_RESOLVERS: Record<AdminView, ContextResolver> = {
  overview: overviewContext,
  analytics: analyticsContext,
  imports: importContext,
  questions: questionBankContext,
  content: reviewWorkbenchContext,
  models: modelGovernanceContext,
  runtime: runtimeObservabilityContext,
  audit: auditLogContext,
  accounts: accountGovernanceContext,
};

function analyticsContext(role: string | undefined) {
  return createContext({
    id: 'analytics',
    title: '运营数据看板',
    description: '围绕指标趋势和 AI 用量解读运营变化',
    quickActions: withAiUsage(ANALYTICS_ACTIONS, role),
    runtimeInstructions: '当前在数据看板。只解释指标、趋势和只读用量，不修改预算、模型或账号。',
  });
}

function importContext() {
  return createContext({
    id: 'import-center',
    title: '资料导入',
    description: '查看导入进度并定位后续审核入口',
    quickActions: IMPORT_ACTIONS,
    runtimeInstructions: '当前在资料导入中心。只查询批次和解释进度，不启动导入、删除批次或改变资料状态。',
  });
}

function questionBankContext() {
  return createContext({
    id: 'question-bank',
    title: '题库管理',
    description: '查看正式题库与内容治理线索',
    quickActions: [adminAgentQuickActions[1]!, adminAgentQuickActions[3]!],
    runtimeInstructions: '当前在题库管理。只查询和解释题库内容，不修改、删除或发布题目。',
  });
}

function reviewWorkbenchContext() {
  return createContext({
    id: 'review-workbench',
    title: '审核工作台',
    description: '定位待审候选题、来源批次和审核重点',
    quickActions: REVIEW_ACTIONS,
    runtimeInstructions: '当前在审核工作台。只解释和定位，不执行审核、发布或批量处理。',
  });
}

function modelGovernanceContext(role: string | undefined) {
  return createContext({
    id: 'model-governance',
    title: '模型治理',
    description: '查看模型策略和运行数据的人工治理入口',
    quickActions: withAiUsage([adminAgentQuickActions[2]!], role),
    runtimeInstructions: '当前在模型治理页面。只解释连接、策略和用量，不读取凭证，不修改模型、预算或路由。',
  });
}

function runtimeObservabilityContext(role: string | undefined) {
  return createContext({
    id: 'runtime-observability',
    title: '运行观测',
    description: '分析失败、降级和模型调用运行情况',
    quickActions: withAiUsage(RUNTIME_ACTIONS, role),
    runtimeInstructions: '当前在运行观测页面。只查询异常和追踪线索，不重试、终止或修改运行。',
  });
}

function auditLogContext() {
  return createContext({
    id: 'audit-log',
    title: '审计日志',
    description: '查看平台治理相关的可追溯记录',
    quickActions: ACCOUNT_ACTIONS,
    runtimeInstructions: '当前在审计日志页面。只解释已有记录和导航，不修改审计数据或执行治理操作。',
  });
}

function accountGovernanceContext() {
  return createContext({
    id: 'account-governance',
    title: '账号管理',
    description: '说明账号角色和人工治理入口',
    quickActions: ACCOUNT_ACTIONS,
    runtimeInstructions: '当前在账号管理页面。只解释角色和审计线索，不查看敏感资料，不创建、禁用或修改账号。',
  });
}

function overviewContext() {
  return createContext({
    id: 'operations-overview',
    title: '运营总览',
    description: '从积压审核、运行状态和关键指标开始',
    quickActions: adminAgentQuickActions,
    runtimeInstructions: '当前在治理总览。优先查询运营指标、待办和只读状态，不执行审核、发布、导出或账号修改。',
  });
}

function createContext(context: AdminAgentPageContext): AdminAgentPageContext {
  return context;
}
