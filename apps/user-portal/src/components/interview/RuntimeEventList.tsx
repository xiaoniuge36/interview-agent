import type { AgentStreamEvent } from '@interview-agent/contracts';

const ISO_TIME_START_INDEX = 11;
const ISO_TIME_END_INDEX = 16;

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
};

export function RuntimeEventList({ events }: RuntimeEventListProps) {
  return (
    <section className="panel stack compact">
      <div className="eyebrow">本轮进度</div>
      {events.length === 0 ? (
        <p className="muted-text">开始面试后，这里会显示本轮问题、追问和复盘的生成进度。</p>
      ) : null}
      {events.map((event) => (
        <div className="event-row" key={event.eventId}>
          <strong>{EVENT_LABELS[event.type]}</strong>
          <span>{event.occurredAt.slice(ISO_TIME_START_INDEX, ISO_TIME_END_INDEX)}</span>
        </div>
      ))}
    </section>
  );
}

