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
        <div className="eyebrow">Profile Memory</div>
        <h2 className="h2">候选人画像</h2>
        <p className="muted-text">
          前端只提交结构化资料，权限判断和能力评分统一由 Product API 完成。
        </p>
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
