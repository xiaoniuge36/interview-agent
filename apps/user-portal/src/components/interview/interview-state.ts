import type {
  AiOperationPhase,
  AgentStreamEvent,
  InterviewReport,
  InterviewSession,
} from '@interview-agent/contracts';

const EVENT_HISTORY_LIMIT = 20;

export type InterviewViewState = {
  session: InterviewSession | null;
  draft: string;
  streamingText: string;
  phase: AiOperationPhase | null;
  basisSummary: string[];
  events: AgentStreamEvent[];
  report: InterviewReport | null;
  busy: boolean;
  notice: string;
  /* 实时连接已终止且不会自动恢复；据此把「仍在生成」和「连接断开需手动检查」区分开。 */
  connectionLost: boolean;
};

export type InterviewAction =
  | { type: 'reset' }
  | { type: 'restore_start' }
  | { type: 'session'; session: InterviewSession }
  | { type: 'draft'; draft: string }
  | { type: 'token'; content: string }
  | { type: 'stream_phase'; phase: AiOperationPhase }
  | { type: 'stream_result'; session: InterviewSession; basisSummary: string[] }
  | { type: 'event'; event: AgentStreamEvent }
  | { type: 'report'; report: InterviewReport }
  | { type: 'busy'; busy: boolean }
  | { type: 'notice'; notice: string }
  | { type: 'clear_stream' }
  | { type: 'connection_lost'; message: string }
  | { type: 'failure'; message: string };

export const INITIAL_INTERVIEW_STATE: InterviewViewState = {
  session: null,
  draft: '',
  streamingText: '',
  phase: null,
  basisSummary: [],
  events: [],
  report: null,
  busy: false,
  notice: '选择训练岗位后，开始你的模拟面试。',
  connectionLost: false,
};

export function interviewSessionProgress(session: InterviewSession | null) {
  return {
    answered: session?.turns.filter((turn) => turn.role === 'candidate').length ?? 0,
    stage: session?.stage ?? null,
    status: session?.status ?? 'idle',
  } as const;
}

export function interviewReducer(
  state: InterviewViewState,
  action: InterviewAction,
): InterviewViewState {
  if (action.type === 'reset') {
    return { ...INITIAL_INTERVIEW_STATE, busy: true };
  }
  if (action.type === 'restore_start') {
    return { ...INITIAL_INTERVIEW_STATE, draft: state.draft, busy: true };
  }
  if (action.type === 'failure') {
    return { ...state, busy: false, notice: action.message };
  }
  if (action.type === 'connection_lost') {
    return { ...state, busy: false, notice: action.message, connectionLost: true };
  }
  return reduceUpdate(state, action);
}

type InterviewUpdateAction = Exclude<
  InterviewAction,
  { type: 'reset' } | { type: 'restore_start' } | { type: 'failure' } | { type: 'connection_lost' }
>;

function reduceUpdate(
  state: InterviewViewState,
  action: InterviewUpdateAction,
): InterviewViewState {
  return reduceStreamUpdate(state, action) ?? reduceBusinessUpdate(state, action);
}

function reduceStreamUpdate(
  state: InterviewViewState,
  action: InterviewUpdateAction,
): InterviewViewState | null {
  if (action.type === 'token') {
    return { ...state, streamingText: state.streamingText + action.content };
  }
  if (action.type === 'stream_phase') return { ...state, phase: action.phase };
  if (action.type === 'stream_result') {
    return {
      ...state,
      session: action.session,
      streamingText: '',
      phase: null,
      basisSummary: action.basisSummary,
      connectionLost: false,
    };
  }
  if (action.type === 'clear_stream') {
    return { ...state, streamingText: '', phase: null, basisSummary: [] };
  }
  return null;
}

function reduceBusinessUpdate(
  state: InterviewViewState,
  action: InterviewUpdateAction,
): InterviewViewState {
  switch (action.type) {
    case 'session':
      /* 拿到最新会话快照即视为链路可用，断开提示随之撤销。 */
      return { ...state, session: action.session, connectionLost: false };
    case 'draft':
      return { ...state, draft: action.draft };
    case 'event':
      return { ...state, events: appendEvent(state.events, action.event) };
    case 'report':
      return { ...state, report: action.report, busy: false };
    case 'busy':
      return { ...state, busy: action.busy };
    case 'notice':
      return { ...state, notice: action.notice };
  }
  return state;
}

function appendEvent(events: AgentStreamEvent[], event: AgentStreamEvent): AgentStreamEvent[] {
  return [event, ...events].slice(0, EVENT_HISTORY_LIMIT);
}
