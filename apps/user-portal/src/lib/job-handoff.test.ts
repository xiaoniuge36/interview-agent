import type { JobIntentPayload } from '@interview-agent/contracts';
import { describe, expect, it, vi } from 'vitest';
import {
  handoffSavedJob,
  interviewHrefForJob,
  jobSubmitAction,
  preferredJobIntentId,
} from './job-handoff';

describe('job handoff', () => {
  it('distinguishes an explicit save from the save-and-start action', () => {
    expect(jobSubmitAction('save')).toBe('save');
    expect(jobSubmitAction('save_and_start')).toBe('save_and_start');
    expect(jobSubmitAction(undefined)).toBe('save');
  });

  it('creates an encoded interview deep link for the saved job', () => {
    expect(interviewHrefForJob('job / frontend')).toBe('/interview?job=job%20%2F%20frontend');
  });

  it('prefers a requested existing job and falls back to the newest job', () => {
    const jobs = [job('job-new'), job('job-older')];

    expect(preferredJobIntentId(jobs, 'job-older')).toBe('job-older');
    expect(preferredJobIntentId(jobs, 'missing')).toBe('job-new');
    expect(preferredJobIntentId([], 'missing')).toBe('');
  });

  it('hands off only after the save-and-start action succeeds', () => {
    const onStart = vi.fn();
    const saved = job('job-new');

    handoffSavedJob('save', saved, onStart);
    expect(onStart).not.toHaveBeenCalled();

    handoffSavedJob('save_and_start', saved, onStart);
    expect(onStart).toHaveBeenCalledOnce();
    expect(onStart).toHaveBeenCalledWith(saved);
  });
});

function job(id: string): JobIntentPayload {
  return { intent: { id } } as JobIntentPayload;
}
