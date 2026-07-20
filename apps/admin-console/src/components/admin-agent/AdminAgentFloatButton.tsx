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
      <ellipse
        className="admin-agent-float-mark-orbit"
        cx="16"
        cy="16"
        rx="11.25"
        ry="7.4"
        transform="rotate(-28 16 16)"
      />
      <path
        className="admin-agent-float-mark-spark"
        d="m16 8.9 1.85 5.25 5.25 1.85-5.25 1.85L16 23.1l-1.85-5.25L8.9 16l5.25-1.85L16 8.9Z"
      />
      <circle className="admin-agent-float-mark-core" cx="16" cy="16" r="1.65" />
      <circle className="admin-agent-float-mark-node" cx="7.7" cy="22.2" r="1.25" />
    </svg>
  );
}
