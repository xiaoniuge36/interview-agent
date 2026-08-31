import { CONTRACT_LIMITS, type CreateJobIntentInput } from '@interview-agent/contracts';
import { FieldIcon } from '@/components/FieldIcon';
import { ROLE_GROUPS, ROLE_TITLE_OPTIONS } from '@/lib/interview-roles';

type JobIntentFieldsProps = {
  value: CreateJobIntentInput;
  onChange: <Key extends keyof CreateJobIntentInput>(
    key: Key,
    value: CreateJobIntentInput[Key],
  ) => void;
  onApplyRole: (title: string) => void;
};

export function JobIntentFields(props: JobIntentFieldsProps) {
  return (
    <>
      <RoleTemplatePicker value={props.value.targetRole} onApplyRole={props.onApplyRole} />
      <label className="label" htmlFor="job-target-role">
        <span className="field-label-title">
          <FieldIcon name="briefcase" />
          目标岗位
        </span>
        <input
          id="job-target-role"
          className="input"
          list="role-title-options"
          required
          minLength={2}
          maxLength={CONTRACT_LIMITS.shortText}
          value={props.value.targetRole}
          onChange={(event) => props.onChange('targetRole', event.target.value)}
        />
      </label>
      <label className="label" htmlFor="job-description">
        <span className="field-label-title">
          <FieldIcon name="document" />
          岗位 JD
        </span>
        <textarea
          id="job-description"
          className="textarea large"
          required
          minLength={CONTRACT_LIMITS.minimumJobDescription}
          maxLength={CONTRACT_LIMITS.longText}
          value={props.value.jdText}
          onChange={(event) => props.onChange('jdText', event.target.value)}
        />
        <JdLengthCounter length={props.value.jdText.length} />
      </label>
      <JobContextFields {...props} />
      <datalist id="role-title-options">
        {ROLE_TITLE_OPTIONS.map((title) => (
          <option key={title} value={title} />
        ))}
      </datalist>
    </>
  );
}

const JD_LENGTH_WARNING_RATIO = 0.9;

/** 接近 maxLength 时提前警示，避免粘贴长 JD 被浏览器静默截断而毫无反馈。 */
function JdLengthCounter({ length }: { length: number }) {
  const max = CONTRACT_LIMITS.longText;
  const nearLimit = length >= max * JD_LENGTH_WARNING_RATIO;
  return (
    <small
      className="jd-length-counter"
      data-warning={nearLimit ? 'true' : undefined}
      aria-live="polite"
    >
      当前 {length} / 上限 {max} 字
    </small>
  );
}

function RoleTemplatePicker({
  value,
  onApplyRole,
}: Pick<JobIntentFieldsProps, 'onApplyRole'> & { value: string }) {
  return (
    <section className="role-template-picker" aria-labelledby="role-template-heading">
      <div className="role-template-heading">
        <div>
          <span className="eyebrow" id="role-template-heading">
            岗位模板库
          </span>
          <p>先选择接近的岗位方向，系统会自动填充训练用 JD、公司背景和表达重点。</p>
        </div>
        <span className="role-template-count">
          {ROLE_TITLE_OPTIONS.length} 个岗位 · 6 个岗位族群
        </span>
      </div>
      <div className="role-template-groups motion-stagger">
        {ROLE_GROUPS.map((group) => (
          <div className="role-template-group" key={group.group}>
            <strong>{group.group}</strong>
            <div className="role-chip-list">
              {group.roles.map((role) => (
                <button
                  className={role.title === value ? 'role-chip active' : 'role-chip'}
                  key={role.title}
                  type="button"
                  onClick={() => onApplyRole(role.title)}
                >
                  {role.title}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function JobContextFields(props: JobIntentFieldsProps) {
  return (
    <>
      <label className="label" htmlFor="job-company-context">
        <span className="field-label-title">
          <FieldIcon name="building" />
          目标公司 / 业务背景
        </span>
        <textarea
          id="job-company-context"
          className="textarea"
          maxLength={CONTRACT_LIMITS.longText}
          value={props.value.companyContext}
          onChange={(event) => props.onChange('companyContext', event.target.value)}
        />
      </label>
      <label className="label" htmlFor="job-communication">
        <span className="field-label-title">
          <FieldIcon name="message" />
          希望重点训练什么
        </span>
        <textarea
          id="job-communication"
          className="textarea"
          maxLength={CONTRACT_LIMITS.longText}
          value={props.value.communicationText}
          onChange={(event) => props.onChange('communicationText', event.target.value)}
        />
      </label>
      <label className="label" htmlFor="job-interview-date">
        <span className="field-label-title">
          <FieldIcon name="calendar" />
          目标面试日期（可选）
        </span>
        <input
          id="job-interview-date"
          className="input"
          type="date"
          value={dateInputValue(props.value.interviewDate)}
          onChange={(event) => props.onChange('interviewDate', dateInputToIso(event.target.value))}
        />
        <small className="muted-text">填写后，“今天”页会出现面试倒计时和每日备考任务。</small>
      </label>
    </>
  );
}

const DATE_INPUT_LENGTH = 'yyyy-mm-dd'.length;

function dateInputValue(interviewDate: string | null): string {
  return interviewDate?.slice(0, DATE_INPUT_LENGTH) ?? '';
}

function dateInputToIso(value: string): string | null {
  return value ? new Date(`${value}T09:00:00`).toISOString() : null;
}
