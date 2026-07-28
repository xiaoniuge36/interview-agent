import type { PointerEvent } from 'react';
import type { AgentStatus } from '@page-agent/core';
import type { FloatPosition } from './useAdminAgentDrag';

export function AdminAgentFloatButton({
  position,
  status,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  position: FloatPosition;
  status: AgentStatus;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      aria-label="打开智能运营助手"
      className="admin-agent-float"
      data-page-agent-not-interactive="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{ right: position.right, bottom: position.bottom }}
      title="打开智能运营助手（可拖动）"
      type="button"
    >
      <AdminAgentMark />
      <span
        aria-hidden="true"
        className={`admin-agent-float-status${status === 'running' ? ' is-running' : ''}`}
      />
      <span aria-hidden="true" className="admin-agent-float-label">
        智能运营助手
      </span>
    </button>
  );
}

function AdminAgentMark() {
  return (
    <svg aria-hidden="true" className="admin-agent-float-mark" fill="none" viewBox="0 0 32 32">
      <path
        className="admin-agent-float-mark-monogram"
        d="M8.25 9.5h5.2M10.85 9.5v13M8.25 22.5h5.2M15.8 22.5l4.7-13 4.7 13"
      />
      <path className="admin-agent-float-mark-accent" d="M17.5 18h6" />
    </svg>
  );
}
