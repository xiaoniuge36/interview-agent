import type { AgentStreamEvent } from '@interview-agent/contracts';

const ISO_TIME_START_INDEX = 11;
const ISO_TIME_END_INDEX = 16;

const EVENT_LABELS: Record<AgentStreamEvent['type'], string> = {
  workflow_started: '已开始准备问题',
  stage_changed: '正在进入下一阶段',
  token: '正在生成追问',
  turn_completed: '已记录本轮回答',
  report_ready: '复盘报告已生成',
  error: '本轮处理出现异常',
};

type RuntimeEventListProps = {
  events: AgentStreamEvent[];
};

export function RuntimeEventList({ events }: RuntimeEventListProps) {
  return (
    <section className="panel stack compact">
      <div className="eyebrow">本轮进度</div>
      {events.length === 0 ? (
        <p className="muted-text">开始面试后，这里会显示本轮问题与报告的生成进度。</p>
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
