import type {
  AgentStreamEvent,
  InterviewReport,
  InterviewSession,
} from '@interview-agent/contracts';

const EVENT_HISTORY_LIMIT = 20;

export type InterviewViewState = {
  session: InterviewSession | null;
  draft: string;
  streamingText: string;
  events: AgentStreamEvent[];
  report: InterviewReport | null;
  busy: boolean;
  notice: string;
};

export type InterviewAction =
  | { type: 'reset' }
  | { type: 'session'; session: InterviewSession }
  | { type: 'draft'; draft: string }
  | { type: 'token'; content: string }
  | { type: 'event'; event: AgentStreamEvent }
  | { type: 'report'; report: InterviewReport }
  | { type: 'busy'; busy: boolean }
  | { type: 'notice'; notice: string }
  | { type: 'clear_stream' }
  | { type: 'failure'; message: string };

export const STARTER_ANSWERS = [
  '我会先把 Product API 作为业务事实源，负责权限、状态落库、审计和调度；Agent Runtime 只接受受控上下文并返回结构化状态推进结果。',
  '我会把画像、JD、会话、报告作为四类业务事实，并通过 traceId 串联请求、模型调用、SSE 和审计日志。',
  'RAG 会先执行租户与资源作用域过滤，再做向量召回和重排，并将引用来源随模型输出返回。',
] as const;

export const INITIAL_INTERVIEW_STATE: InterviewViewState = {
  session: null,
  draft: STARTER_ANSWERS[0],
  streamingText: '',
  events: [],
  report: null,
  busy: false,
  notice: '先创建面试会话，再由 Product API 执行状态命令。',
};

export function interviewReducer(
  state: InterviewViewState,
  action: InterviewAction,
): InterviewViewState {
  if (action.type === 'reset') {
    return { ...INITIAL_INTERVIEW_STATE, draft: state.draft, busy: true };
  }
  if (action.type === 'failure') {
    return { ...state, busy: false, notice: action.message };
  }
  return reduceUpdate(state, action);
}

type InterviewUpdateAction = Exclude<InterviewAction, { type: 'reset' } | { type: 'failure' }>;

function reduceUpdate(
  state: InterviewViewState,
  action: InterviewUpdateAction,
): InterviewViewState {
  switch (action.type) {
    case 'session':
      return { ...state, session: action.session };
    case 'draft':
      return { ...state, draft: action.draft };
    case 'token':
      return { ...state, streamingText: state.streamingText + action.content };
    case 'event':
      return { ...state, events: appendEvent(state.events, action.event) };
    case 'report':
      return { ...state, report: action.report, busy: false };
    case 'busy':
      return { ...state, busy: action.busy };
    case 'notice':
      return { ...state, notice: action.notice };
    case 'clear_stream':
      return { ...state, streamingText: '' };
  }
}

function appendEvent(events: AgentStreamEvent[], event: AgentStreamEvent): AgentStreamEvent[] {
  return [event, ...events].slice(0, EVENT_HISTORY_LIMIT);
}
