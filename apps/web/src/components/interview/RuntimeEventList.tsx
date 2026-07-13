import type { AgentStreamEvent } from '@interview-agent/contracts';

const TRACE_PREVIEW_LENGTH = 8;

type RuntimeEventListProps = {
  events: AgentStreamEvent[];
};

export function RuntimeEventList({ events }: RuntimeEventListProps) {
  return (
    <section className="panel stack compact">
      <div className="eyebrow">Runtime Events</div>
      {events.length === 0 ? <p className="muted-text">暂无运行事件。</p> : null}
      {events.map((event) => (
        <div className="event-row" key={event.eventId}>
          <strong>{event.type}</strong>
          <span title={event.traceId}>{event.traceId.slice(0, TRACE_PREVIEW_LENGTH)}</span>
        </div>
      ))}
    </section>
  );
}
