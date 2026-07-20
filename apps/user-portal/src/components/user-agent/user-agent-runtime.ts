import type { AgentActivity, AgentStatus, HistoricalEvent, PageAgentCore } from '@page-agent/core';
import { userPageAgentFetch, type UserPageAgentConfig } from '@/lib/user-page-agent-api';
import { createUserPageAgentTools } from './user-agent-tools';

const MAX_CONTEXT_MESSAGES = 12;
const MAX_CONTEXT_LENGTH = 12_000;
const BASE_AGENT_INSTRUCTIONS =
  '你是 OfferPilot 的 AI 刷题教练，服务于当前登录的求职者。你要结合目标岗位、个人档案、掌握度、最近练习和复盘结果，给出具体、可执行的中文建议。优先使用只读查询工具了解训练状态。未经用户确认，不要创建练习、提交答案、调用评价、生成整轮复盘或执行其他会消耗模型额度的动作。不要读取或输出 API Key、Token、密码、手机号和邮箱。禁止执行任意 JavaScript。回答简洁，固定使用“结论、依据、下一步”三个部分，不使用 Markdown 表格。';

export function formatUserAgentConversationContext(
  messages: Array<{ role: 'user' | 'assistant' | 'error'; content: string }>,
) {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-MAX_CONTEXT_MESSAGES)
    .map((message) => `${message.role === 'user' ? '用户' : '助手'}：${message.content}`)
    .join('\n')
    .slice(-MAX_CONTEXT_LENGTH);
}

export async function createUserAgentRuntime(options: RuntimeOptions): Promise<PageAgentCore> {
  const [{ PageAgentCore, tool }, { PageController }] = await Promise.all([
    import('@page-agent/core'),
    import('@page-agent/page-controller'),
  ]);
  const controller = new PageController({
    enableMask: true,
    includeAttributes: ['aria-label', 'name', 'data-user-agent-scope'],
    keepSemanticTags: true,
    viewportExpansion: 0,
  });
  const runtimeConfig = {
    pageController: controller,
    baseURL: '/user/page-agent',
    customFetch: userPageAgentFetch,
    customTools: {
      ...createUserPageAgentTools(tool),
      execute_javascript: null,
      scroll_horizontally: null,
    },
    experimentalScriptExecutionTool: false,
    instructions: {
      system: buildInstructions(options.conversationContext),
      getPageInstructions: (url: string) => `当前用户端页面：${url}。优先使用已有导航和只读工具。`,
    },
    language: 'zh-CN' as const,
    maxSteps: 10,
    model: options.config.model as string,
    onAskUser: options.onAskUser,
    transformPageContent: maskPageContent,
  };
  const agent = new PageAgentCore(runtimeConfig);
  bindRuntimeEvents(agent, options);
  return agent;
}

type RuntimeOptions = {
  config: UserPageAgentConfig;
  conversationContext?: string;
  onActivity: (value: string) => void;
  onStatus: (value: AgentStatus) => void;
  onTokens: (value: number) => void;
  onAskUser: (question: string, options?: { signal: AbortSignal }) => Promise<string>;
};

function buildInstructions(conversationContext?: string) {
  if (!conversationContext) return BASE_AGENT_INSTRUCTIONS;
  return `${BASE_AGENT_INSTRUCTIONS}\n\n以下是当前会话最近消息，仅用于保持上下文：\n${conversationContext}`;
}

function bindRuntimeEvents(agent: PageAgentCore, options: RuntimeOptions) {
  const onActivity = (event: Event) => {
    const activity = (event as CustomEvent<AgentActivity>).detail;
    options.onActivity(activityLabel(activity));
    if (activity.type === 'error') options.onStatus('error');
  };
  const onStatus = () => options.onStatus(agent.status);
  const onHistory = () => options.onTokens(totalHistoryTokens(agent.history));
  agent.addEventListener('activity', onActivity);
  agent.addEventListener('statuschange', onStatus);
  agent.addEventListener('historychange', onHistory);
  const dispose = agent.dispose.bind(agent);
  agent.dispose = () => {
    agent.removeEventListener('activity', onActivity);
    agent.removeEventListener('statuschange', onStatus);
    agent.removeEventListener('historychange', onHistory);
    dispose();
  };
}

function maskPageContent(content: string): string {
  return content
    .replace(/\bBearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [已隐藏]')
    .replace(/\b(1[3-9]\d)\d{4}(\d{4})\b/g, '$1****$2')
    .replace(/\b([a-zA-Z0-9._%+-])[^@\s]*(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g, '$1***$2');
}

function activityLabel(activity: AgentActivity): string {
  if (activity.type === 'thinking') return '正在分析当前训练状态…';
  if (activity.type === 'executing') return `正在${toolLabel(activity.tool)}…`;
  if (activity.type === 'executed') return activity.tool === 'done' ? '本次建议已完成' : `已完成${toolLabel(activity.tool)}`;
  if (activity.type === 'retrying') return `模型重试中（${activity.attempt}/${activity.maxAttempts}）`;
  return activity.message;
}

function toolLabel(tool: string): string {
  const labels: Record<string, string> = {
    navigate_user_view: '打开用户端页面',
    get_practice_recommendations: '读取智能题单',
    get_mastery_summary: '读取掌握度',
    get_recent_practice: '读取最近练习',
    get_profile_summary: '读取个人档案摘要',
  };
  return labels[tool] ?? '处理当前训练问题';
}

function totalHistoryTokens(history: HistoricalEvent[]): number {
  return history.reduce(
    (sum, item) => sum + (item.type === 'step' ? item.usage.totalTokens : 0),
    0,
  );
}
