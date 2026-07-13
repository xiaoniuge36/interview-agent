import { CONTRACT_LIMITS } from '@interview-agent/contracts';
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
    </>
  );
}

function ProfileIdentityFields(props: ProfileFieldsProps) {
  return (
    <div className="grid-2">
      <label className="label" htmlFor="profile-target-role">
        目标岗位
        <input
          id="profile-target-role"
          className="input"
          required
          minLength={2}
          maxLength={CONTRACT_LIMITS.shortText}
          value={props.value.targetRole}
          onChange={(event) => props.onChange('targetRole', event.target.value)}
        />
      </label>
      <label className="label" htmlFor="profile-years">
        工作年限
        <input
          id="profile-years"
          className="input"
          type="number"
          required
          min={0}
          max={CONTRACT_LIMITS.maximumExperienceYears}
          value={props.value.yearsOfExperience}
          onChange={(event) => {
            props.onChange('yearsOfExperience', Number(event.target.value));
          }}
        />
      </label>
    </div>
  );
}

function ProfileEvidenceFields(props: ProfileFieldsProps) {
  return (
    <>
      <label className="label" htmlFor="profile-tech-stacks">
        技术栈（逗号分隔）
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
        简历摘要
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
      <label className="label" htmlFor="profile-projects">
        项目经历（每行一项）
        <textarea
          id="profile-projects"
          className="textarea"
          required
          minLength={CONTRACT_LIMITS.minimumProjectExperience}
          maxLength={CONTRACT_LIMITS.longText}
          value={props.value.projectExperiences}
          onChange={(event) => {
            props.onChange('projectExperiences', event.target.value);
          }}
        />
      </label>
    </>
  );
}

function ProfileLevelField(props: ProfileFieldsProps) {
  return (
    <label className="label" htmlFor="profile-current-level">
      当前能力水平
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
