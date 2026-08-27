import { CONTRACT_LIMITS } from '@interview-agent/contracts';
import type { FormEvent } from 'react';
import { FieldIcon } from '@/components/FieldIcon';
import type { InterviewController } from '@/hooks/useInterviewController';

type AnswerComposerProps = {
  controller: InterviewController;
};

export function AnswerComposer({ controller }: AnswerComposerProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void controller.submitAnswer();
  };
  const characterCount = controller.state.draft.length.toLocaleString();
  const characterLimit = CONTRACT_LIMITS.longText.toLocaleString();
  return (
    <form className="interview-answer-composer stack compact" onSubmit={submit}>
      <label className="label" htmlFor="candidate-answer">
        <span className="field-label-title">
          <FieldIcon name="message" />
          我的回答
        </span>
        <span className="answer-guidance">重点说清个人贡献、关键判断和可验证结果。</span>
        <textarea
          id="candidate-answer"
          className="textarea answer-box"
          required
          maxLength={CONTRACT_LIMITS.longText}
          disabled={!controller.canAnswer}
          placeholder="写下你的回答，让 AI 面试官继续追问。"
          value={controller.state.draft}
          onChange={(event) => controller.setDraft(event.target.value)}
        />
        <span className="interview-answer-meta">
          <span>{answerMetaLabel(controller.draftRecovered)}</span>
          <span>
            {characterCount} / {characterLimit}
          </span>
        </span>
      </label>
      <div className="row-between">
        <button
          className="button"
          type="submit"
          disabled={!controller.canAnswer || !controller.state.draft.trim()}
        >
          {controller.state.busy ? 'AI 面试官正在准备下一题…' : '提交回答并继续'}
          <SubmitArrow busy={controller.state.busy} />
        </button>
        <span className="muted-text small-text" role="status">
          {controller.state.notice}
        </span>
      </div>
    </form>
  );
}

function SubmitArrow({ busy }: { busy: boolean }) {
  if (busy) return null;
  return (
    <span className="consumer-action-arrow" aria-hidden="true">
      →
    </span>
  );
}

function answerMetaLabel(draftRecovered: boolean): string {
  return draftRecovered ? '已恢复当前标签页草稿' : '回答结构提示：背景、行动、判断、结果';
}
