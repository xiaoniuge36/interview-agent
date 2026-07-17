'use client';

import { useState, type FormEvent } from 'react';
import {
  CreateJobIntentInputSchema,
  type CreateJobIntentInput,
  type JobIntentPayload,
} from '@interview-agent/contracts';
import { roleInputFor } from '@/lib/interview-roles';
import { createJobIntent } from '@/lib/workspace-api';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { DEFAULT_JOB_FORM } from './job-form';

export function useJobIntentForm(onCreated: (payload: JobIntentPayload) => void) {
  const notifications = useNotifications();
  const [form, setForm] = useState<CreateJobIntentInput>(DEFAULT_JOB_FORM);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('选择岗位模板预填内容，也可以直接粘贴真实 JD。');
  const update = <Key extends keyof CreateJobIntentInput>(
    key: Key,
    value: CreateJobIntentInput[Key],
  ) => setForm((current) => ({ ...current, [key]: value }));

  function applyRoleTemplate(title: string) {
    setForm(roleInputFor(title));
    setMessage('已载入「' + title + '」岗位模型，可继续替换为你的真实 JD。');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = CreateJobIntentInputSchema.safeParse(form);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? '请补全岗位信息后再保存。';
      setMessage(issue);
      notifications.error('目标岗位未保存', new Error(issue), issue);
      return;
    }
    setBusy(true);
    try {
      const payload = await createJobIntent(parsed.data);
      onCreated(payload);
      setMessage('岗位目标已保存，下一场模拟会围绕重点能力展开追问。');
      notifications.success('目标岗位已保存', 'Agent 推荐与下一场模拟已使用新的岗位模型。');
    } catch (error) {
      setMessage(errorMessage(error));
      notifications.error('目标岗位保存失败', error, '岗位目标保存失败，请稍后重试。');
    } finally {
      setBusy(false);
    }
  }

  return { form, busy, message, update, applyRoleTemplate, submit };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '岗位目标保存失败，请稍后重试。';
}
