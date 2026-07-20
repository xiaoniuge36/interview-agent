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
      <ellipse
        className="user-agent-float-mark-orbit"
        cx="16"
        cy="16"
        rx="11.2"
        ry="7.3"
        transform="rotate(-28 16 16)"
      />
      <path
        className="user-agent-float-mark-spark"
        d="m16 8.9 1.85 5.25 5.25 1.85-5.25 1.85L16 23.1l-1.85-5.25L8.9 16l5.25-1.85L16 8.9Z"
      />
      <circle className="user-agent-float-mark-core" cx="16" cy="16" r="1.65" />
      <circle className="user-agent-float-mark-node" cx="7.7" cy="22.2" r="1.25" />
    </svg>
  );
}
