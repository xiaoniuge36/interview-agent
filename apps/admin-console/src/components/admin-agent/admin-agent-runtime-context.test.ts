import { describe, expect, it, vi } from 'vitest';
import {
  appendPageAgentExecutionStep,
  buildAdminAgentInstructions,
  hidePageAgentHighlightsAfterUpdate,
  formatAdminAgentConversationContext,
  PAGE_AGENT_VISUAL_MASK_ENABLED,
  shouldShowPageAgentVisualFeedback,
} from './admin-agent-runtime';

describe('admin agent runtime conversation context', () => {
  it('keeps only readable user and assistant messages for a resumed conversation', () => {
    expect(
      formatAdminAgentConversationContext([
        { role: 'user', content: '查询待审核导入' },
        { role: 'assistant', content: '发现 2 个批次' },
        { role: 'error', content: '网络错误' },
      ]),
    ).toContain('用户：查询待审核导入\n助手：发现 2 个批次');
    expect(formatAdminAgentConversationContext([{ role: 'error', content: '只保留错误' }])).toBe(
      '',
    );
  });
});

describe('buildAdminAgentInstructions', () => {
  it('adds current page constraints without dropping sensitive operation safeguards', () => {
    const instructions = buildAdminAgentInstructions(
      undefined,
      '当前在审核工作台，只解释和定位，不执行审核、发布或批量处理。',
    );

    expect(instructions).toContain('当前在审核工作台，只解释和定位，不执行审核、发布或批量处理。');
    expect(instructions).toContain('审核、发布、停用账号');
  });
});

it('enables the administration interaction animation without keeping element labels', () => {
  expect(PAGE_AGENT_VISUAL_MASK_ENABLED).toBe(true);
});

it('shows the interaction animation only for real page controls', () => {
  expect(
    shouldShowPageAgentVisualFeedback({
      type: 'executing',
      tool: 'click_element_by_index',
      input: { index: 3 },
    }),
  ).toBe(true);
  expect(
    shouldShowPageAgentVisualFeedback({
      type: 'executing',
      tool: 'get_runtime_failures',
      input: {},
    }),
  ).toBe(false);
});

it('clears Page Agent element labels immediately after the workspace is indexed', () => {
  const controller = new EventTarget() as EventTarget & {
    cleanUpHighlights: ReturnType<typeof vi.fn>;
  };
  controller.cleanUpHighlights = vi.fn();

  hidePageAgentHighlightsAfterUpdate(controller);
  controller.dispatchEvent(new Event('afterUpdate'));

  expect(controller.cleanUpHighlights).toHaveBeenCalledTimes(1);
});

it('keeps a completed tool invocation in the visible execution trace', () => {
  const running = appendPageAgentExecutionStep([], {
    type: 'executing',
    tool: 'get_runtime_failures',
    input: {},
  });
  const completed = appendPageAgentExecutionStep(running, {
    type: 'executed',
    tool: 'get_runtime_failures',
    input: {},
    output: 'ok',
    duration: 42,
  });

  expect(completed).toEqual([
    {
      key: 'get_runtime_failures',
      label: '已完成查询运行异常',
      state: 'completed',
    },
  ]);
});
