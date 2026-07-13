'use client';

import { useState, type FormEvent } from 'react';
import {
  CreateJobIntentInputSchema,
  type CreateJobIntentInput,
  type JobIntentPayload,
} from '@interview-agent/contracts';
import { createJobIntent } from '@/lib/workspace-api';
import { DEFAULT_JOB_FORM } from './job-form';

export function useJobIntentForm(onCreated: (payload: JobIntentPayload) => void) {
  const [form, setForm] = useState<CreateJobIntentInput>(DEFAULT_JOB_FORM);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('提交 JD 后由后端生成结构化岗位意图。');
  const update = <Key extends keyof CreateJobIntentInput>(
    key: Key,
    value: CreateJobIntentInput[Key],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = CreateJobIntentInputSchema.safeParse(form);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'JD 输入不符合契约。');
      return;
    }
    setBusy(true);
    try {
      const payload = await createJobIntent(parsed.data);
      onCreated(payload);
      setMessage('JD 已分析，面试重点与风险信号已生成。');
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return { form, busy, message, update, submit };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '岗位意图生成失败。';
}
