import type { AiOperationPhase, AgentStreamEvent } from '@interview-agent/contracts';

const ISO_TIME_START_INDEX = 11;
const ISO_TIME_END_INDEX = 16;
const MAX_BASIS_SUMMARY_ITEMS = 3;

const EVENT_LABELS: Record<AgentStreamEvent['type'], string> = {
  workflow_started: 'AI 面试官正在准备本轮问题',
  stage_changed: '已进入新的考察阶段',
  token: 'AI 面试官正在组织追问',
  turn_completed: '已记录你的回答',
  report_ready: '本轮复盘已生成',
  error: '本轮训练出现异常',
};

type RuntimeEventListProps = {
  events: AgentStreamEvent[];
  phase: AiOperationPhase | null;
  basisSummary: string[];
};

const PHASE_LABELS: Record<AiOperationPhase, string> = {
  preparing: '正在连接你的默认模型',
  analyzing: '正在提取本轮回答中的有效信息',
  composing: '正在组织下一轮问题',
  validating: '正在核对模型返回结果',
  saving: '正在保存本轮结果',
};

export function RuntimeEventList({ events, phase, basisSummary }: RuntimeEventListProps) {
  return (
    <section className="panel stack compact">
      <div className="eyebrow">本轮进度</div>
      {phase ? (
        <div className="event-row event-row-active">
          <strong>{PHASE_LABELS[phase]}</strong>
          <span>进行中</span>
        </div>
      ) : null}
      {events.length === 0 ? (
        <p className="muted-text">开始面试后，这里会显示本轮问题、追问和复盘的生成进度。</p>
      ) : null}
      {events.map((event) => (
        <div className="event-row" key={event.eventId}>
          <strong>{EVENT_LABELS[event.type]}</strong>
          <span>{event.occurredAt.slice(ISO_TIME_START_INDEX, ISO_TIME_END_INDEX)}</span>
        </div>
      ))}
      {basisSummary.length ? (
        <div className="interview-basis-summary">
          <strong>本轮关注依据</strong>
          <ul>
            {basisSummary.slice(0, MAX_BASIS_SUMMARY_ITEMS).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
