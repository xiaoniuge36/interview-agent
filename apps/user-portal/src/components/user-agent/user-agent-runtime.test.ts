import { describe, expect, it, vi } from 'vitest';
import {
  appendPageAgentExecutionStep,
  buildUserAgentInstructions,
  createUserPageAgentRuntimeTools,
  createUserAgentRuntimeInstructions,
  formatUserAgentConversationContext,
  hidePageAgentHighlightsAfterUpdate,
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

describe('createUserAgentRuntimeInstructions', () => {
  it('reads the latest conversation context for every page-instruction call', () => {
    let context = '第一轮摘要';
    const instructions = createUserAgentRuntimeInstructions({
      getConversationContext: () => context,
      pageContext: '当前在练习空间。',
    });

    expect(instructions.system).toContain('未经用户确认');
    expect(instructions.getPageInstructions('https://app.test/practice')).toContain('第一轮摘要');

    context = '第二轮摘要';

    const latest = instructions.getPageInstructions('https://app.test/practice');
    expect(latest).toContain('当前在练习空间。');
    expect(latest).toContain('第二轮摘要');
    expect(latest).not.toContain('第一轮摘要');
  });
});

describe('User Agent runtime tool boundary', () => {
  it('retains project read/navigation tools while disabling default page mutation tools', () => {
    const tools = createUserPageAgentRuntimeTools((options) => options);

    expect(tools.navigate_user_view).toBeDefined();
    expect(tools.get_practice_recommendations).toBeDefined();
    expect(tools.get_mastery_summary).toBeDefined();
    expect(tools.get_recent_practice).toBeDefined();
    expect(tools.get_profile_summary).toBeDefined();
    expect(tools.click_element_by_index).toBeNull();
    expect(tools.input_text).toBeNull();
    expect(tools.select_dropdown_option).toBeNull();
    expect(tools.execute_javascript).toBeNull();
    expect(tools.scroll_horizontally).toBeNull();
  });
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
