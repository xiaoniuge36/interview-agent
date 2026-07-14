import { describe, expect, it } from 'vitest';
import { interviewPlanForJob, ROLE_GROUPS, ROLE_TITLE_OPTIONS, roleInputFor } from './interview-roles';

describe('interview role templates', () => {
  it('covers core internet roles across six commercial role groups', () => {
    expect(ROLE_GROUPS).toHaveLength(6);
    expect(ROLE_TITLE_OPTIONS).toHaveLength(36);
    expect(ROLE_TITLE_OPTIONS).toEqual(
      expect.arrayContaining([
        '前端开发工程师',
        '后端开发工程师',
        '产品经理',
        '增长运营',
        '销售经理',
        'AI Agent 工程师',
        '客户成功经理',
        '解决方案架构师',
      ]),
    );
  });

  it('fills a valid default JD for a selected role', () => {
    const input = roleInputFor('产品经理');

    expect(input.targetRole).toBe('产品经理');
    expect(input.jdText.length).toBeGreaterThan(40);
    expect(input.companyContext).not.toBe('');
  });

  it('creates a role-specific interview plan from the selected job', () => {
    const plan = interviewPlanForJob({
      intent: { targetRole: '后端开发工程师' },
      profile: { interviewFocus: ['系统设计', '稳定性'] },
    } as never);

    expect(plan.title).toBe('后端开发工程师面试训练');
    expect(plan.focusTags).toEqual(['系统设计', '稳定性']);
  });
});