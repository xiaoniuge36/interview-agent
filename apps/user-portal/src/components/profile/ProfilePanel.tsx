'use client';

import type { ProfilePayload } from '@interview-agent/contracts';
import { ProfileFields } from './ProfileFields';
import { useProfileForm } from './useProfileForm';

type ProfilePanelProps = {
  profile: ProfilePayload;
  onChanged: (payload: ProfilePayload) => void;
};

export function ProfilePanel({ profile, onChanged }: ProfilePanelProps) {
  const controller = useProfileForm(profile, onChanged);
  return (
    <form className="panel stack" onSubmit={controller.submit} noValidate={false}>
      <div>
        <div className="eyebrow">第一步</div>
        <h2 className="h2">建立候选人画像</h2>
        <p className="muted-text">只填写会影响面试的问题：目标岗位、经验、技术栈和项目证据。</p>
      </div>
      <ProfileFields value={controller.form} onChange={controller.update} />
      <div className="row-between">
        <button className="button" type="submit" disabled={controller.busy}>
          {controller.busy ? '保存中...' : '保存画像'}
        </button>
        <span id="profile-status" className="muted-text small-text" aria-live="polite">
          {controller.message}
        </span>
      </div>
    </form>
  );
}
