import { describe, expect, it } from 'vitest';
import {
  computeRetryDelay,
  extractSseFrames,
  isTerminalStreamStatus,
  parseSseFrame,
  parseStreamFrame,
  SseProtocolError,
} from './sse';

const EVENT = {
  type: 'workflow_started',
  eventId: 'event-1',
  sessionId: 'session-1',
  commandId: 'command-1',
  sequence: 1,
  occurredAt: '2026-07-10T00:00:00.000Z',
  traceId: 'trace-12345678',
};

describe('SSE parser', () => {
  it('按空行提取完整 frame 并保留余量', () => {
    const result = extractSseFrames('data: one\r\n\r\ndata: two');
    expect(result.frames).toEqual(['data: one']);
    expect(result.remainder).toBe('data: two');
  });

  it('合并多行 data 并解析 id 与 retry', () => {
    const frame = parseSseFrame('id: 7\nretry: 1500\ndata: one\ndata: two');
    expect(frame).toEqual({
      event: 'message',
      id: '7',
      retry: 1500,
      data: 'one\ntwo',
    });
  });

  it('忽略注释与未知字段', () => {
    const frame = parseSseFrame(': heartbeat\nunknown: value\ndata: ok');
    expect(frame).toEqual({ event: 'message', data: 'ok' });
  });

  it('解析合法 Agent 事件', () => {
    const frame = 'event: workflow_started\ndata: ' + JSON.stringify(EVENT);
    expect(parseStreamFrame(frame)).toEqual({ kind: 'event', event: EVENT });
  });

  it('解析合法 heartbeat', () => {
    const frame = 'event: heartbeat\ndata: {"timestamp":"2026-07-10T00:00:00.000Z"}';
    expect(parseStreamFrame(frame)).toEqual({ kind: 'heartbeat' });
  });

  it('拒绝缺少 data 字段的 frame', () => {
    expect(() => parseSseFrame('event: ping')).toThrow(SseProtocolError);
  });

  it('拒绝不符合事件契约的数据', () => {
    expect(() => parseStreamFrame('data: {"type":"unknown"}')).toThrow(SseProtocolError);
  });

  it('拒绝 event 名称与载荷类型不一致', () => {
    const frame = 'event: token\ndata: ' + JSON.stringify(EVENT);
    expect(() => parseStreamFrame(frame)).toThrow(SseProtocolError);
  });
});

describe('SSE retry policy', () => {
  it('按指数退避计算无 jitter 延迟', () => {
    expect(computeRetryDelay(1, () => 0.5)).toBe(500);
    expect(computeRetryDelay(10, () => 0.5)).toBe(8_000);
  });

  it('识别不可重试的客户端状态码', () => {
    expect(isTerminalStreamStatus(400)).toBe(true);
    expect(isTerminalStreamStatus(401)).toBe(true);
    expect(isTerminalStreamStatus(403)).toBe(true);
    expect(isTerminalStreamStatus(500)).toBe(false);
  });
});
