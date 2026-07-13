import { CONTRACT_LIMITS, type CreateJobIntentInput } from '@interview-agent/contracts';

type JobIntentFieldsProps = {
  value: CreateJobIntentInput;
  onChange: <Key extends keyof CreateJobIntentInput>(
    key: Key,
    value: CreateJobIntentInput[Key],
  ) => void;
};

export function JobIntentFields(props: JobIntentFieldsProps) {
  return (
    <>
      <label className="label" htmlFor="job-target-role">
        岗位名称
        <input
          id="job-target-role"
          className="input"
          required
          minLength={2}
          maxLength={CONTRACT_LIMITS.shortText}
          value={props.value.targetRole}
          onChange={(event) => props.onChange('targetRole', event.target.value)}
        />
      </label>
      <label className="label" htmlFor="job-description">
        JD 原文
        <textarea
          id="job-description"
          className="textarea large"
          required
          minLength={CONTRACT_LIMITS.minimumJobDescription}
          maxLength={CONTRACT_LIMITS.longText}
          value={props.value.jdText}
          onChange={(event) => props.onChange('jdText', event.target.value)}
        />
      </label>
      <JobContextFields {...props} />
    </>
  );
}

function JobContextFields(props: JobIntentFieldsProps) {
  return (
    <>
      <label className="label" htmlFor="job-company-context">
        公司上下文
        <textarea
          id="job-company-context"
          className="textarea"
          maxLength={CONTRACT_LIMITS.longText}
          value={props.value.companyContext}
          onChange={(event) => props.onChange('companyContext', event.target.value)}
        />
      </label>
      <label className="label" htmlFor="job-communication">
        沟通记录
        <textarea
          id="job-communication"
          className="textarea"
          maxLength={CONTRACT_LIMITS.longText}
          value={props.value.communicationText}
          onChange={(event) => props.onChange('communicationText', event.target.value)}
        />
      </label>
    </>
  );
}
