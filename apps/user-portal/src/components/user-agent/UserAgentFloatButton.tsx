import type { PointerEvent } from 'react';
import type { AgentStatus } from '@page-agent/core';
import type { UserAgentFloatPosition } from './useUserAgentDrag';

export function UserAgentFloatButton(props: {
  position: UserAgentFloatPosition;
  status: AgentStatus;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      aria-label="打开 AI 刷题教练"
      className="user-agent-float"
      data-page-agent-not-interactive="true"
      onPointerDown={props.onPointerDown}
      onPointerMove={props.onPointerMove}
      onPointerUp={props.onPointerUp}
      onPointerCancel={props.onPointerCancel}
      style={{ right: props.position.right, bottom: props.position.bottom }}
      title="打开 AI 刷题教练（可拖动）"
      type="button"
    >
      <CoachMark />
      <span
        aria-hidden="true"
        className={`user-agent-float-status${props.status === 'running' ? ' is-running' : ''}`}
      />
      <span aria-hidden="true" className="user-agent-float-label">
        AI 刷题教练
      </span>
    </button>
  );
}

function CoachMark() {
  return (
    <svg aria-hidden="true" className="user-agent-float-mark" fill="none" viewBox="0 0 32 32">
      <path
        className="user-agent-float-mark-monogram"
        d="M8.25 9.5h5.2M10.85 9.5v13M8.25 22.5h5.2M15.8 22.5l4.7-13 4.7 13"
      />
      <path className="user-agent-float-mark-accent" d="M17.5 18h6" />
    </svg>
  );
}
