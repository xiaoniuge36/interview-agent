import { CreateJobIntentInputSchema, type JobIntent } from '@interview-agent/contracts';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_JOB_FORM,
  focusFirstInvalidJobField,
  jobFormFromRole,
  jobFormFromSavedIntent,
  updateJobForm,
} from './job-form';

describe('job intent first-use form', () => {
  it('starts blank and cannot be mistaken for an explicit role choice', () => {
    expect(DEFAULT_JOB_FORM).toEqual({
      targetRole: '',
      jdText: '',
      companyContext: '',
      communicationText: '',
      interviewDate: null,
    });
    expect(CreateJobIntentInputSchema.safeParse(DEFAULT_JOB_FORM).success).toBe(false);
  });

  it('fills a valid model only after the user chooses a role template', () => {
    const form = jobFormFromRole('全栈开发工程师');

    expect(form.targetRole).toBe('全栈开发工程师');
    expect(form.jdText.length).toBeGreaterThan(0);
    expect(CreateJobIntentInputSchema.safeParse(form).success).toBe(true);
  });

  it('keeps manual role and JD input without applying a hidden template', () => {
    const withRole = updateJobForm(DEFAULT_JOB_FORM, 'targetRole', 'AI Agent 工程师');
    const form = updateJobForm(
      withRole,
      'jdText',
      '负责构建可恢复的 Agent 工作流，设计评估体系、工具权限边界和线上故障恢复机制。',
    );

    expect(form).toMatchObject({
      targetRole: 'AI Agent 工程师',
      jdText: '负责构建可恢复的 Agent 工作流，设计评估体系、工具权限边界和线上故障恢复机制。',
    });
  });

  it('focuses the first schema issue so the error is recoverable', () => {
    const parsed = CreateJobIntentInputSchema.safeParse(DEFAULT_JOB_FORM);
    if (parsed.success) throw new Error('空岗位表单不应通过校验');
    const focus = vi.fn();

    expect(focusFirstInvalidJobField(parsed.error.issues, focus)).toBe('job-target-role');
    expect(focus).toHaveBeenCalledWith('job-target-role');
  });
});

describe('job intent returning-user form', () => {
  it('prefills the form from the last saved intent so users edit instead of retyping', () => {
    const intent: JobIntent = {
      id: 'intent-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      targetRole: '后端开发工程师',
      jdText: '负责高并发服务设计、稳定性治理与可观测性建设，能够清晰说明技术取舍和业务结果。',
      companyContext: undefined,
      communicationText: '重点训练系统设计表达。',
      interviewDate: '2026-09-15T09:00:00.000Z',
      status: 'ready',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    };

    const form = jobFormFromSavedIntent(intent);

    expect(form).toEqual({
      targetRole: '后端开发工程师',
      jdText: '负责高并发服务设计、稳定性治理与可观测性建设，能够清晰说明技术取舍和业务结果。',
      companyContext: '',
      communicationText: '重点训练系统设计表达。',
      interviewDate: '2026-09-15T09:00:00.000Z',
    });
    expect(CreateJobIntentInputSchema.safeParse(form).success).toBe(true);
  });
});
