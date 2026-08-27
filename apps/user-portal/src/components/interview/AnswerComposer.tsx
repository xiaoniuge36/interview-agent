import { CONTRACT_LIMITS } from '@interview-agent/contracts';
import type { FormEvent } from 'react';
import { FieldIcon } from '@/components/FieldIcon';
import { DictationButton } from '@/components/speech/DictationButton';
import { appendTranscript } from '@/lib/speech/speech-dictation';
import type { InterviewController } from '@/hooks/useInterviewController';

type AnswerComposerProps = {
  controller: InterviewController;
};

export function AnswerComposer({ controller }: AnswerComposerProps) {
  const session = controller.state.session;
  if (session?.status === 'report_ready') {
    return (
      <CompletedComposer
        answeredCount={session.turns.filter((turn) => turn.role === 'candidate').length}
      />
    );
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void controller.submitAnswer();
  };
  return (
    <form className="interview-answer-composer stack compact" onSubmit={submit}>
      <AnswerField controller={controller} hasSession={Boolean(session)} />
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

function AnswerField({
  controller,
  hasSession,
}: {
  controller: InterviewController;
  hasSession: boolean;
}) {
  const characterCount = controller.state.draft.length.toLocaleString();
  const characterLimit = CONTRACT_LIMITS.longText.toLocaleString();
  return (
    <label className="label" htmlFor="candidate-answer">
      <span className="field-label-title">
        <FieldIcon name="message" />
        我的回答
        <DictationButton
          disabled={!controller.canAnswer}
          onTranscript={(transcript) =>
            controller.setDraft(appendTranscript(controller.state.draft, transcript))
          }
        />
      </span>
      <span className="answer-guidance">重点说清个人贡献、关键判断和可验证结果。</span>
      <textarea
        id="candidate-answer"
        className="textarea answer-box"
        required
        maxLength={CONTRACT_LIMITS.longText}
        disabled={!controller.canAnswer}
        placeholder={composerPlaceholder(hasSession, controller.state.busy)}
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
  );
}

function CompletedComposer({ answeredCount }: { answeredCount: number }) {
  return (
    <div className="interview-composer-complete" role="status">
      <div>
        <span>本轮已结束</span>
        <strong>
          {answeredCount > 0 ? `共回答 ${answeredCount} 题，复盘已生成` : '本轮复盘已生成'}
        </strong>
        <p>评分、薄弱环节和下一步建议已在复盘面板；想再来一轮，从上方「重新开始本轮」发起。</p>
      </div>
      <a className="button" href="#interview-report">
        查看本轮复盘
      </a>
    </div>
  );
}

function composerPlaceholder(hasSession: boolean, busy: boolean): string {
  if (busy) return 'AI 面试官正在准备下一题…';
  if (!hasSession) return '点击上方「开始模拟面试」，第一题会出现在这里。';
  return '写下你的回答，让 AI 面试官继续追问。';
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
