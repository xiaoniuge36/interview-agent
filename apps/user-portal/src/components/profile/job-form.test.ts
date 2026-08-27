import { CreateJobIntentInputSchema } from '@interview-agent/contracts';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_JOB_FORM,
  focusFirstInvalidJobField,
  jobFormFromRole,
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
