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
  return (
    <form className="stack compact" onSubmit={submit}>
      <label className="label" htmlFor="candidate-answer">
        <span className="field-label-title">
          <FieldIcon name="message" />
          我的回答
        </span>
        <span className="answer-guidance">
          可按背景、目标、行动、结果组织回答，重点说清个人贡献、关键判断和可验证结果。
        </span>
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
      </label>
      <div className="row-between">
        <button
          className="button"
          type="submit"
          disabled={!controller.canAnswer || !controller.state.draft.trim()}
        >
          {controller.state.busy ? 'AI 面试官正在准备下一题…' : '提交回答并继续'}
        </button>
        <span className="muted-text small-text" role="status">
          {controller.state.notice}
        </span>
      </div>
    </form>
  );
}

