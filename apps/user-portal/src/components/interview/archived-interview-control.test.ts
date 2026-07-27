import { expect, it } from 'vitest';
import { archivedInterviewControl } from './archived-interview-control';

it('归档面试尚未恢复时禁用新建并解释加载状态', () => {
  expect(
    archivedInterviewControl({
      hasArchivedTarget: true,
      hasSession: false,
      busy: false,
      loadFailed: false,
    }),
  ).toEqual({ action: 'start', disabled: true, label: '正在恢复本轮…' });
});

it('归档面试加载失败时提供同 session 重试', () => {
  expect(
    archivedInterviewControl({
      hasArchivedTarget: true,
      hasSession: false,
      busy: false,
      loadFailed: true,
    }),
  ).toEqual({ action: 'retry', disabled: false, label: '重新加载本轮面试' });
});

it('没有归档目标时保留新建面试动作', () => {
  expect(
    archivedInterviewControl({
      hasArchivedTarget: false,
      hasSession: false,
      busy: false,
      loadFailed: false,
    }),
  ).toEqual({ action: 'start', disabled: false, label: '开始模拟面试' });
});

it('已有 session 时保留重新开始动作与 busy 状态', () => {
  expect(
    archivedInterviewControl({
      hasArchivedTarget: true,
      hasSession: true,
      busy: true,
      loadFailed: false,
    }),
  ).toEqual({ action: 'start', disabled: true, label: '重新开始本轮' });
});
