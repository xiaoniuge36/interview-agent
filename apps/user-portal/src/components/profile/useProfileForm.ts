'use client';

import { useState, type FormEvent } from 'react';
import { UpsertProfileInputSchema, type ProfilePayload } from '@interview-agent/contracts';
import { upsertProfile } from '@/lib/workspace-api';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { profileFormFrom, profileInput, type ProfileFormValue } from './profile-form';

export function useProfileForm(
  initialProfile: ProfilePayload,
  onChanged: (payload: ProfilePayload) => void,
) {
  const notifications = useNotifications();
  const [form, setForm] = useState(() => profileFormFrom(initialProfile));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('填写真实经历，AI 会据此匹配问题与复盘建议。');
  const update = <Key extends keyof ProfileFormValue>(key: Key, value: ProfileFormValue[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = UpsertProfileInputSchema.safeParse(profileInput(form));
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? '请补全个人画像后再保存。';
      setMessage(issue);
      notifications.error('个人画像未保存', new Error(issue), issue);
      return;
    }
    setBusy(true);
    try {
      const payload = await upsertProfile(parsed.data);
      onChanged(payload);
      setMessage('个人画像已保存，新的训练重点已准备好。');
      notifications.success('个人画像已保存', 'Agent 记忆已根据服务端结果同步更新。');
    } catch (error) {
      setMessage(errorMessage(error));
      notifications.error('个人画像保存失败', error, '个人画像保存失败，请稍后重试。');
    } finally {
      setBusy(false);
    }
  }

  return { form, busy, message, update, submit };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '个人画像保存失败，请稍后重试。';
}
