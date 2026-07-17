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
};

export type InterviewAction =
  | { type: 'reset' }
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
};

export function interviewReducer(
  state: InterviewViewState,
  action: InterviewAction,
): InterviewViewState {
  if (action.type === 'reset') {
    return { ...INITIAL_INTERVIEW_STATE, busy: true };
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
      return { ...state, session: action.session };
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
