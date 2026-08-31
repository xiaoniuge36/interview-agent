import type { AgentStreamEvent } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { formatClockTime } from '@/lib/format';
import { RuntimeEventList } from './RuntimeEventList';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const OCCURRED_AT = '2026-08-31T02:05:00.000Z';

describe('RuntimeEventList', () => {
  it('renders event times in the local timezone instead of raw UTC slices', () => {
    const markup = renderToStaticMarkup(
      createElement(RuntimeEventList, {
        events: [event()],
        phase: null,
        basisSummary: [],
      }),
    );

    expect(markup).toContain('已记录你的回答');
    expect(markup).toContain(`<span>${formatClockTime(OCCURRED_AT)}</span>`);
    // 固定时区换算一次，证明展示走的是本地时区而不是 ISO 截断。
    expect(formatClockTime(OCCURRED_AT, { timeZone: 'Asia/Shanghai' })).toBe('10:05');
  });

  it('keeps the empty guidance before any event arrives', () => {
    const markup = renderToStaticMarkup(
      createElement(RuntimeEventList, { events: [], phase: null, basisSummary: [] }),
    );

    expect(markup).toContain('开始面试后，这里会显示本轮问题、追问和复盘的生成进度。');
  });
});

function event(): AgentStreamEvent {
  return {
    type: 'turn_completed',
    eventId: 'event-1',
    sessionId: 'session-1',
    commandId: 'command-1',
    sequence: 1,
    occurredAt: OCCURRED_AT,
    traceId: 'trace-runtime-events-1',
  } as AgentStreamEvent;
}
