import { describe, expect, it, vi } from 'vitest';
import {
  appendPageAgentExecutionStep,
  buildUserAgentInstructions,
  formatUserAgentConversationContext,
  hidePageAgentHighlightsAfterUpdate,
  PAGE_AGENT_VISUAL_MASK_ENABLED,
  shouldShowPageAgentVisualFeedback,
} from './user-agent-runtime';

describe('formatUserAgentConversationContext', () => {
  it('keeps only recent user and assistant messages within the context budget', () => {
    const messages = [
      { role: 'error' as const, content: 'ignore me' },
      { role: 'user' as const, content: '第一条' },
      { role: 'assistant' as const, content: '第二条' },
    ];

    expect(formatUserAgentConversationContext(messages)).toBe('用户：第一条\n助手：第二条');
  });
});

describe('buildUserAgentInstructions', () => {
  it('adds current page constraints without dropping safety instructions', () => {
    const instructions = buildUserAgentInstructions(
      '历史会话内容',
      '当前在练习空间，只提供解题指导，不替用户保存或提交答案。',
    );

    expect(instructions).toContain('当前在练习空间，只提供解题指导，不替用户保存或提交答案。');
    expect(instructions).toContain('未经用户确认');
  });
});

it('enables the practice interaction animation without keeping element labels', () => {
  expect(PAGE_AGENT_VISUAL_MASK_ENABLED).toBe(true);
});

it('shows the interaction animation only for real page controls', () => {
  expect(
    shouldShowPageAgentVisualFeedback({
      type: 'executing',
      tool: 'input_text',
      input: { index: 3, text: 'Java' },
    }),
  ).toBe(true);
  expect(
    shouldShowPageAgentVisualFeedback({
      type: 'executing',
      tool: 'get_practice_recommendations',
      input: {},
    }),
  ).toBe(false);
});

it('clears Page Agent element labels immediately after the practice page is indexed', () => {
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
    tool: 'get_practice_recommendations',
    input: {},
  });
  const completed = appendPageAgentExecutionStep(running, {
    type: 'executed',
    tool: 'get_practice_recommendations',
    input: {},
    output: 'ok',
    duration: 42,
  });

  expect(completed).toEqual([
    {
      key: 'get_practice_recommendations',
      label: '已完成读取智能题单',
      state: 'completed',
    },
  ]);
});
