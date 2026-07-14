import { CONTRACT_LIMITS } from '@interview-agent/contracts';
import { FieldIcon } from '@/components/FieldIcon';
import { ROLE_TITLE_OPTIONS } from '@/lib/interview-roles';
import type { ProfileFormValue } from './profile-form';

type ProfileFieldsProps = {
  value: ProfileFormValue;
  onChange: <Key extends keyof ProfileFormValue>(key: Key, value: ProfileFormValue[Key]) => void;
};

export function ProfileFields(props: ProfileFieldsProps) {
  return (
    <>
      <ProfileIdentityFields {...props} />
      <ProfileEvidenceFields {...props} />
      <ProfileLevelField {...props} />
      <datalist id="profile-role-options">
        {ROLE_TITLE_OPTIONS.map((title) => (
          <option key={title} value={title} />
        ))}
      </datalist>
    </>
  );
}

function ProfileIdentityFields(props: ProfileFieldsProps) {
  return (
    <div className="grid-2">
      <label className="label" htmlFor="profile-target-role">
        <span className="field-label-title">
          <FieldIcon name="target" />
          目标岗位
        </span>
        <input
          id="profile-target-role"
          className="input"
          list="profile-role-options"
          required
          minLength={2}
          maxLength={CONTRACT_LIMITS.shortText}
          value={props.value.targetRole}
          onChange={(event) => props.onChange('targetRole', event.target.value)}
        />
      </label>
      <label className="label" htmlFor="profile-years">
        <span className="field-label-title">
          <FieldIcon name="calendar" />
          工作年限
        </span>
        <input
          id="profile-years"
          className="input"
          type="number"
          required
          min={0}
          max={CONTRACT_LIMITS.maximumExperienceYears}
          value={props.value.yearsOfExperience}
          onChange={(event) => props.onChange('yearsOfExperience', Number(event.target.value))}
        />
      </label>
    </div>
  );
}

function ProfileEvidenceFields(props: ProfileFieldsProps) {
  return (
    <>
      <label className="label" htmlFor="profile-tech-stacks">
        <span className="field-label-title">
          <FieldIcon name="code" />
          核心技能 / 工具（逗号分隔）
        </span>
        <input
          id="profile-tech-stacks"
          className="input"
          required
          maxLength={CONTRACT_LIMITS.mediumText}
          value={props.value.techStacks}
          onChange={(event) => props.onChange('techStacks', event.target.value)}
        />
      </label>
      <label className="label" htmlFor="profile-resume-summary">
        <span className="field-label-title">
          <FieldIcon name="document" />
          个人概述 / 代表能力
        </span>
        <textarea
          id="profile-resume-summary"
          className="textarea"
          required
          minLength={CONTRACT_LIMITS.minimumResumeSummary}
          maxLength={CONTRACT_LIMITS.longText}
          value={props.value.resumeSummary}
          onChange={(event) => props.onChange('resumeSummary', event.target.value)}
        />
      </label>
      <ProfileProjectField {...props} />
    </>
  );
}

function ProfileProjectField(props: ProfileFieldsProps) {
  return (
    <label className="label" htmlFor="profile-projects">
      <span className="field-label-title">
        <FieldIcon name="briefcase" />
        项目 / 代表经历（每行一项）
      </span>
      <textarea
        id="profile-projects"
        className="textarea"
        required
        minLength={CONTRACT_LIMITS.minimumProjectExperience}
        maxLength={CONTRACT_LIMITS.longText}
        value={props.value.projectExperiences}
        onChange={(event) => props.onChange('projectExperiences', event.target.value)}
      />
    </label>
  );
}

function ProfileLevelField(props: ProfileFieldsProps) {
  return (
    <label className="label" htmlFor="profile-current-level">
      <span className="field-label-title">
        <FieldIcon name="sparkle" />
        当前能力水平
      </span>
      <input
        id="profile-current-level"
        className="input"
        required
        minLength={2}
        maxLength={CONTRACT_LIMITS.shortText}
        value={props.value.currentLevel}
        onChange={(event) => props.onChange('currentLevel', event.target.value)}
      />
    </label>
  );
}
