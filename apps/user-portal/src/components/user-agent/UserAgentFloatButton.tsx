import '@/app/styles/user-agent-float.css';
import type { MouseEvent, PointerEvent } from 'react';
import type { AgentStatus } from '@page-agent/core';
import type { UserAgentFloatPosition } from './useUserAgentDrag';

export function UserAgentFloatButton(props: {
  open: boolean;
  position: UserAgentFloatPosition;
  status: AgentStatus;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  const className =
    process.env.NODE_ENV === 'development'
      ? 'user-agent-float development-float'
      : 'user-agent-float';
  const actionLabel = props.open ? '收起 AI 刷题教练' : '打开 AI 刷题教练';
  return (
    <button
      aria-controls="user-agent-drawer"
      aria-expanded={props.open}
      aria-label={actionLabel}
      className={className}
      data-page-agent-not-interactive="true"
      onClick={props.onClick}
      onPointerDown={props.onPointerDown}
      onPointerMove={props.onPointerMove}
      onPointerUp={props.onPointerUp}
      onPointerCancel={props.onPointerCancel}
      style={{ right: props.position.right, bottom: props.position.bottom }}
      title={actionLabel}
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

export function UserAgentMobileTrigger(props: {
  open: boolean;
  status: AgentStatus;
  onClick: () => void;
}) {
  const actionLabel = props.open ? '收起 AI 刷题教练' : '打开 AI 刷题教练';
  return (
    <button
      aria-controls="user-agent-drawer"
      aria-expanded={props.open}
      aria-label={actionLabel}
      className="user-agent-mobile-trigger"
      data-page-agent-not-interactive="true"
      onClick={props.onClick}
      title={actionLabel}
      type="button"
    >
      <CoachMark />
      <span
        aria-hidden="true"
        className={`user-agent-float-status${props.status === 'running' ? ' is-running' : ''}`}
      />
      <span aria-hidden="true" className="user-agent-mobile-label">
        教练
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
