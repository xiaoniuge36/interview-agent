import { CONTRACT_LIMITS } from '@interview-agent/contracts';
import type { FormEvent } from 'react';
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
        候选人回答
        <textarea
          id="candidate-answer"
          className="textarea answer-box"
          required
          maxLength={CONTRACT_LIMITS.longText}
          disabled={!controller.canAnswer}
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
          {controller.state.busy ? 'Agent 处理中...' : '提交回答并继续'}
        </button>
        <span className="muted-text small-text" role="status">
          {controller.state.notice}
        </span>
      </div>
    </form>
  );
}
