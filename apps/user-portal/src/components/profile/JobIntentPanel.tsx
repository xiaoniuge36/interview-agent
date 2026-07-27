'use client';

import type { JobIntentPayload } from '@interview-agent/contracts';
import { JobIntentFields } from './JobIntentFields';
import { useJobIntentForm } from './useJobIntentForm';

type JobIntentPanelProps = {
  onCreated: (payload: JobIntentPayload) => void;
  onStart: (payload: JobIntentPayload) => void;
};

export function JobIntentPanel(props: JobIntentPanelProps) {
  const controller = useJobIntentForm(props);
  return (
    <form className="panel stack agent-form-panel job-intent-panel" onSubmit={controller.submit}>
      <div className="job-intent-heading">
        <div className="eyebrow">给 Agent 的面试任务书</div>
        <h2 className="h2">目标 JD 与训练重点</h2>
        <p className="muted-text">
          选择接近的岗位模板或粘贴真实
          JD。保存后，下一场模拟会围绕这里的能力要求与业务场景展开追问。
        </p>
      </div>
      <JobIntentFields
        value={controller.form}
        onChange={controller.update}
        onApplyRole={controller.applyRoleTemplate}
      />
      <JobSubmitBar controller={controller} />
    </form>
  );
}

function JobSubmitBar({ controller }: { controller: ReturnType<typeof useJobIntentForm> }) {
  return (
    <div className="job-submit-bar">
      <div className="job-submit-context">
        <span>下一步</span>
        <strong>让 Agent 按这份 JD 组织下一场追问</strong>
        <small>两个操作都会先保存岗位；只有主操作会在保存成功后进入模拟面试。</small>
      </div>
      <div className="job-submit-controls">
        <div className="job-submit-actions">
          <button
            className="button secondary job-save-button"
            type="submit"
            name="job-submit-action"
            value="save"
            disabled={controller.busy}
          >
            {controller.activeAction === 'save' ? '正在保存…' : '仅保存'}
          </button>
          <button
            className="button job-start-button"
            type="submit"
            name="job-submit-action"
            value="save_and_start"
            disabled={controller.busy}
          >
            {controller.activeAction === 'save_and_start'
              ? '正在准备模拟面试…'
              : '保存并开始模拟面试'}
            <span aria-hidden="true">→</span>
          </button>
        </div>
        <span id="job-status" className="job-submit-status" aria-live="polite">
          <i aria-hidden="true" />
          {controller.message}
        </span>
      </div>
    </div>
  );
}
