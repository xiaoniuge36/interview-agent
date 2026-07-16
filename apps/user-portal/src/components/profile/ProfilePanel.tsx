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
    <form
      className="panel stack agent-form-panel profile-form-panel"
      onSubmit={controller.submit}
      noValidate={false}
    >
      <div className="profile-panel-heading">
        <div className="eyebrow">候选人上下文</div>
        <h2 className="h2">能力与项目证据</h2>
        <p className="muted-text">只填写会影响面试的问题：目标岗位、经验、技术栈和项目证据。</p>
      </div>
      <ProfileFields value={controller.form} onChange={controller.update} />
      <div className="row-between profile-form-actions">
        <button className="button" type="submit" disabled={controller.busy}>
          {controller.busy ? '正在更新 Agent 记忆…' : '保存并更新 Agent 记忆'}
        </button>
        <span id="profile-status" className="profile-form-status" aria-live="polite">
          <i aria-hidden="true" />
          {controller.message}
        </span>
      </div>
    </form>
  );
}
