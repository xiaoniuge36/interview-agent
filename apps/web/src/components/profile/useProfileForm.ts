'use client';

import { useState, type FormEvent } from 'react';
import { UpsertProfileInputSchema, type ProfilePayload } from '@interview-agent/contracts';
import { upsertProfile } from '@/lib/workspace-api';
import { profileFormFrom, profileInput, type ProfileFormValue } from './profile-form';

export function useProfileForm(
  initialProfile: ProfilePayload,
  onChanged: (payload: ProfilePayload) => void,
) {
  const [form, setForm] = useState(() => profileFormFrom(initialProfile));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('画像会由 Product API 生成结构化能力快照。');
  const update = <Key extends keyof ProfileFormValue>(key: Key, value: ProfileFormValue[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = UpsertProfileInputSchema.safeParse(profileInput(form));
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? '画像输入不符合契约。');
      return;
    }
    setBusy(true);
    try {
      const payload = await upsertProfile(parsed.data);
      onChanged(payload);
      setMessage('画像已保存，并生成新的能力快照。');
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return { form, busy, message, update, submit };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '画像保存失败。';
}
