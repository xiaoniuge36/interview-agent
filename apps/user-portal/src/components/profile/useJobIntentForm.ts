'use client';

import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import {
  CreateJobIntentInputSchema,
  type CreateJobIntentInput,
  type JobIntent,
  type JobIntentPayload,
} from '@interview-agent/contracts';
import { createJobIntent } from '@/lib/workspace-api';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { handoffSavedJob, jobSubmitAction, type JobSubmitAction } from '@/lib/job-handoff';
import {
  DEFAULT_JOB_FORM,
  focusFirstInvalidJobField,
  jobFormFromRole,
  jobFormFromSavedIntent,
  updateJobForm,
} from './job-form';
import { createExclusiveJobSubmissionRunner } from './job-submission-single-flight';

type JobIntentCallbacks = {
  onCreated: (payload: JobIntentPayload) => void;
  onStart: (payload: JobIntentPayload) => void;
  savedIntent?: JobIntent | null;
};

export function useJobIntentForm(callbacks: JobIntentCallbacks) {
  const savedIntent = callbacks.savedIntent ?? null;
  const [form, setForm] = useState<CreateJobIntentInput>(() =>
    savedIntent ? jobFormFromSavedIntent(savedIntent) : DEFAULT_JOB_FORM,
  );
  const [message, setMessage] = useState(() =>
    savedIntent
      ? `已载入上次保存的「${savedIntent.targetRole}」，可直接修改后重新保存。`
      : '系统不会替你假定岗位；先选择岗位模板预填，或粘贴真实 JD。',
  );
  const update = <Key extends keyof CreateJobIntentInput>(
    key: Key,
    value: CreateJobIntentInput[Key],
  ) => setForm((current) => updateJobForm(current, key, value));

  function applyRoleTemplate(title: string) {
    setForm(jobFormFromRole(title));
    setMessage('已载入「' + title + '」岗位模型，可继续替换为你的真实 JD。');
  }

  const submission = useJobSubmission({ callbacks, form, setMessage });
  return { form, message, update, applyRoleTemplate, ...submission };
}

function useJobSubmission({
  callbacks,
  form,
  setMessage,
}: {
  callbacks: JobIntentCallbacks;
  form: CreateJobIntentInput;
  setMessage: Dispatch<SetStateAction<string>>;
}) {
  const notifications = useNotifications();
  const [busy, setBusy] = useState(false);
  const [activeAction, setActiveAction] = useState<JobSubmitAction | null>(null);
  const [submission] = useState(createExclusiveJobSubmissionRunner);
  useEffect(() => submission.invalidate, [submission]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const action = jobSubmitAction(submitter?.value);
    const parsed = CreateJobIntentInputSchema.safeParse(form);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? '请补全岗位信息后再保存。';
      setMessage(issue);
      focusFirstInvalidJobField(parsed.error.issues, focusJobField);
      notifications.error('目标岗位未保存', new Error(issue), issue);
      return;
    }
    await submission.run({
      submit: () => createJobIntent(parsed.data),
      onStart: () => {
        setBusy(true);
        setActiveAction(action);
      },
      onSuccess: (payload) => {
        callbacks.onCreated(payload);
        setMessage(successMessage(action));
        notifications.success('目标岗位已保存', 'Agent 推荐与下一场模拟已使用新的岗位模型。');
        handoffSavedJob(action, payload, callbacks.onStart);
      },
      onError: (error) => {
        setMessage(errorMessage(error));
        notifications.error('目标岗位保存失败', error, '岗位目标保存失败，请稍后重试。');
      },
      onSettled: () => {
        setBusy(false);
        setActiveAction(null);
      },
    });
  }

  return { activeAction, busy, submit };
}

function focusJobField(id: string): void {
  document.getElementById(id)?.focus();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '岗位目标保存失败，请稍后重试。';
}

function successMessage(action: JobSubmitAction): string {
  return action === 'save'
    ? '岗位目标已保存，可继续完善或开始模拟面试。'
    : '岗位目标已保存，正在进入针对性模拟面试。';
}
